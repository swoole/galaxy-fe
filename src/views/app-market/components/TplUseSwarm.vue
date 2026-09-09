<template>
  <el-drawer
    :with-header="false"
    :visible.sync="visible"
    :close-on-press-escape="false"
    :wrapperClosable="false"
    size="760px">
    <div class="swarm-installer">
      <easy-title title="安装到 Docker Swarm" margin-set="0 20" />

      <el-form
        v-if="!jobId"
        ref="form"
        :model="form"
        :rules="rules"
        label-width="140px"
        size="small">
        <el-form-item label="应用标题" prop="title">
          <el-input v-model="form.title" class="form-control" />
        </el-form-item>
        <el-form-item label="Service 名称" prop="name">
          <el-input v-model="form.name" class="form-control" placeholder="例如 my-app" />
        </el-form-item>
        <el-form-item label="目标集群" prop="cluster_id">
          <el-select
            v-model="form.cluster_id"
            v-loading="clustersLoading"
            class="form-control"
            placeholder="请选择 Docker Swarm 集群"
            @change="loadNetworks">
            <el-option
              v-for="cluster in clusters"
              :key="cluster.id"
              :label="cluster.title"
              :value="cluster.id" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">资源配置</el-divider>
        <resource-config-editor
          v-model="appResources"
          :allow-unlimited="false"
          :min-cpu="Number(resourcePolicy.limit_cpu_min || 10) / 1000"
          :max-cpu="Number(resourcePolicy.limit_cpu_max || 64000) / 1000"
          :min-memory="Number(resourcePolicy.limit_memory_min || 16)"
          :max-memory="Number(resourcePolicy.limit_memory_max || 1048576)" />

        <el-divider content-position="left">容器网络</el-divider>
        <el-form-item label="网络模式" prop="network.mode">
          <el-radio-group v-model="form.network.mode" @change="networkModeChanged">
            <el-radio-button v-for="mode in networkModes" :key="mode" :label="mode">{{ networkModeLabel(mode) }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.network.mode === 'overlay'" label="Overlay 网络" prop="network.targets" :rules="[{ required: true, type: 'array', min: 1, message: '请至少选择一个 Overlay 网络', trigger: 'change' }]">
          <el-select v-model="form.network.targets" v-loading="networksLoading" class="form-control" multiple placeholder="请选择应用需要加入的 Overlay 网络（可多选）">
            <el-option v-for="network in networks" :key="network.id" :label="network.name" :value="network.id" />
          </el-select>
          <el-button :loading="creatingNetwork" size="mini" type="text" icon="el-icon-plus" @click="createNetwork">创建网络</el-button>
        </el-form-item>
        <el-form-item v-if="form.network.mode === 'overlay'" label="外部容器">
          <el-select
            v-model="form.network.external_containers"
            v-loading="containersLoading"
            class="form-control"
            multiple
            filterable
            placeholder="选择需要桥接到 Overlay 网络的宿主机容器（可选）">
            <el-option-group label="独立容器">
              <el-option v-for="c in standaloneContainers" :key="c.id" :label="`${c.name} (${c.image})`" :value="c.name">
                <span>{{ c.name }}</span>
                <span class="select-extra">
                  <image-reference
                    :value="c.image"
                    :org-id="orgId"
                    :cluster-id="clusterId"
                    :node-id="c.node_id || ''"
                    compact /> · {{ c.status }}
                </span>
              </el-option>
            </el-option-group>
            <el-option-group v-if="swarmContainers.length" label="Swarm 服务容器">
              <el-option v-for="c in swarmContainers" :key="c.id" :label="`${c.name} (${c.image})`" :value="c.name">
                <span>{{ c.name }}</span>
                <span class="select-extra">
                  <image-reference
                    :value="c.image"
                    :org-id="orgId"
                    :cluster-id="clusterId"
                    :node-id="c.node_id || ''"
                    compact /> · {{ c.status }}
                </span>
              </el-option>
            </el-option-group>
          </el-select>
          <div class="form-tip">将指定的宿主机容器桥接到所选 Overlay 网络（如 compose 运行的 MySQL），需对应网络为 attachable 模式</div>
        </el-form-item>

        <template v-if="form.network.mode !== 'host'">
          <el-divider content-position="left">端口映射</el-divider>
          <div v-for="(port, index) in form.ports" :key="`port-${index}`" class="array-row">
            <el-input-number v-model="port.published" :min="0" :max="65535" placeholder="主机端口 (0=自动)" />
            <span>→</span>
            <el-input-number v-model="port.target" :min="1" :max="65535" placeholder="容器端口" />
            <el-select v-model="port.protocol" class="short-control"><el-option label="TCP" value="tcp" /><el-option label="UDP" value="udp" /><el-option label="SCTP" value="sctp" /></el-select>
            <el-select v-model="port.mode" class="short-control"><el-option label="Ingress" value="ingress" /><el-option label="Host" value="host" /></el-select>
            <el-button type="text" class="danger" @click="removePort(index)">删除</el-button>
          </div>
          <el-button v-if="portsPolicy.customizable !== false" size="mini" icon="el-icon-plus" @click="addPort">添加端口映射</el-button>
        </template>

        <el-divider content-position="left">目录与持久化存储</el-divider>
        <el-alert
          title="Bind Mount 会把 Swarm 节点的宿主机路径直接交给容器，可能影响节点安全和服务调度。平台允许用户自行决定，但请只挂载确有需要的路径并使用可信镜像。"
          type="warning"
          :closable="false"
          show-icon />
        <el-alert
          v-if="dangerousBindMounts.length"
          class="mount-risk-alert"
          :title="`检测到高风险宿主机路径：${dangerousBindMounts.join('、')}`"
          description="Docker/containerd Socket 及系统目录可能使容器获得宿主机或整个 Docker Swarm 集群的控制权限。Portainer 等管理工具可以使用，但安装前必须确认镜像和配置可信。"
          type="error"
          :closable="false"
          show-icon />
        <div v-for="(mount, index) in form.mounts" :key="`mount-${index}`" class="array-row mount-row">
          <el-select v-model="mount.type" class="short-control"><el-option label="Volume" value="volume" /><el-option label="Bind" value="bind" /><el-option label="Tmpfs" value="tmpfs" /></el-select>
          <el-input v-if="mount.type !== 'tmpfs'" v-model="mount.source" placeholder="Volume 名称或宿主机绝对路径" />
          <el-input v-model="mount.target" placeholder="容器目录，如 /data" />
          <el-checkbox v-model="mount.read_only">只读</el-checkbox>
          <el-button type="text" class="danger" @click="removeMount(index)">删除</el-button>
        </div>
        <el-button v-if="mountsPolicy.customizable !== false" size="mini" icon="el-icon-plus" @click="addMount">添加目录映射</el-button>

        <el-divider content-position="left">应用配置</el-divider>

        <el-form-item
          v-for="field in fields"
          :key="field.key"
          :label="field.label"
          :prop="`values.${field.key}`"
          :rules="field.required ? [{ required: true, message: `请填写${field.label}`, trigger: 'blur' }] : []">
          <el-input-number
            v-if="field.type == 'number'"
            v-model="form.values[field.key]"
            :min="field.min || 1"
            :max="field.max || 65535"
            controls-position="right"
            class="form-control" />
          <el-input
            v-else-if="field.type == 'textarea'"
            v-model="form.values[field.key]"
            type="textarea"
            :rows="10"
            class="form-control"
            :placeholder="field.placeholder || ''" />
          <el-input
            v-else
            v-model="form.values[field.key]"
            :show-password="field.type == 'secret'"
            :type="field.type == 'secret' ? 'password' : 'text'"
            class="form-control"
            :placeholder="field.placeholder || ''" />
        </el-form-item>

        <el-alert
          title="敏感字段将作为 Docker Secret 保存，不会记录在普通安装表单中。"
          type="info"
          :closable="false"
          show-icon />

        <div class="operators">
          <el-button type="primary" :loading="submitting" @click="submit">开始安装</el-button>
          <el-button @click="close">取消</el-button>
        </div>
      </el-form>

      <step-install-progress
        v-else
        :mainForm="form"
        :orgId="orgId"
        :profile="profile"
        :jobId="jobId"
        @cancel="close"
        @back="backToForm"
        @reset="reset" />
    </div>
  </el-drawer>
</template>

<script>
import EasyTitle from '@/views/components/EasyTitle'
import StepInstallProgress from './StepInstallProgress'
import ResourceConfigEditor from '@/views/components/ResourceConfigEditor'
import {
  appMarketSwarmClusters,
  appMarketSwarmNetworks,
  appMarketSwarmNetworkCreate,
  appMarketSwarmContainers,
  appMarketTplUse
} from '@/api/app'

export default {
  name: 'AppMarketTplUseSwarm',
  components: {
    EasyTitle,
    StepInstallProgress,
    ResourceConfigEditor
  },
  props: {
    orgId: {
      type: [Number, String],
      required: true
    },
    profile: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      visible: false,
      submitting: false,
      clustersLoading: false,
      networksLoading: false,
      creatingNetwork: false,
      containersLoading: false,
      clusters: [],
      networks: [],
      containers: [],
      jobId: null,
      form: {
        title: '',
        name: '',
        cluster_id: null,
        resources: {},
        network: {},
        ports: [],
        mounts: [],
        values: {}
      },
      rules: {
        title: [{ required: true, message: '请填写应用标题', trigger: 'blur' }],
        name: [
          { required: true, message: '请填写 Service 名称', trigger: 'blur' },
          { pattern: /^[a-z][a-z0-9-]{0,40}$/, message: '只能使用小写字母、数字和连字符，并以字母开头' }
        ],
        cluster_id: [{ required: true, message: '请选择目标集群', trigger: 'change' }]
      }
    }
  },
  computed: {
    appResources: {
      get () {
        return {
          cpu_limit: Number(this.form.resources.limit_cpu || 0) / 1000,
          memory_limit: Number(this.form.resources.limit_memory || 0),
          cpu_reservation: Number(this.form.resources.reserve_cpu || 0) / 1000,
          memory_reservation: Number(this.form.resources.reserve_memory || 0)
        }
      },
      set (resources) {
        this.$set(this.form, 'resources', {
          limit_cpu: Math.round(Number(resources.cpu_limit || 0) * 1000),
          limit_memory: Math.round(Number(resources.memory_limit || 0)),
          reserve_cpu: Math.round(Number(resources.cpu_reservation || 0) * 1000),
          reserve_memory: Math.round(Number(resources.memory_reservation || 0))
        })
      }
    },
    installPolicy () {
      return this.profile.install_policy || {}
    },
    resourcePolicy () {
      return this.installPolicy.resources || {}
    },
    networkPolicy () {
      return this.installPolicy.network || {}
    },
    portsPolicy () {
      return this.installPolicy.ports || {}
    },
    mountsPolicy () {
      return this.installPolicy.mounts || {}
    },
    networkModes () {
      return this.networkPolicy.allowed_modes || ['overlay']
    },
    standaloneContainers () {
      return this.containers.filter(c => !c.swarm_service)
    },
    swarmContainers () {
      return this.containers.filter(c => c.swarm_service)
    },
    fields () {
      const fields = this.profile.client_config && this.profile.client_config.form
        ? this.profile.client_config.form
        : {}
      return Object.keys(fields).map(key => Object.assign({ key }, fields[key]))
    },
    bindMounts () {
      return this.form.mounts
        .filter(mount => mount.type === 'bind')
        .map(mount => mount.source)
        .filter(Boolean)
    },
    dangerousBindMounts () {
      return this.bindMounts.filter(this.isDangerousBind)
    }
  },
  methods: {
    open () {
      this.reset()
      this.visible = true
      this.loadClusters()
    },
    reset () {
      const values = {}
      const appConfig = this.profile.client_config && this.profile.client_config.app
        ? this.profile.client_config.app
        : {}
      this.fields.forEach(field => {
        values[field.key] = typeof field.default !== 'undefined' ? field.default : null
      })
      this.form = {
        title: appConfig.title || this.profile.title,
        name: appConfig.name || 'app',
        cluster_id: null,
        resources: {
          limit_cpu: this.resourcePolicy.limit_cpu_default || 250,
          limit_memory: this.resourcePolicy.limit_memory_default || 128,
          reserve_cpu: this.resourcePolicy.reserve_cpu_default || 0,
          reserve_memory: this.resourcePolicy.reserve_memory_default || 0
        },
        network: {
          mode: this.networkPolicy.default_mode || 'overlay',
          targets: [],
          external_containers: []
        },
        ports: JSON.parse(JSON.stringify(this.portsPolicy.defaults || [])),
        mounts: JSON.parse(JSON.stringify(this.mountsPolicy.defaults || [])),
        values
      }
      this.networks = []
      this.jobId = null
    },
    close () {
      this.visible = false
    },
    loadClusters () {
      this.clustersLoading = true
      appMarketSwarmClusters(this.orgId).then(res => {
        this.clusters = res.data.clusters
        if (this.clusters.length === 1) {
          this.form.cluster_id = this.clusters[0].id
          this.loadNetworks(this.form.cluster_id)
        }
      }).finally(() => {
        this.clustersLoading = false
      })
    },
    loadNetworks (clusterId) {
      if (this.form.network.mode !== 'overlay' || !clusterId) return
      this.form.network.targets = []
      this.networksLoading = true
      appMarketSwarmNetworks(this.orgId, clusterId).then(res => {
        this.networks = res.data.networks
        if (this.networks.length === 1) {
          this.form.network.targets = [this.networks[0].id]
        }
      }).finally(() => {
        this.networksLoading = false
      })
      this.loadContainers(clusterId)
    },
    loadContainers (clusterId) {
      if (!clusterId) return
      this.containersLoading = true
      appMarketSwarmContainers(this.orgId, clusterId).then(res => {
        this.containers = res.data.containers || []
      }).finally(() => {
        this.containersLoading = false
      })
    },
    createNetwork () {
      this.$prompt('请输入新的 Overlay 网络名称', '创建网络', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/,
        inputErrorMessage: '字母/数字开头，可包含 _ . -，最长 63 字符'
      }).then(({ value }) => {
        this.creatingNetwork = true
        return appMarketSwarmNetworkCreate(this.orgId, this.form.cluster_id, value.trim())
      }).then(res => {
        const net = res.data.network
        this.loadNetworks(this.form.cluster_id)
        this.$nextTick(() => {
          this.form.network.targets.push(net.id)
        })
        this.$message.success('网络 ' + net.name + ' 创建成功')
      }).catch(err => {
        if (err !== 'cancel' && err !== 'close') {
          this.$message.error(err.response?.data?.message || err.message || '创建失败')
        }
      }).finally(() => {
        this.creatingNetwork = false
      })
    },
    networkModeChanged () {
      this.form.network.targets = []
      this.form.network.external_containers = []
      if (this.form.network.mode === 'overlay') this.loadNetworks(this.form.cluster_id)
    },
    networkModeLabel (mode) {
      return { overlay: 'Overlay', host: 'Host', none: 'None' }[mode] || mode
    },
    addPort () {
      this.form.ports.push({ published: 8080, target: 80, protocol: 'tcp', mode: 'ingress' })
    },
    removePort (index) {
      this.form.ports.splice(index, 1)
    },
    addMount () {
      this.form.mounts.push({ type: 'volume', source: '', target: '/data', read_only: false })
    },
    removeMount (index) {
      this.form.mounts.splice(index, 1)
    },
    submit () {
      this.$refs.form.validate(valid => {
        if (!valid) return
        if (this.bindMounts.length) {
          const dangerous = this.dangerousBindMounts.length > 0
          const paths = (dangerous ? this.dangerousBindMounts : this.bindMounts).join('、')
          this.$confirm(
            dangerous
              ? `即将挂载高风险宿主机路径：${paths}。容器可能获得宿主机或 Docker Swarm 集群控制权限。请确认应用镜像与配置完全可信。`
              : `即将使用宿主机 Bind Mount：${paths}。该服务只能在具有对应路径的节点上正常运行，并可能读写宿主机数据。`,
            dangerous ? '确认高风险 Bind Mount' : '确认 Bind Mount',
            {
              type: dangerous ? 'error' : 'warning',
              confirmButtonText: '我已了解风险，继续安装',
              cancelButtonText: '取消'
            }
          ).then(() => this.createInstallation(true)).catch(() => {})
          return
        }
        this.createInstallation(false)
      })
    },
    createInstallation (bindRiskAcknowledged) {
      this.submitting = true
      const form = Object.assign({}, this.form, { bind_risk_acknowledged: bindRiskAcknowledged })
      appMarketTplUse(this.orgId, this.profile.id, form).then(res => {
        this.jobId = res.data.job_id
      }).catch(err => {
        this.$message.error(err.response?.data?.message || err.message || '提交安装失败')
      }).finally(() => {
        this.submitting = false
      })
    },
    isDangerousBind (source) {
      const path = `/${String(source || '').replace(/^\/+/, '').replace(/\/{2,}/g, '/')}`.replace(/\/$/, '') || '/'
      const protectedPaths = ['/', '/boot', '/dev', '/etc', '/proc', '/root', '/run', '/sys', '/var/run', '/var/lib/docker', '/var/lib/containerd']
      return protectedPaths.some(item => path === item || path.startsWith(`${item}/`) || (path !== '/' && item.startsWith(`${path}/`)))
    },
    backToForm () {
      this.jobId = null
    }
  }
}
</script>

<style lang="scss" scoped>
.swarm-installer {
  padding: 30px;
}
.form-control {
  width: 420px;
}
.operators {
  margin-top: 24px;
  padding-left: 140px;
}
.array-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px 30px;
}
::v-deep .el-select-dropdown__item {
  max-width: 680px;
  .el-select-group__title {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  span {
    display: inline-block;
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
  }
  .select-extra {
    max-width: 350px;
    margin-left: 8px;
    color: #909399;
    font-size: 12px;
  }
}
.array-row .el-input {
  width: 210px;
}
.short-control {
  width: 105px;
}
.mount-row .el-input {
  width: 220px;
}
.mount-risk-alert {
  margin-top: 10px;
}
.danger {
  color: #f56c6c;
}
</style>
