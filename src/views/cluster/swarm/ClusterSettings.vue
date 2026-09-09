<template>
  <div class="project-container cluster-settings" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />

    <div class="settings-content">
      <el-tabs v-model="activeTab" class="settings-tabs">
        <el-tab-pane label="基本信息" name="basic">
          <el-card shadow="never" class="basic-card">
            <div slot="header" class="card-header">集群基本信息</div>
            <el-form
              ref="basic-form"
              :model="basicForm"
              :rules="basicRules"
              label-width="110px"
              @submit.native.prevent="saveBasic">
              <el-form-item label="集群名称" prop="title">
                <el-input
                  v-model.trim="basicForm.title"
                  class="form-control"
                  maxlength="20"
                  show-word-limit />
              </el-form-item>
              <el-form-item label="备注" prop="remark">
                <el-input
                  v-model="basicForm.remark"
                  class="form-control"
                  type="textarea"
                  :rows="4"
                  maxlength="2000"
                  show-word-limit />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="basicSaving" @click="saveBasic">保存基本信息</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="Traefik Web 网关" name="traefik">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="Traefik 是项目对外访问的统一七层入口"
            description="平台会创建 Traefik、Docker Socket Proxy 和共享 Overlay 网络，统一承载域名、路径、TLS 与流量治理。" />

          <el-row :gutter="16" class="status-row">
            <el-col :xs="24" :sm="6">
              <div class="status-card">
                <div class="status-label">Web 网关</div>
                <div class="status-value"><el-tag :type="statusType" effect="dark">{{ statusText }}</el-tag></div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="6">
              <div class="status-card">
                <div class="status-label">运行副本</div>
                <div class="status-number">{{ runtime.running }} / {{ runtime.desired }}</div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="6">
              <div class="status-card">
                <div class="status-label">失败任务</div>
                <div class="status-number" :class="{ danger: runtime.failed > 0 }">{{ runtime.failed }}</div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="6">
              <div class="status-card">
                <div class="status-label">Docker API 隔离</div>
                <div class="status-value"><el-tag type="success" effect="dark">Socket Proxy</el-tag></div>
              </div>
            </el-col>
          </el-row>

          <el-alert
            v-if="gateway && gateway.error"
            class="settings-gap"
            type="error"
            :closable="false"
            show-icon
            :title="gateway.error" />
          <el-alert
            v-if="tlsGc && tlsGc.errors && tlsGc.errors.length"
            class="settings-gap"
            type="warning"
            :closable="false"
            show-icon
            title="旧版 TLS 资源尚未全部回收"
            :description="`${tlsGc.errors.length} 个 Docker Secret/Config 删除失败，平台会在下次证书或网关同步时重试。${tlsGc.errors[0].error || ''}`" />
          <el-alert
            v-else-if="tlsGc && (tlsGc.deleted_secrets || tlsGc.deleted_configs)"
            class="settings-gap"
            type="success"
            :closable="false"
            show-icon
            :title="`已安全回收 ${tlsGc.deleted_secrets || 0} 个旧 Secret、${tlsGc.deleted_configs || 0} 个旧 Config`" />

          <el-card shadow="never" class="config-card">
            <div slot="header" class="card-header">
              <span>Traefik Web 网关</span>
              <div class="header-actions"><el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新状态</el-button></div>
            </div>
            <el-form ref="gateway-form" :model="form" :rules="rules" label-width="160px" @submit.native.prevent="deploy">
              <el-form-item label="网关实现"><el-input value="Traefik Proxy" disabled class="form-control" /></el-form-item>
              <el-form-item label="Docker 镜像" prop="image"><el-input v-model.trim="form.image" class="form-control" placeholder="traefik:v3.7" /><div class="form-help">建议固定具体版本，更新镜像后会滚动更新 Service。</div></el-form-item>
              <el-form-item label="Socket Proxy 镜像" prop="socket_proxy_image"><el-input v-model.trim="form.socket_proxy_image" class="form-control" placeholder="tecnativa/docker-socket-proxy:latest" /><div class="form-help">Traefik 不直接接触 docker.sock；代理只开放服务发现所需的只读 Docker API。</div></el-form-item>
              <el-form-item label="共享 Overlay 网络" prop="network_name"><el-input v-model.trim="form.network_name" class="form-control" :disabled="installed" /><div class="form-help">网关与需要域名访问的项目必须加入该网络；安装后不允许直接改名。</div></el-form-item>
              <el-form-item label="网关控制网络" prop="control_network_name"><el-input v-model.trim="form.control_network_name" class="form-control" :disabled="installed" /><div class="form-help">仅连接 Traefik 与 Socket Proxy，用于隔离 Docker API 服务发现通道。</div></el-form-item>
              <el-form-item label="发布模式" prop="publish_mode"><el-radio-group v-model="form.publish_mode"><el-radio label="ingress">Ingress Routing Mesh</el-radio><el-radio label="host">Host 端口</el-radio></el-radio-group><div class="form-help">Ingress 可通过任意 Swarm 节点访问；Host 只在实际运行 Traefik 的 Manager 节点监听。</div></el-form-item>
              <el-form-item label="HTTP / HTTPS 端口"><el-input-number v-model="form.http_port" :min="1" :max="65535" controls-position="right" /><span class="port-separator">/</span><el-input-number v-model="form.https_port" :min="1" :max="65535" controls-position="right" /></el-form-item>
              <el-form-item label="副本数" prop="replicas"><el-input-number v-model="form.replicas" :min="1" :max="10" controls-position="right" :disabled="form.acme_enabled" /><div v-if="form.acme_enabled" class="form-help">本地 ACME Volume 不支持多副本并发写入，自动证书模式固定为 1 个副本。</div></el-form-item>
              <el-form-item label="HTTP 自动跳转 HTTPS"><el-switch v-model="form.redirect_https" /></el-form-item>
              <el-form-item label="访问日志"><el-switch v-model="form.access_log_enabled" /></el-form-item>
              <el-form-item label="Prometheus 指标"><el-switch v-model="form.metrics_enabled" /></el-form-item>
              <el-divider content-position="left">Traefik Dashboard</el-divider>
              <el-form-item label="Dashboard"><el-switch v-model="form.dashboard_enabled" /></el-form-item>
              <template v-if="form.dashboard_enabled">
                <el-form-item label="Dashboard 端口" prop="dashboard_port">
                  <el-input-number v-model="form.dashboard_port" :min="1" :max="65535" controls-position="right" />
                  <div class="form-help">容器内固定监听 8080，此处设置 Swarm 对外发布端口。</div>
                </el-form-item>
                <el-alert
                  class="dashboard-warning"
                  type="warning"
                  :closable="false"
                  show-icon
                  title="Dashboard 不提供登录认证"
                  description="仅建议在可信内网开启，并使用安全组或防火墙限制该端口的来源地址。" />
                <el-form-item v-if="dashboard.url" label="访问地址">
                  <el-link :href="dashboard.url" type="primary" target="_blank">{{ dashboard.url }}</el-link>
                </el-form-item>
              </template>
              <el-divider content-position="left">自动 SSL 证书</el-divider>
              <el-form-item label="Let's Encrypt"><el-switch v-model="form.acme_enabled" @change="acmeChanged" /></el-form-item>
              <el-form-item v-if="form.acme_enabled" label="通知邮箱" prop="acme_email"><el-input v-model.trim="form.acme_email" class="form-control" placeholder="admin@example.com" /><div class="form-help">证书数据持久化到 galaxy-web-gateway-acme Volume，Traefik 会自动申请并续期。</div></el-form-item>
              <el-form-item class="form-actions"><el-button type="primary" :loading="saving" @click="deploy">{{ installed ? '保存并部署' : '安装 Web 网关' }}</el-button><el-button v-if="installed" type="danger" plain :loading="removing" @click="remove">卸载 Web 网关</el-button></el-form-item>
            </el-form>
          </el-card>

          <el-card v-if="runtime.tasks && runtime.tasks.length" shadow="never" class="tasks-card">
            <div slot="header" class="card-header">最近任务</div>
            <el-table :data="runtime.tasks" border size="small">
              <el-table-column label="Task ID" min-width="150"><template #default="{ row }"><code>{{ shortId(row.id) }}</code></template></el-table-column>
              <el-table-column label="Node ID" min-width="150"><template #default="{ row }"><code>{{ shortId(row.node_id) }}</code></template></el-table-column>
              <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag size="mini" :type="taskType(row.state)">{{ row.state }}</el-tag></template></el-table-column>
              <el-table-column prop="message" label="信息" min-width="220" show-overflow-tooltip />
              <el-table-column prop="error" label="错误" min-width="220" show-overflow-tooltip />
            </el-table>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="HTTP 指标存储（Prometheus）" name="prometheus">
          <el-alert
            v-if="!installed || !form.metrics_enabled"
            type="warning"
            :closable="false"
            show-icon
            title="安装 Prometheus 前，请先安装 Traefik Web 网关并启用 Prometheus 指标。" />

          <el-card shadow="never" class="config-card">
            <div slot="header" class="card-header">
              <span>HTTP 指标存储（Prometheus）</span>
              <div class="header-actions"><el-tag :type="prometheusInstalled && prometheusRuntime.running ? 'success' : 'info'">{{ prometheusInstalled ? `${prometheusRuntime.running || 0} / 1 运行` : '未安装' }}</el-tag></div>
            </div>
            <el-alert type="info" :closable="false" show-icon title="Prometheus 仅加入加密控制网络，不发布 9090 端口；API 通过 Docker Exec 查询指标。" />
            <el-alert
              v-if="prometheus && prometheus.error"
              type="warning"
              :closable="false"
              show-icon
              :title="prometheus.error"
              class="prometheus-error" />
            <el-form :model="prometheusForm" label-width="160px" class="prometheus-form">
              <el-form-item label="Docker 镜像"><el-input v-model.trim="prometheusForm.image" class="form-control" /></el-form-item>
              <el-form-item label="抓取间隔"><el-input-number v-model="prometheusForm.scrape_interval" :min="5" :max="300" /><span class="form-help inline-help">秒</span></el-form-item>
              <el-form-item label="数据保留"><el-input-number v-model="prometheusForm.retention_days" :min="1" :max="365" /><span class="form-help inline-help">天</span></el-form-item>
              <el-form-item><el-button type="primary" :disabled="!installed || !form.metrics_enabled" :loading="prometheusSaving" @click="deployPrometheus">{{ prometheusInstalled ? '保存并部署' : '安装 Prometheus' }}</el-button></el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="加入集群" name="join">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="在新节点上执行对应命令即可加入 Swarm 集群"
            description="Manager 命令用于添加管理节点，Worker 命令用于添加工作节点。端口 2377 为 Swarm 控制面默认端口。" />
          <el-card shadow="never" class="join-command-card" v-loading="joinCommandsLoading">
            <div slot="header" class="card-header">节点加入命令</div>
            <div class="join-address-row">
              <div>
                <div class="command-title">Manager Join 地址</div>
                <div class="form-help">请选择新节点能够访问的 Manager 局域网地址，也可以直接输入 IP 或主机名。</div>
              </div>
              <el-select
                v-model="joinAddress"
                class="join-address-select"
                filterable
                allow-create
                default-first-option
                placeholder="例如 192.168.1.14"
                @change="changeJoinAddress">
                <el-option
                  v-for="address in joinAddressOptions"
                  :key="address"
                  :label="address"
                  :value="address" />
              </el-select>
            </div>
            <div class="command-title">Manager 加入命令</div>
            <div class="command-row">
              <code class="join-command">{{ joinCommands.manager || '加载中...' }}</code>
              <el-button size="mini" :disabled="!joinCommands.manager" @click="copyText(joinCommands.manager)">复制</el-button>
            </div>
            <div class="command-title">Worker 加入命令</div>
            <div class="command-row">
              <code class="join-command">{{ joinCommands.worker || '加载中...' }}</code>
              <el-button size="mini" :disabled="!joinCommands.worker" @click="copyText(joinCommands.worker)">复制</el-button>
            </div>
            <el-alert
              class="join-troubleshooting"
              type="warning"
              :closable="false"
              title="新节点加入超时时，请先确认所选地址可从新节点访问"
              description="可在新节点执行 nc -vz &lt;Manager 地址&gt; 2377；同时检查节点间 TCP 2377、TCP/UDP 7946 和 UDP 4789 的防火墙策略。" />
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import { routeBreadcrumb } from '@/utils/helpers'
import {
  clusterSwarmWebGateway, clusterSwarmWebGatewayDeploy, clusterSwarmWebGatewayRemove,
  clusterSwarmPrometheus, clusterSwarmPrometheusDeploy, clusterSwarmJoinCommands,
  clusterSwarmSettings, clusterSwarmSettingsUpdate
} from '@/api/cluster'

