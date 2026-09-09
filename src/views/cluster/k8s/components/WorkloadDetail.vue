<template>
  <div class="project-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <div class="project-main">
      <div class="heading">
        <easy-title :title="title + ' 详情'" margin-set="0" />
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
      </div>
      <el-alert v-if="error" class="section" type="error" :closable="false" show-icon :title="error" />
      <template v-if="loaded">
        <div class="section">
          <easy-title :level="'h4'">基本信息</easy-title>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="命名空间">{{ meta('namespace') }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatK8sDate(meta('creationTimestamp')) }}</el-descriptions-item>
            <el-descriptions-item v-for="row in infoRows" :key="row.label" :label="row.label">{{ row.value }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="section">
          <easy-title :level="'h4'">容器</easy-title>
          <el-table :data="containers" size="small" border fit>
            <el-table-column label="名称" prop="name" min-width="180" />
            <el-table-column label="镜像" prop="image" min-width="300" />
            <el-table-column label="端口" min-width="200">
              <template #default="{ row }">{{ portsText(row.ports) }}</template>
            </el-table-column>
            <el-table-column label="CPU 请求/限制" min-width="180">
              <template #default="{ row }">{{ resourceText(row, 'cpu') }}</template>
            </el-table-column>
            <el-table-column label="内存 请求/限制" min-width="200">
              <template #default="{ row }">{{ resourceText(row, 'memory') }}</template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import { routeBreadcrumb } from '@/utils/helpers'
import { formatK8sDate, formatK8sCpu, formatK8sMemory } from '@/utils/filters'
import {
  kubernetesClusterStatefulSetDetail, kubernetesClusterDaemonSetDetail,
  kubernetesClusterJobDetail, kubernetesClusterCronJobDetail
} from '@/api/kubernetes'

const API = {
  statefulset: kubernetesClusterStatefulSetDetail,
  daemonset: kubernetesClusterDaemonSetDetail,
  job: kubernetesClusterJobDetail,
  cronjob: kubernetesClusterCronJobDetail
}
const LABEL = { statefulset: 'StatefulSets', daemonset: 'DaemonSets', job: 'Jobs', cronjob: 'CronJobs' }

export default {
  name: 'KubernetesWorkloadDetail',
  components: { Breadcrumb, EasyTitle },
  props: {
    kind: { type: String, required: true },
    title: { type: String, required: true },
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return { loading: false, loaded: false, error: '', detail: {} }
  },
  computed: {
    breadcrumb () {
      const listName = 'ClusterK8s' + this.title + 's'
      return [...routeBreadcrumb(this), { title: this.title + 's', to: { name: listName, params: { clusterId: this.clusterId } } }, { title: '详情', to: '' }]
    },
    containers () {
      const spec = this.detail.spec || {}
      const template = spec.template
        || (spec.jobTemplate && spec.jobTemplate.spec && spec.jobTemplate.spec.template)
        || {}
      return (template.spec && template.spec.containers) || []
    },
    infoRows () {
      const spec = this.detail.spec || {}
      const status = this.detail.status || {}
      if (this.kind === 'statefulset') {
        return [
          { label: '副本', value: spec.replicas ?? '-' },
          { label: '就绪副本', value: status.readyReplicas ?? '-' },
          { label: 'Service', value: spec.serviceName || '-' },
          { label: '更新策略', value: (spec.updateStrategy && spec.updateStrategy.type) || 'RollingUpdate' }
        ]
      }
      if (this.kind === 'daemonset') {
        return [
          { label: '期望副本', value: status.desiredNumberScheduled ?? '-' },
          { label: '就绪副本', value: status.numberReady ?? '-' },
          { label: '更新策略', value: (spec.updateStrategy && spec.updateStrategy.type) || 'RollingUpdate' },
          { label: '最大不可用', value: (spec.updateStrategy && spec.updateStrategy.rollingUpdate && spec.updateStrategy.rollingUpdate.maxUnavailable) || '1' }
        ]
      }
      if (this.kind === 'job') {
        return [
          { label: '完成数', value: spec.completions ?? '-' },
          { label: '并行度', value: spec.parallelism ?? 1 },
          { label: '活跃', value: status.active ?? 0 },
          { label: '失败', value: status.failed ?? 0 },
          { label: '退避上限', value: spec.backoffLimit ?? 6 },
          { label: '最后完成', value: this.formatK8sDate(status.completionTime) }
        ]
      }
      return [
        { label: '调度', value: spec.schedule || '-' },
        { label: '暂停', value: spec.suspend ? '是' : '否' },
        { label: '并发策略', value: spec.concurrencyPolicy || 'Allow' },
        { label: '最后调度', value: this.formatK8sDate(status.lastScheduleTime) },
        { label: '活跃数', value: Array.isArray(status.active) ? status.active.length : 0 }
      ]
    }
  },
  created () { this.load() },
  methods: {
    load () {
      const namespace = this.$route.query.namespace || ''
      const name = this.$route.query.name || ''
      if (!name) { this.error = '缺少资源名称'; return }
      this.loading = true
      this.error = ''
      API[this.kind](this.orgId, this.clusterId, namespace, name).then(res => {
        this.detail = (this.kind === 'cronjob' ? res.data.cronjob : this.kind === 'job' ? res.data.job : this.kind === 'daemonset' ? res.data.daemonset : res.data.statefulset) || {}
        this.loaded = true
      }).catch(err => {
        this.error = err.response?.data?.msg || err.response?.data?.message || '获取详情失败'
      }).finally(() => { this.loading = false })
    },
    meta (key) { return (this.detail.metadata && this.detail.metadata[key] != null) ? this.detail.metadata[key] : '-' },
    portsText (ports) {
      if (!ports || !ports.length) return '-'
      return ports.map(p => `${p.containerPort}/${p.protocol || 'TCP'}`).join(', ')
    },
    resourceText (container, kind) {
      const res = container.resources || {}
      const req = (res.requests && res.requests[kind]) || '-'
      const lim = (res.limits && res.limits[kind]) || '-'
      if (kind === 'memory') return `${formatK8sMemory(req)} / ${formatK8sMemory(lim)}`
      return `${formatK8sCpu(req)} / ${formatK8sCpu(lim)}`
    },
    formatK8sDate
  }
}
</script>

<style lang="scss" scoped>
.heading { display: flex; align-items: center; justify-content: space-between; }
.section { margin-top: 18px; }
</style>
