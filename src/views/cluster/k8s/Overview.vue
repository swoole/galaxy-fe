<template>
  <div class="project-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <div class="project-main">
      <div class="heading">
        <easy-title title="Kubernetes 集群概览" margin-set="0" />
        <el-button size="small" type="primary" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
      </div>
      <el-alert
        v-if="error"
        class="section"
        type="error"
        :closable="false"
        show-icon
        title="无法读取 Kubernetes 集群"
        :description="error" />
      <template v-if="loaded">
        <el-row :gutter="16" class="metrics">
          <el-col v-for="metric in metrics" :key="metric.title" :xs="12" :sm="8" :lg="4">
            <el-card shadow="hover" class="metric">
              <div class="metric-title">{{ metric.title }}</div>
              <div class="metric-value">{{ metric.value }}</div>
              <div class="metric-detail">{{ metric.detail }}</div>
            </el-card>
          </el-col>
        </el-row>
        <el-row :gutter="16" class="section">
          <el-col :xs="24" :lg="12">
            <el-card shadow="never">
              <div slot="header" class="card-header">
                <span>集群连接</span>
                <el-button type="text" icon="el-icon-setting" @click="openIngressSettings">入口设置</el-button>
              </div>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="API Server">{{ overview.connection.server_url }}</el-descriptions-item>
                <el-descriptions-item label="Context">{{ overview.connection.context_name }}</el-descriptions-item>
                <el-descriptions-item label="默认 Namespace">{{ overview.connection.default_namespace }}</el-descriptions-item>
                <el-descriptions-item label="HTTP 外部端口">{{ overview.connection.ingress_http_port || 80 }}</el-descriptions-item>
                <el-descriptions-item label="HTTPS 外部端口">{{ overview.connection.ingress_https_port || 443 }}</el-descriptions-item>
                <el-descriptions-item label="请求耗时">{{ overview.latency_ms }} ms</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="12">
            <el-card shadow="never">
              <div slot="header">Kubernetes 版本</div>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="版本">{{ overview.version.git_version || '-' }}</el-descriptions-item>
                <el-descriptions-item label="平台">{{ overview.version.platform || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Go">{{ overview.version.go_version || '-' }}</el-descriptions-item>
                <el-descriptions-item label="更新时间">{{ overview.generated_at | formatDate(null, '-') }}</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
        </el-row>
        <el-card shadow="never" class="section">
          <div slot="header">Pod 状态分布</div>
          <div class="phase-list">
            <el-tag v-for="(count, phase) in overview.pod_phases" :key="phase" size="small" :type="phaseType(phase)">
              {{ phase }} {{ count }}
            </el-tag>
            <span v-if="!Object.keys(overview.pod_phases || {}).length">暂无 Pod</span>
          </div>
        </el-card>
      </template>
    </div>
    <el-dialog title="Kubernetes 入口设置" :visible.sync="settingsVisible" width="480px">
      <el-alert
        title="外部端口由集群入口统一提供，所有 Ingress 和项目路由都会继承此配置。"
        type="info"
        :closable="false"
        show-icon />
      <el-form label-width="130px" class="settings-form">
        <el-form-item label="HTTP 外部端口">
          <el-input-number
            v-model="settings.ingress_http_port"
            :min="1"
            :max="65535"
            controls-position="right" />
        </el-form-item>
        <el-form-item label="HTTPS 外部端口">
          <el-input-number
            v-model="settings.ingress_https_port"
            :min="1"
            :max="65535"
            controls-position="right" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="settingsVisible = false">取消</el-button>
        <el-button type="primary" :loading="settingsSaving" @click="saveIngressSettings">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import { routeBreadcrumb } from '@/utils/helpers'
import { formatDate } from '@/utils/filters'
import { kubernetesClusterIngressSettings, kubernetesClusterOverview } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sOverview',
  components: { Breadcrumb, EasyTitle },
  filters: { formatDate },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      loading: false,
      loaded: false,
      error: '',
      settingsVisible: false,
      settingsSaving: false,
      settings: { ingress_http_port: 80, ingress_https_port: 443 },
      overview: { summary: {}, version: {}, connection: {}, pod_phases: {} }
    }
  },
  computed: {
    breadcrumb () { return [...routeBreadcrumb(this), { title: '概览', to: '' }] },
    metrics () {
      const summary = this.overview.summary || {}
      return [
        { title: '节点', value: summary.nodes || 0, detail: `${summary.ready_nodes || 0} Ready` },
        { title: 'Namespaces', value: summary.namespaces || 0, detail: '逻辑资源边界' },
        { title: 'Pods', value: summary.pods || 0, detail: `${summary.running_pods || 0} Running` },
        { title: 'Deployments', value: summary.deployments || 0, detail: '应用工作负载' }
      ]
    }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      this.error = ''
      kubernetesClusterOverview(this.orgId, this.clusterId).then(res => {
        this.overview = res.data.overview || this.overview
        this.loaded = true
      }).catch(error => {
        this.error = (error && error.message) || 'Kubernetes API 请求失败'
      }).finally(() => { this.loading = false })
    },
    phaseType (phase) {
      return { Running: 'success', Pending: 'warning', Failed: 'danger', Succeeded: 'info' }[phase] || 'info'
    },
    openIngressSettings () {
      const connection = this.overview.connection || {}
      this.settings = {
        ingress_http_port: Number(connection.ingress_http_port || 80),
        ingress_https_port: Number(connection.ingress_https_port || 443)
      }
      this.settingsVisible = true
    },
    saveIngressSettings () {
      if (this.settings.ingress_http_port === this.settings.ingress_https_port) {
        return this.$message.warning('HTTP 与 HTTPS 外部端口不能相同')
      }
      this.settingsSaving = true
      kubernetesClusterIngressSettings(this.orgId, this.clusterId, this.settings).then(res => {
        this.overview.connection = res.data.connection || this.overview.connection
        this.settingsVisible = false
        if (res.data.sync_error) {
          this.$message.warning(`入口设置已保存，但已有 Ingress 同步失败：${res.data.sync_error}`)
        } else {
          this.$message.success('Kubernetes 入口设置已保存并同步')
        }
      }).finally(() => { this.settingsSaving = false })
    }
  }
}
</script>

<style lang="scss" scoped>
.heading { display: flex; align-items: center; justify-content: space-between; }
.section { margin-top: 18px; }
.metrics { margin-top: 20px; }
.metric { min-height: 118px; }
.metric-title { color: #909399; font-size: 13px; }
.metric-value { margin-top: 10px; color: #303133; font-size: 30px; font-weight: 600; }
.metric-detail { margin-top: 5px; color: #909399; font-size: 12px; }
.phase-list { display: flex; flex-wrap: wrap; gap: 10px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.settings-form { margin-top: 20px; }
</style>