export default {
  name: 'ClusterSwarmSettings',
  components: { Breadcrumb },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  },
  data () {
    return {
      loading: false,
      activeTab: 'basic',
      basicSaving: false,
      basicForm: { title: '', remark: '' },
      basicRules: {
        title: [
          { required: true, message: '请输入集群名称', trigger: 'blur' },
          { max: 20, message: '集群名称不能超过20个字符', trigger: 'blur' }
        ]
      },
      installed: false,
      gateway: null,
      runtime: { desired: 0, running: 0, failed: 0, tasks: [] },
      dashboard: { enabled: false, port: 8080, url: '' },
      saving: false,
      removing: false,
      prometheusInstalled: false,
      prometheus: null,
      prometheusRuntime: { desired: 0, running: 0, failed: 0, tasks: [] },
      prometheusSaving: false,
      joinCommandsLoading: false,
      joinCommands: { manager: '', worker: '' },
      joinAddress: '',
      joinAddressOptions: [],
      prometheusForm: {
        image: 'prom/prometheus:v3.2.1',
        scrape_interval: 15,
        retention_days: 15
      },
      form: {
        image: 'traefik:v3.7',
        socket_proxy_image: 'tecnativa/docker-socket-proxy:latest',
        network_name: 'galaxy-web',
        control_network_name: 'galaxy-web-control',
        http_port: 80,
        https_port: 443,
        publish_mode: 'ingress',
        replicas: 1,
        redirect_https: false,
        access_log_enabled: true,
        metrics_enabled: true,
        dashboard_enabled: false,
        dashboard_port: 8080,
        acme_enabled: false,
        acme_email: ''
      },
      rules: {
        image: [{ required: true, message: '请输入 Traefik 镜像', trigger: 'blur' }],
        socket_proxy_image: [{ required: true, message: '请输入 Socket Proxy 镜像', trigger: 'blur' }],
        network_name: [
          { required: true, message: '请输入 Overlay 网络名称', trigger: 'blur' },
          { pattern: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/, message: '网络名称格式不合法', trigger: 'blur' }
        ],
        control_network_name: [
          { required: true, message: '请输入控制网络名称', trigger: 'blur' },
          { pattern: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/, message: '网络名称格式不合法', trigger: 'blur' }
        ],
        acme_email: [{ type: 'email', required: true, message: '请输入有效邮箱', trigger: 'blur' }]
      }
    }
  },
  computed: {
    breadcrumb () {
      return [...routeBreadcrumb(this), { title: this.$route.meta.title, to: '' }]
    },
    statusText () {
      if (!this.installed) return '未安装'
      const map = { pending: '部署中', running: '运行中', degraded: '异常', missing: 'Service 不存在', error: '连接或运行错误' }
      return map[this.gateway?.status] || this.gateway?.status || '未知'
    },
    statusType () {
      if (!this.installed) return 'info'
      return this.gateway?.status === 'running' ? 'success' : (['degraded', 'missing', 'error'].includes(this.gateway?.status) ? 'danger' : 'warning')
    },
    tlsGc () {
      return this.gateway?.configuration?.tls_gc || null
    }
  },
  created () {
    this.loadBasic()
    this.load()
    this.loadPrometheus()
    this.loadJoinCommands()
  },
  methods: {
    loadBasic () {
      return clusterSwarmSettings(this.orgId, this.clusterId).then(res => {
        const settings = res.data.settings || {}
        this.basicForm.title = settings.title || ''
        this.basicForm.remark = settings.remark || ''
      })
    },
    saveBasic () {
      this.$refs['basic-form'].validate(valid => {
        if (!valid) return
        this.basicSaving = true
        clusterSwarmSettingsUpdate(this.orgId, this.clusterId, this.basicForm).then(res => {
          const settings = res.data.settings || this.basicForm
          this.basicForm.title = settings.title
          this.basicForm.remark = settings.remark || ''
          this.$message.success('集群基本信息已保存')
        }).finally(() => { this.basicSaving = false })
      })
    },
    load () {
      this.loading = true
      return clusterSwarmWebGateway(this.orgId, this.clusterId).then(res => {
        this.installed = Boolean(res.data.installed)
        this.gateway = res.data.gateway
        this.runtime = res.data.runtime || this.runtime
        this.dashboard = res.data.dashboard || this.dashboard
        const source = this.gateway || res.data.defaults || {}
        Object.keys(this.form).forEach(key => {
          if (source[key] !== undefined && source[key] !== null) this.form[key] = source[key]
        })
      }).finally(() => { this.loading = false })
    },
    loadPrometheus () {
      return clusterSwarmPrometheus(this.orgId, this.clusterId).then(res => {
        this.prometheusInstalled = Boolean(res.data.installed)
        this.prometheus = res.data.prometheus
        this.prometheusRuntime = res.data.runtime || this.prometheusRuntime
        const source = this.prometheus || res.data.defaults || {}
        Object.keys(this.prometheusForm).forEach(key => {
          if (source[key] !== undefined && source[key] !== null) this.prometheusForm[key] = source[key]
        })
      })
    },
    loadJoinCommands (joinAddress = '') {
      this.joinCommandsLoading = true
      return clusterSwarmJoinCommands(this.orgId, this.clusterId, joinAddress).then(res => {
        this.joinCommands = res.data.commands || this.joinCommands
        this.joinAddress = this.joinCommands.address || joinAddress
        this.joinAddressOptions = this.joinCommands.addresses || []
      }).finally(() => { this.joinCommandsLoading = false })
    },
    changeJoinAddress (address) {
      if (!String(address || '').trim()) return
      this.loadJoinCommands(String(address).trim())
    },
    deployPrometheus () {
      this.prometheusSaving = true
      clusterSwarmPrometheusDeploy(this.orgId, this.clusterId, this.prometheusForm).then(res => {
        this.prometheusInstalled = Boolean(res.data.installed)
        this.prometheus = res.data.prometheus
        this.prometheusRuntime = res.data.runtime || this.prometheusRuntime
        this.$message.success('Prometheus 配置已提交到 Docker Swarm')
      }).finally(() => { this.prometheusSaving = false })
    },
    acmeChanged (enabled) {
      if (enabled) this.form.replicas = 1
    },
    deploy () {
      this.$refs['gateway-form'].validate(valid => {
        if (!valid) return
        if (this.form.http_port === this.form.https_port) {
          this.$message.error('HTTP 和 HTTPS 端口不能相同')
          return
        }
        if (this.form.dashboard_enabled && [this.form.http_port, this.form.https_port].includes(this.form.dashboard_port)) {
          this.$message.error('Dashboard 端口不能与 HTTP/HTTPS 端口相同')
          return
        }
        this.saving = true
        const wasInstalled = this.installed
        clusterSwarmWebGatewayDeploy(this.orgId, this.clusterId, this.form).then(res => {
          this.installed = Boolean(res.data.installed)
          this.gateway = res.data.gateway
          this.runtime = res.data.runtime || this.runtime
          this.dashboard = res.data.dashboard || this.dashboard
          this.$message.success(wasInstalled ? 'Web 网关配置已提交到 Docker Swarm' : 'Web 网关已安装')
        }).finally(() => { this.saving = false })
      })
    },
    remove () {
      this.$confirm('将删除 Traefik 与 Socket Proxy Service，并保留共享 Overlay 网络和 ACME Volume。存在启用中的项目域名路由时，后端会拒绝卸载。', '卸载 Web 网关', {
        type: 'warning', confirmButtonText: '确认卸载', cancelButtonText: '取消'
      }).then(() => {
        this.removing = true
        return clusterSwarmWebGatewayRemove(this.orgId, this.clusterId)
      }).then(() => {
        this.$message.success('Traefik Service 已卸载')
        this.load()
      }).finally(() => { this.removing = false }).catch(() => {})
    },
    shortId (value) {
      return value ? String(value).slice(0, 12) : '-'
    },
    taskType (state) {
      return state === 'running' ? 'success' : (['failed', 'rejected', 'orphaned'].includes(state) ? 'danger' : 'info')
    },
    copyText (value) {
      navigator.clipboard.writeText(value).then(() => this.$message.success('已复制'))
    }
  }
}
</script>

