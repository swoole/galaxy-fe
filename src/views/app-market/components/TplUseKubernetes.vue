<template>
  <el-drawer
    :with-header="false"
    :visible.sync="visible"
    :close-on-press-escape="false"
    :wrapperClosable="false"
    size="680px">
    <div class="kubernetes-installer">
      <easy-title title="安装到 Kubernetes" margin-set="0 20" />

      <el-form
        v-if="!jobId"
        ref="form"
        :model="form"
        :rules="rules"
        label-width="130px"
        size="small">
        <el-alert
          class="security-alert"
          :title="securityTitle"
          :description="securityDescription"
          type="info"
          :closable="false"
          show-icon />

        <el-form-item label="应用标题" prop="title">
          <el-input v-model="form.title" class="form-control" />
        </el-form-item>
        <el-form-item label="目标集群" prop="cluster_id">
          <el-select
            v-model="form.cluster_id"
            v-loading="clustersLoading"
            class="form-control"
            placeholder="请选择已有的 Kubernetes 集群">
            <el-option
              v-for="cluster in clusters"
              :key="cluster.id"
              :label="cluster.title"
              :value="cluster.id"
              :disabled="cluster.status !== 3">
              <span>{{ cluster.title }}</span>
              <span class="cluster-extra">{{ cluster.version || '版本未知' }} · {{ cluster.status === 3 ? '在线' : '离线' }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="访问域名" prop="values.hostname">
          <el-input
            v-model.trim="form.values.hostname"
            class="form-control"
            :placeholder="fieldConfig('hostname').placeholder || '例如 app.example.com'" />
          <div class="form-tip">请提前将此域名解析到目标集群的 Ingress 入口。</div>
        </el-form-item>
        <el-form-item :label="fieldConfig('replicas').label || '副本数'" prop="values.replicas">
          <el-select v-if="driver === 'appmarket.kubernetes.kubesphere'" v-model="form.values.replicas">
            <el-option label="1（单副本）" :value="1" />
            <el-option label="3（高可用）" :value="3" />
          </el-select>
          <el-input-number v-else v-model="form.values.replicas" :min="1" :max="3" />
        </el-form-item>
        <el-form-item label="Ingress Class" prop="values.ingress_class">
          <el-input v-model.trim="form.values.ingress_class" class="form-control" placeholder="traefik" />
        </el-form-item>
        <el-form-item label="TLS Secret">
          <el-input
            v-model.trim="form.values.tls_secret"
            class="form-control"
            :placeholder="`可选，${namespace} 中已有的 TLS Secret`" />
          <div class="form-tip">生产环境建议提供有效证书。留空时仍启用 HTTPS，并使用 Ingress Controller 的默认证书。</div>
        </el-form-item>
        <el-form-item label="Ingress 外部端口" prop="values.public_port">
          <el-input-number v-model="form.values.public_port" :min="1" :max="65535" />
          <div class="form-tip">填写用户实际访问的 HTTPS 入口端口。K3d 使用宿主机端口映射时，例如当前环境为 7443。</div>
        </el-form-item>

        <el-divider content-position="left">将创建的资源</el-divider>
        <el-descriptions :column="1" size="small" border>
          <el-descriptions-item label="Namespace">{{ namespace }}</el-descriptions-item>
          <el-descriptions-item label="Release">{{ releaseName }}</el-descriptions-item>
          <el-descriptions-item label="工作负载">{{ kubernetesSpec.workload_description || 'Deployment / Service / Ingress' }}</el-descriptions-item>
          <el-descriptions-item label="集群接入">{{ kubernetesSpec.credential_description || 'Galaxy 使用已保存的 Kubernetes API 凭据完成安装' }}</el-descriptions-item>
          <el-descriptions-item label="访问凭据">初始密码由 Galaxy 自动生成，安装成功后仅显示一次</el-descriptions-item>
        </el-descriptions>

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
import {
  appMarketKubernetesClusters,
  appMarketTplUse
} from '@/api/app'

export default {
  name: 'AppMarketTplUseKubernetes',
  components: {
    EasyTitle,
    StepInstallProgress
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
      clusters: [],
      jobId: null,
      form: this.defaultForm(),
      rules: {
        title: [{ required: true, message: '请填写应用标题', trigger: 'blur' }],
        cluster_id: [{ required: true, message: '请选择 Kubernetes 集群', trigger: 'change' }],
        'values.hostname': [
          { required: true, message: '请填写访问域名', trigger: 'blur' },
          {
            pattern: /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
            message: '请输入有效域名',
            trigger: 'blur'
          }
        ],
        'values.replicas': [{ required: true, type: 'number', min: 1, max: 3, message: '副本数为 1 到 3', trigger: 'change' }],
        'values.ingress_class': [{ required: true, message: '请填写 Ingress Class', trigger: 'blur' }],
        'values.public_port': [{ required: true, type: 'number', min: 1, max: 65535, message: '请输入有效端口', trigger: 'change' }]
      }
    }
  },
  computed: {
    kubernetesSpec () {
      return this.profile.kubernetes_install || {}
    },
    namespace () {
      return this.kubernetesSpec.namespace || 'default'
    },
    releaseName () {
      return this.kubernetesSpec.release_name || (this.profile.client_config?.app?.name || 'application')
    },
    driver () {
      return this.profile.installer_driver || ''
    },
    securityTitle () {
      return this.driver === 'appmarket.kubernetes.kubesphere'
        ? 'Galaxy 将通过内置 Helm SDK 安装 KubeSphere'
        : 'Galaxy 将使用已保存的 Kubernetes API 凭据执行安装'
    },
    securityDescription () {
      if (this.driver === 'appmarket.kubernetes.kubesphere') {
        return 'Kubeconfig 仅在安装请求期间传给管理中心内的 Helm 服务；所选集群会成为 KubeSphere Host 集群，凭据不会写入模板、普通表单或安装日志。'
      }
      return 'API 配置会在后端重新生成并写入所选集群的 Secret，以只读方式挂载到应用。凭据不会写入普通表单、模板或安装日志。'
    }
  },
  methods: {
    fieldConfig (name) {
      const fields = (this.profile.client_config && this.profile.client_config.form) || {}
      return fields[name] || {}
    },
    defaultForm () {
      const fields = (this.profile.client_config && this.profile.client_config.form) || {}
      return {
        title: this.profile.title || 'Kubernetes 应用',
        cluster_id: null,
        values: {
          hostname: '',
          replicas: Number((fields.replicas && fields.replicas.default) || 1),
          ingress_class: (fields.ingress_class && fields.ingress_class.default) || 'traefik',
          tls_secret: '',
          public_port: 443
        }
      }
    },
    open () {
      this.visible = true
      if (!this.clusters.length) this.loadClusters()
    },
    close () {
      this.visible = false
    },
    loadClusters () {
      this.clustersLoading = true
      appMarketKubernetesClusters(this.orgId).then(res => {
        this.clusters = (res.data.clusters || [])
          // Older API workers did not expose orchestrator_type, but this
          // endpoint has always queried Kubernetes clusters exclusively.
          .filter(cluster => !cluster.orchestrator_type || cluster.orchestrator_type === 'kubernetes')
        const online = this.clusters.filter(cluster => cluster.status === 3)
        if (!this.form.cluster_id && online.length === 1) this.form.cluster_id = online[0].id
      }).finally(() => {
        this.clustersLoading = false
      })
    },
    submit () {
      this.$refs.form.validate(valid => {
        if (!valid) return
        this.submitting = true
        appMarketTplUse(this.orgId, this.profile.id, this.form).then(res => {
          this.jobId = res.data.job_id
        }).finally(() => {
          this.submitting = false
        })
      })
    },
    backToForm () {
      this.jobId = null
    },
    reset () {
      this.jobId = null
      this.form = this.defaultForm()
    }
  }
}
</script>

<style lang="scss" scoped>
.kubernetes-installer {
  padding: 20px 28px 32px;
}
.security-alert {
  margin-bottom: 22px;
}
.form-control {
  width: 100%;
}
.form-tip {
  margin-top: 5px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}
.cluster-extra {
  float: right;
  margin-left: 24px;
  color: #909399;
  font-size: 12px;
}
.operators {
  margin-top: 24px;
  padding-left: 130px;
}
</style>
