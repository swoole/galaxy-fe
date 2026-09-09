<template>
  <div class="project-container usage-ranking-page">
    <breadcrumb :breadcrumb="breadcrumb" />
    <div style="padding: 20px">
      <div class="page-heading">
        <div>
          <h2>资源消耗排行</h2>
          <p>基于后台监控快照汇总，每分钟自动更新，不会在打开页面时遍历集群节点。</p>
        </div>
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
      </div>
      <div class="content-card">
        <div class="metric-tabs">
          <button
            v-for="item in metricOptions"
            :key="item.value"
            type="button"
            :disabled="kubernetesInfrastructureScope && ['network', 'disk'].includes(item.value)"
            :class="{
              active: filters.metric === item.value,
              disabled: kubernetesInfrastructureScope && ['network', 'disk'].includes(item.value)
            }"
            @click="changeMetric(item.value)">
            <svg-icon :icon-class="item.icon" />
            <span>{{ item.label }}</span>
          </button>
        </div>

        <div class="toolbar">
          <el-radio-group v-model="filters.scope" size="small" @change="changeScope">
            <el-radio-button
              v-for="item in scopeOptions"
              :key="item.value"
              :label="item.value">
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
          <el-select
            v-model="filters.orchestratorType"
            clearable
            size="small"
            placeholder="全部编排类型"
            @change="changeOrchestrator">
            <el-option label="Docker Swarm" value="docker_swarm" />
            <el-option label="Kubernetes" value="kubernetes" />
          </el-select>
          <el-select
            v-model="filters.clusterId"
            clearable
            size="small"
            placeholder="全部集群"
            @change="changeCluster">
            <el-option
              v-for="cluster in visibleClusters"
              :key="cluster.id"
              :label="cluster.title"
              :value="cluster.id" />
          </el-select>
          <span class="toolbar-note">{{ data.note }}</span>
        </div>

        <el-table
          v-loading="loading"
          :data="rows"
          stripe
          empty-text="暂无监控快照"
          class="ranking-table">
          <el-table-column label="排名" width="76" align="center">
            <template #default="{ $index, row }">
              <span v-if="row.available" class="rank" :class="`rank-${$index + 1}`">{{ $index + 1 }}</span>
              <span v-else class="muted">-</span>
            </template>
          </el-table-column>
          <el-table-column :label="nameColumnLabel" min-width="245">
            <template #default="{ row }">
              <router-link
                v-if="!infrastructureScope"
                class="primary-link"
                :to="projectLink(row)">
                {{ filters.scope === 'project' ? row.project_title : row.title }}
              </router-link>
              <span v-else class="resource-name">{{ row.title }}</span>
              <div v-if="filters.scope === 'project'" class="secondary">
                {{ row.group_title }} · {{ row.runtime_count }} 个实例
              </div>
              <div v-else-if="filters.scope === 'runtime'" class="secondary workload" :title="row.workload_name">
                {{ row.project_title }} · {{ workloadKind(row) }} {{ row.workload_name || '-' }}
              </div>
              <div v-else class="secondary workload" :title="resourceSecondary(row)">
                {{ resourceSecondary(row) }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="运行位置" min-width="210">
            <template #default="{ row }">
              <template v-if="filters.scope === 'project'">
                <div>{{ (row.cluster_titles || []).join('、') || '-' }}</div>
                <div class="secondary">
                  {{ (row.orchestrator_types || []).map(orchestratorText).join(' + ') }}
                </div>
              </template>
              <template v-else-if="filters.scope === 'runtime'">
                <div>{{ row.cluster_title }}</div>
                <div class="secondary">
                  {{ orchestratorText(row.orchestrator_type) }}
                  <span v-if="row.runtime_namespace"> · {{ row.runtime_namespace }}</span>
                </div>
              </template>
              <template v-else>
                <div>{{ row.cluster_title }}</div>
                <div class="secondary">{{ resourceLocation(row) }}</div>
              </template>
            </template>
          </el-table-column>
          <el-table-column :label="metricLabel" min-width="310">
            <template #default="{ row }">
              <template v-if="row.available">
                <div class="value-line">
                  <strong>{{ formatMetric(row.value) }}</strong>
                  <span>{{ metricBreakdown(row) }}</span>
                </div>
                <div class="usage-bar">
                  <i :style="{ width: barWidth(row.value) }" />
                </div>
              </template>
              <div v-else class="unavailable">
                {{ unavailableText(row) }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="采集状态" width="145">
            <template #default="{ row }">
              <el-tag v-if="row.stale" size="mini" type="warning">快照已过期</el-tag>
              <el-tag v-else-if="row.available" size="mini" type="success">{{ coverageText(row) }}</el-tag>
              <el-tag v-else size="mini" type="info">暂不可用</el-tag>
              <div class="secondary collected-at">{{ formatTime(row.collected_at) }}</div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb.vue'
import { routeBreadcrumb } from '@/utils/helpers'
import { resourceUsageRanking } from '@/api/resource-usage'

export default {
  name: 'ResourceUsageRanking',
  components: { Breadcrumb },
  props: {
    orgId: { type: [Number, String], required: true }
  },
  data () {
    return {
      loading: false,
      data: { rows: [], clusters: [], note: '' },
      filters: {
        metric: 'cpu',
        scope: 'project',
        clusterId: null,
        orchestratorType: null,
        limit: 50
      },
      timer: null,
      metricOptions: [
        { value: 'cpu', label: 'CPU', icon: 'activity' },
        { value: 'memory', label: '内存', icon: 'database' },
        { value: 'network', label: '网络 I/O', icon: 'connection' },
        { value: 'disk', label: '磁盘 I/O', icon: 'server' }
      ],
      baseScopeOptions: [
        { value: 'project', label: '项目' },
        { value: 'runtime', label: '实例' }
      ]
    }
  },
  computed: {
    breadcrumb () { return [...routeBreadcrumb(this), { title: '资源消耗排行', to: '' }] },
    rows () { return this.data.rows || [] },
    infrastructureScope () {
      return ['pod', 'workload', 'namespace', 'service', 'node'].includes(this.filters.scope)
    },
    kubernetesInfrastructureScope () {
      return this.infrastructureScope && this.filters.orchestratorType === 'kubernetes'
    },
    scopeOptions () {
      const options = [...this.baseScopeOptions]
      if (!this.filters.orchestratorType && !this.filters.clusterId) return options
      if (this.filters.orchestratorType === 'kubernetes') {
        return options.concat([
          { value: 'pod', label: 'Pod' },
          { value: 'workload', label: 'Workload' },
          { value: 'namespace', label: 'Namespace' },
          { value: 'node', label: 'Node' }
        ])
      }
      if (this.filters.orchestratorType === 'docker_swarm') {
        return options.concat([
          { value: 'service', label: 'Service' },
          { value: 'node', label: 'Node' }
        ])
      }
      return options
    },
    nameColumnLabel () {
      const labels = {
        project: '项目',
        runtime: '实例 / 工作负载',
        pod: 'Pod',
        workload: 'Workload',
        namespace: 'Namespace',
        service: 'Service',
        node: 'Node'
      }
      return labels[this.filters.scope] || '资源'
    },
    visibleClusters () {
      const type = this.filters.orchestratorType
      return (this.data.clusters || []).filter(item => !type || item.orchestrator_type === type)
    },
    maxValue () {
      return Math.max(...this.rows.filter(row => row.available).map(row => Number(row.value || 0)), 0)
    },
    metricLabel () {
      return this.metricOptions.find(item => item.value === this.filters.metric)?.label || '资源使用'
    }
  },
  created () {
    this.load()
    this.timer = setInterval(() => this.load(false), 60000)
  },
  beforeDestroy () {
    if (this.timer) clearInterval(this.timer)
  },
  methods: {
    load (showLoading = true) {
      if (showLoading) this.loading = true
      return resourceUsageRanking(this.orgId, this.filters)
        .then(res => { this.data = res.data || this.data })
        .finally(() => { if (showLoading) this.loading = false })
    },
    changeMetric (metric) {
      if (this.kubernetesInfrastructureScope && ['network', 'disk'].includes(metric)) return
      if (this.filters.metric === metric) return
      this.filters.metric = metric
      this.load()
    },
    changeScope () {
      if (this.kubernetesInfrastructureScope && ['network', 'disk'].includes(this.filters.metric)) {
        this.filters.metric = 'cpu'
      }
      this.load()
    },
    changeOrchestrator (type) {
      this.filters.clusterId = null
      if (!this.scopeOptions.some(item => item.value === this.filters.scope)) {
        this.filters.scope = 'project'
      }
      if (type === 'kubernetes' && ['network', 'disk'].includes(this.filters.metric) && this.infrastructureScope) {
        this.filters.metric = 'cpu'
      }
      this.load()
    },
    changeCluster (clusterId) {
      if (clusterId) {
        const cluster = (this.data.clusters || []).find(item => Number(item.id) === Number(clusterId))
        if (cluster) this.filters.orchestratorType = cluster.orchestrator_type
      }
      if (!this.scopeOptions.some(item => item.value === this.filters.scope)) {
        this.filters.scope = 'project'
      }
      this.load()
    },
    orchestratorText (type) {
      return type === 'kubernetes' ? 'Kubernetes' : 'Docker Swarm'
    },
    workloadKind (row) {
      const kind = String(row.workload_kind || '').toLowerCase()
      const labels = {
        service: 'Service',
        deployment: 'Deployment',
        replicaset: 'ReplicaSet',
        statefulset: 'StatefulSet',
        daemonset: 'DaemonSet',
        job: 'Job',
        cronjob: 'CronJob',
        pod: '独立 Pod'
      }
      return labels[kind] || row.workload_kind || '工作负载'
    },
    resourceSecondary (row) {
      if (this.filters.scope === 'pod') {
        return `${this.workloadKind(row)} ${row.workload_name || '-'} · ${row.phase || 'Unknown'}`
      }
      if (this.filters.scope === 'workload') {
        return `${this.workloadKind(row)} · ${row.pod_count || 0} 个 Pod`
      }
      if (this.filters.scope === 'namespace') {
        return `${row.workload_count || 0} 个 Workload · ${row.pod_count || 0} 个 Pod`
      }
      if (this.filters.scope === 'service') {
        return `${row.phase || 'unknown'} · ${row.running_tasks || 0}/${row.desired_tasks || 0} 个 Task · ${row.container_count || 0} 个容器`
      }
      return row.orchestrator_type === 'docker_swarm'
        ? `${row.phase || 'unknown'} · ${row.container_count || 0} 个容器`
        : `${row.phase || 'Unknown'} · ${row.pod_count || 0} 个 Pod`
    },
    resourceLocation (row) {
      if (row.orchestrator_type === 'docker_swarm') {
        return this.filters.scope === 'service'
          ? `Docker Swarm · ${row.container_count || 0} 个运行容器`
          : 'Docker Swarm · 容器资源合计'
      }
      if (this.filters.scope === 'node') return 'Kubernetes'
      const parts = [row.namespace || 'default']
      if (this.filters.scope === 'pod' && row.node_name) parts.push(row.node_name)
      if (['workload', 'namespace'].includes(this.filters.scope) && Number(row.node_count || 0) > 0) {
        parts.push(`${row.node_count} 个节点`)
      }
      return parts.join(' · ')
    },
    projectLink (row) {
      return {
        name: this.filters.scope === 'project' ? 'ProjectOverview' : 'ProjectInstance',
        params: {
          groupId: row.group_alias || row.group_id,
          projectId: row.project_alias || row.project_id
        }
      }
    },
    barWidth (value) {
      if (this.maxValue <= 0) return '0%'
      return `${Math.max(2, Number(value || 0) / this.maxValue * 100).toFixed(2)}%`
    },
    formatMetric (value) {
      if (this.filters.metric === 'cpu') return `${Number(value || 0).toFixed(1)}%`
      return this.bytes(value, this.filters.metric === 'memory' ? '' : '/s')
    },
    bytes (value, suffix = '') {
      let size = Number(value || 0)
      const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
      let index = 0
      while (size >= 1024 && index < units.length - 1) { size /= 1024; index++ }
      return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}${suffix}`
    },
    metricBreakdown (row) {
      if (this.filters.metric === 'memory' && Number(row.memory_limit || 0) > 0) {
        return `限制 ${this.bytes(row.memory_limit)}`
      }
      if (this.filters.metric === 'network') {
        return `接收 ${this.bytes(row.network_rx_bps, '/s')} · 发送 ${this.bytes(row.network_tx_bps, '/s')}`
      }
      if (this.filters.metric === 'disk') {
        return `读取 ${this.bytes(row.disk_read_bps, '/s')} · 写入 ${this.bytes(row.disk_write_bps, '/s')}`
      }
      return ''
    },
    unavailableText (row) {
      const types = this.filters.scope === 'project' ? (row.orchestrator_types || []) : [row.orchestrator_type]
      if (['network', 'disk'].includes(this.filters.metric) && types.length === 1 && types[0] === 'kubernetes') {
        return 'Kubernetes 基础版暂未采集此指标'
      }
      return this.filters.metric === 'network' || this.filters.metric === 'disk'
        ? '缺少连续快照或 Agent 指标'
        : '尚未采集到资源指标'
    },
    coverageText (row) {
      if (this.infrastructureScope) {
        const total = Number(row.resource_count || 1)
        const covered = Number(row.covered_resource_count || (row.available ? 1 : 0))
        return total > 1 ? `覆盖 ${covered}/${total}` : '采集正常'
      }
      const covered = this.filters.metric === 'disk'
        ? Number(row.disk_covered_runtime_count || (row.disk_available ? 1 : 0))
        : this.filters.metric === 'network'
          ? Number(row.network_covered_runtime_count || (row.network_available ? 1 : 0))
          : Number(row.covered_runtime_count || (row.available ? 1 : 0))
      return row.runtime_count > 1 ? `覆盖 ${covered}/${row.runtime_count}` : '采集正常'
    },
    formatTime (timestamp) {
      if (!timestamp) return '尚无快照'
      return new Date(Number(timestamp) * 1000).toLocaleString()
    }
  }
}
</script>

<style lang="scss" scoped>
.usage-ranking-page { padding-bottom: 30px; }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; margin: 6px 0 18px; }
.page-heading h2 { margin: 0; color: #303133; font-size: 22px; font-weight: 600; }
.page-heading p { margin: 7px 0 0; color: #909399; font-size: 13px; }
.content-card { padding: 18px; border: 1px solid #ebeef5; border-radius: 8px; background: #fff; }
.metric-tabs { display: grid; grid-template-columns: repeat(4, minmax(130px, 1fr)); gap: 12px; margin-bottom: 18px; }
.metric-tabs button { display: flex; align-items: center; gap: 9px; padding: 14px 16px; border: 1px solid #dcdfe6; border-radius: 7px; background: #fff; color: #606266; cursor: pointer; font-size: 14px; text-align: left; transition: .2s; }
.metric-tabs button:hover { border-color: #a0cfff; color: #409eff; }
.metric-tabs button.active { border-color: #409eff; background: #ecf5ff; color: #409eff; box-shadow: inset 0 0 0 1px #409eff; }
.metric-tabs button.disabled { border-color: #ebeef5; background: #f5f7fa; color: #c0c4cc; cursor: not-allowed; }
.metric-tabs svg { width: 18px; height: 18px; }
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.toolbar .el-select { width: 190px; }
.toolbar-note { margin-left: auto; max-width: 520px; color: #909399; font-size: 12px; line-height: 1.5; text-align: right; }
.primary-link { color: #303133; font-weight: 500; }
.primary-link:hover { color: #409eff; }
.resource-name { color: #303133; font-weight: 500; }
.secondary { margin-top: 5px; color: #909399; font-size: 12px; line-height: 1.35; }
.workload { max-width: 390px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #f2f3f5; color: #606266; font-weight: 600; }
.rank-1 { background: #fff1f0; color: #f56c6c; }
.rank-2 { background: #fdf6ec; color: #e6a23c; }
.rank-3 { background: #ecf5ff; color: #409eff; }
.muted, .unavailable { color: #909399; font-size: 13px; }
.value-line { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.value-line strong { color: #303133; font-size: 16px; font-variant-numeric: tabular-nums; }
.value-line span { overflow: hidden; color: #909399; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.usage-bar { height: 5px; margin-top: 9px; overflow: hidden; border-radius: 3px; background: #ebeef5; }
.usage-bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #79bbff, #409eff); transition: width .25s; }
.collected-at { white-space: nowrap; }
@media (max-width: 1200px) {
  .metric-tabs { grid-template-columns: repeat(2, minmax(130px, 1fr)); }
  .toolbar { align-items: flex-start; flex-wrap: wrap; }
  .toolbar-note { width: 100%; max-width: none; margin-left: 0; text-align: left; }
}
</style>