<style lang="scss" scoped>
.settings-content { margin: 20px; padding: 20px; max-width: 1180px; background: #fff; border-radius: 6px; }
.basic-card { max-width: 760px; }
.status-row { margin-top: 18px; }
.status-card { min-height: 92px; padding: 18px 20px; border: 1px solid #ebeef5; border-radius: 6px; background: #fff; }
.status-label { color: #909399; font-size: 13px; }
.status-value, .status-number { margin-top: 12px; font-size: 24px; font-weight: 600; color: #303133; }
.status-number.danger { color: #f56c6c; }
.settings-gap, .config-card, .tasks-card { margin-top: 18px; }
.card-header { display: flex; align-items: center; font-weight: 600; }
.header-actions { margin-left: auto; }
.form-control { width: 520px; max-width: 100%; }
.form-help { margin-top: 5px; color: #909399; font-size: 12px; line-height: 1.6; }
.inline-help { display: inline; margin-left: 8px; }
.port-separator { margin: 0 10px; color: #909399; }
.form-actions { margin-top: 28px; }
.prometheus-error { margin-top: 12px; }
.dashboard-warning { max-width: 680px; margin: -4px 0 18px 160px; }
.prometheus-form { margin-top: 18px; }
.join-command-card { margin-top: 18px; }
.join-address-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
.join-address-row .command-title { margin-top: 0; }
.join-address-select { width: 320px; max-width: 100%; flex: 0 0 auto; }
.command-title { margin: 14px 0 7px; font-weight: 600; }
.command-row { display: flex; align-items: flex-start; gap: 10px; }
.join-command {
  display: block;
  flex: 1;
  box-sizing: border-box;
  height: auto;
  min-height: 40px;
  min-width: 0;
  margin: 0;
  padding: 10px 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  border-radius: 6px;
  background: #1f2937;
  color: #e5e7eb;
  font-size: 12px;
}
.command-row .el-button { flex: 0 0 auto; margin-top: 4px; }
.join-troubleshooting { margin-top: 18px; }
@media (max-width: 760px) {
  .join-address-row { display: block; }
  .join-address-select { width: 100%; margin-top: 10px; }
  .dashboard-warning { margin-left: 0; }
}
::v-deep .el-divider__text { color: #606266; font-weight: 600; }
</style>
