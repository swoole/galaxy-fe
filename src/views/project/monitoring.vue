<template>
  <div class="project-container monitoring-page">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <div class="project-main">
      <div class="page-heading">
        <easy-title title="项目运行监控" margin-set="0" />
        <div>
          <el-select v-model="runtimeId" size="small" class="runtime-select" @change="changeRuntime">
            <el-option :value="null" label="全部运行实例" />
            <el-option
              v-for="runtime in runtimeOptions"
              :key="runtime.runtime_id"
              :value="runtime.runtime_id"
              :label="runtimeLabel(runtime)" />
          </el-select>
          <el-select v-model="routeKey" size="small" class="route-select" @change="loadHttp()">
            <el-option :value="null" :label="runtimeId ? '该实例全部 Web 路由' : '全部 Web 路由'" />
            <el-option
              v-for="route in routeOptions"
              :key="route.key"
              :value="route.key"
              :label="routeLabel(route)" />
          </el-select>
          <el-select v-model="hours" size="small" class="range-select" @change="reloadAll">
            <el-option :value="1" label="最近 1 小时" />
            <el-option :value="6" label="最近 6 小时" />
            <el-option :value="24" label="最近 24 小时" />
            <el-option :value="168" label="最近 7 天" />
          </el-select>
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="reloadAll">刷新</el-button>
        </div>
      </div>

      <el-alert :title="data.metric_note || defaultNote" type="info" :closable="false" show-icon />

      <easy-title title="Web 请求监控" margin-set="22px 0 12px" />
      <div class="section-note">
        请求汇总与 Web SLO 已迁移至
        <router-link :to="`/project/${groupId}/${projectId}/overview`">项目概览</router-link>，
        此处保留详细趋势与分布分析。
      </div>
      <el-alert
        v-if="!httpData.available"
        :title="httpData.metric_note || '暂无 Web 请求指标，请为项目配置域名路由，并在集群中部署 Prometheus。'"
        type="warning"
        :closable="false"
        show-icon />
      <template v-else>
        <el-row :gutter="20" class="chart-row">
          <el-col :span="12"><div class="chart-card"><monitor-line-chart :chart-data="requestChart" height="280px" /></div></el-col>
          <el-col :span="12"><div class="chart-card"><monitor-line-chart :chart-data="successRateChart" height="280px" /></div></el-col>
        </el-row>
        <el-row :gutter="20" class="chart-row">
          <el-col :span="24"><div class="chart-card"><monitor-line-chart :chart-data="latencyChart" height="300px" /></div></el-col>
        </el-row>
        <el-row :gutter="20" class="chart-row">
          <el-col :span="24"><div class="chart-card"><monitor-stacked-bar-chart :chart-data="statusTrendChart" height="380px" /></div></el-col>
        </el-row>
        <el-row :gutter="20" class="breakdown-row">
          <el-col :span="8">
            <div class="breakdown-card"><monitor-pie-chart title="HTTP 状态码" :data="statusPieData" height="270px" /></div>
          </el-col>
          <el-col :span="8">
            <div class="breakdown-card"><monitor-pie-chart title="HTTP 方法" :data="methodPieData" height="270px" /></div>
          </el-col>
          <el-col :span="8">
            <div class="breakdown-card"><monitor-pie-chart title="访问协议 / TLS" :data="protocolPieData" height="270px" /></div>
          </el-col>
        </el-row>
        <div class="secondary http-note">{{ httpData.metric_note }} 数据范围：最近 {{ hours }} 小时；指标每 15 秒短暂缓存。</div>
      </template>

      <div class="alert-toolbar">
        <div>
          <strong>Email 运行告警</strong>
          <span class="secondary alert-state">{{ alertData.rule && alertData.rule.enabled ? '已启用' : '未启用' }}</span>
        </div>
        <el-button v-if="canOperate" size="small" icon="el-icon-setting" @click="openAlertSettings">告警设置</el-button>
      </div>
      <div class="metric-grid runtime-metric-grid">
        <metric-card title="就绪副本" :value="`${summary.running_tasks || 0} / ${summary.desired_tasks || 0}`" :footer="`异常副本 ${summary.failed_tasks || 0}`" compact />
        <metric-card title="CPU 使用率" :value="`${number(summary.cpu_percent)}%`" :footer="`资源指标覆盖 ${metricCoveredRuntimes}/${summary.runtime_count || 0} 个实例`" compact />
        <metric-card title="内存使用" :value="bytes(summary.memory_usage)" :footer="summary.memory_limit ? `可见限制 ${bytes(summary.memory_limit)}` : '由运行时指标 Provider 汇总'" compact />
        <metric-card title="网络接收" :value="bytes(summary.network_rx)" footer="支持该指标的 Provider 累计 RX" compact />
        <metric-card title="网络发送" :value="bytes(summary.network_tx)" :footer="`支持该指标的 Provider 累计 TX`" compact />
        <metric-card title="磁盘读 / 写" :value="`${bytes(summary.disk_read)} / ${bytes(summary.disk_write)}`" :footer="diskIoFooter" compact />
      </div>

      <el-row :gutter="20" class="chart-row">
        <el-col :span="12"><div class="chart-card"><monitor-line-chart :chart-data="cpuChart" height="280px" /></div></el-col>
        <el-col :span="12"><div class="chart-card"><monitor-line-chart :chart-data="memoryChart" height="280px" /></div></el-col>
      </el-row>
      <el-row :gutter="20" class="chart-row">
        <el-col :span="12"><div class="chart-card"><monitor-line-chart :chart-data="networkChart" height="280px" /></div></el-col>
        <el-col :span="12">
          <div class="chart-card">
            <monitor-line-chart v-if="diskIoAvailable" :chart-data="diskIoChart" height="280px" />
            <el-empty v-else :image-size="72" description="当前所选实例没有可用的容器磁盘 I/O Provider">
              <div class="disk-empty-note">Swarm 使用 Docker blkio_stats；K8s 需要接入 cAdvisor/Prometheus。</div>
            </el-empty>
          </div>
        </el-col>
      </el-row>

    </div>

    <el-dialog title="运行告警与 Web SLO 设置" :visible.sync="alertDialogVisible" width="620px">
      <el-form label-width="130px">
        <el-form-item label="启用告警"><el-switch v-model="alertForm.enabled" /></el-form-item>
        <el-form-item label="连续异常次数"><el-input-number v-model="alertForm.failure_threshold" :min="1" :max="20" /></el-form-item>
        <el-form-item label="重复通知间隔">
          <el-select v-model="alertForm.cooldown_seconds">
            <el-option :value="300" label="5 分钟" /><el-option :value="900" label="15 分钟" />
            <el-option :value="1800" label="30 分钟" /><el-option :value="3600" label="1 小时" />
            <el-option :value="21600" label="6 小时" /><el-option :value="86400" label="24 小时" />
          </el-select>
        </el-form-item>
        <el-form-item label="恢复通知"><el-switch v-model="alertForm.notify_recovery" /></el-form-item>
        <el-divider content-position="left">Web SLO 目标</el-divider>
        <el-form-item label="可用性目标"><el-input-number v-model="alertForm.slo_availability_target" :min="90" :max="100" :step="0.1" :precision="3" /><span class="form-tip inline">%</span></el-form-item>
        <el-form-item label="最低成功率"><el-input-number v-model="alertForm.slo_success_rate_target" :min="0" :max="100" :step="0.1" :precision="3" /><span class="form-tip inline">%</span></el-form-item>
        <el-form-item label="P95 上限"><el-input-number v-model="alertForm.slo_p95_ms_max" :min="1" :max="600000" /><span class="form-tip inline">ms</span></el-form-item>
        <el-form-item label="收件人">
          <el-select
            v-model="alertForm.recipients"
            multiple
            filterable
            allow-create
            default-first-option
            style="width:100%"
            placeholder="留空时发送给项目成员">
            <el-option v-for="email in alertForm.recipients" :key="email" :label="email" :value="email" />
          </el-select>
          <div class="form-tip">输入邮箱后按回车；留空将使用所有项目成员的邮箱。</div>
        </el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="alertDialogVisible = false">取消</el-button><el-button type="primary" :loading="alertSaving" @click="saveAlertSettings">保存</el-button></span>
    </el-dialog>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import MetricCard from '@/views/project/components/MetricCard'
import MonitorLineChart from '@/views/components/Chart/MonitorLineChart'
import MonitorPieChart from '@/views/components/Chart/MonitorPieChart'
import MonitorStackedBarChart from '@/views/components/Chart/MonitorStackedBarChart'
import { projectMonitoring, projectHttpMonitoring, projectAlertProfile, projectAlertSave } from '@/api/project'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'ProjectMonitoring',
  components: { Breadcrumb, EasyTitle, MetricCard, MonitorLineChart, MonitorPieChart, MonitorStackedBarChart },
  props: {
    project: { type: Object, default: null },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return {
      hours: 24,
      runtimeId: null,
      runtimeOptions: [],
      routeKey: null,
      loading: false,
      data: { summary: {}, runtimes: [], trend: [], lifecycle: { builds: {}, releases: {} } },
      httpData: { available: false, summary: {}, clusters: [], routes: [] },
      timer: null,
      alertData: { rule: null, alerts: [], events: [] },
      alertDialogVisible: false,
      alertSaving: false,
      alertForm: {
        enabled: false,
        recipients: [],
        failure_threshold: 2,
        cooldown_seconds: 1800,
        notify_recovery: true,
        slo_availability_target: 99.9,
        slo_success_rate_target: 99,
        slo_p95_ms_max: 500
      },
      defaultNote: '实例健康状态由对应编排 Provider 采集；资源指标是否可用取决于 Swarm Agent 或 Kubernetes Metrics API。'
    }
  },
  computed: {
    canOperate () { return this.$p('project.no_viewer', this.project.org_role, this.project.group_role, this.project.role) },
    breadcrumb () { return [...routeBreadcrumb(this), { title: '部署', to: '' }, { title: '运行监控', to: '' }] },
    summary () { return this.data.summary || {} },
    httpCluster () {
      if (this.httpData.trend) return this.httpData
      return (this.httpData.clusters || []).find(item => item.available) || { trend: {}, status_trend: {}, status_codes: [], methods: [], protocols: [] }
    },
    statusPieData () {
      const colors = { 200: '#52c41a', 201: '#73d13d', 202: '#95de64', 204: '#13c2c2', 301: '#40a9ff', 302: '#69c0ff', 304: '#91d5ff', 400: '#faad14', 401: '#ffc53d', 403: '#d48806', 404: '#fa8c16', 409: '#d46b08', 429: '#ad6800', 500: '#f5222d', 502: '#eb2f96', 503: '#cf1322', 504: '#a8071a' }
      return (this.httpCluster.status_codes || []).map(item => {
        const code = String(item.key || '')
        const color = colors[code] || (code.startsWith('2') ? '#67c23a' : code.startsWith('3') ? '#409eff' : code.startsWith('4') ? '#e6a23c' : code.startsWith('5') ? '#f56c6c' : '#909399')
        return { name: code, value: Number(item.value || 0), color }
      })
    },
    methodPieData () {
      const colors = { GET: '#409eff', POST: '#67c23a', PUT: '#e6a23c', PATCH: '#7b61ff', DELETE: '#f56c6c', HEAD: '#19b5a5', OPTIONS: '#909399' }
      return (this.httpCluster.methods || []).map(item => ({ name: String(item.key || 'UNKNOWN'), value: Number(item.value || 0), color: colors[item.key] }))
    },
    protocolPieData () {
      const labels = { http: 'HTTP', https: 'HTTPS / TLS', HTTP: 'HTTP', HTTPS: 'HTTPS / TLS' }
      const colors = { http: '#909399', https: '#67c23a', HTTP: '#909399', HTTPS: '#67c23a' }
      return (this.httpCluster.protocols || []).map(item => ({
        name: labels[item.key] || String(item.key || 'UNKNOWN').toUpperCase(),
        value: Number(item.value || 0),
        color: colors[item.key] || '#409eff'
      }))
    },
    routeOptions () {
      const routes = this.httpData.routes || []
      return this.runtimeId
        ? routes.filter(route => Number(route.runtime_id) === Number(this.runtimeId))
        : routes
    },
    metricCoveredRuntimes () {
      return (this.data.runtimes || []).filter(runtime => Number(runtime.metric_coverage || 0) > 0).length
    },
    diskIoAvailable () {
      return Number(this.summary.disk_io_runtime_count || 0) > 0
    },
    diskIoFooter () {
      const covered = Number(this.summary.disk_io_runtime_count || 0)
      const total = Number(this.summary.runtime_count || 0)
      return covered > 0
        ? `磁盘 I/O Provider 覆盖 ${covered}/${total} 个实例`
        : '当前 Provider 未提供磁盘 I/O'
    },
    cpuChart () {
      const trend = this.data.trend || []
      return {
        title: 'CPU 使用率趋势',
        labels: trend.map(item => this.time(item.collected_at)),
        keys: ['cpu'],
        legends: ['CPU (%)'],
        data: { cpu: trend.map(item => Number(item.cpu_percent || 0)) },
        valueFormatter: value => `${Number(value || 0).toFixed(1)}%`
      }
    },
    memoryChart () {
      const trend = this.data.trend || []
      return {
        title: '内存使用趋势',
        labels: trend.map(item => this.time(item.collected_at)),
        keys: ['memory'],
        legends: ['内存 (MiB)'],
        data: { memory: trend.map(item => Number(item.memory_usage || 0) / 1048576) },
        valueFormatter: value => `${Number(value || 0).toFixed(1)} MiB`
      }
    },
    networkChart () {
      const trend = this.data.trend || []
      return {
        title: '网络累计流量趋势',
        labels: trend.map(item => this.time(item.collected_at)),
        keys: ['rx', 'tx'],
        legends: ['接收 (MiB)', '发送 (MiB)'],
        data: { rx: trend.map(item => Number(item.network_rx || 0) / 1048576), tx: trend.map(item => Number(item.network_tx || 0) / 1048576) },
        valueFormatter: value => Number(value || 0).toFixed(1)
      }
    },
    diskIoChart () {
      const trend = this.data.trend || []
      return {
        title: '容器磁盘 I/O 累计趋势',
        labels: trend.map(item => this.time(item.collected_at)),
        keys: ['read', 'write'],
        legends: ['读取 (MiB)', '写入 (MiB)'],
        data: {
          read: trend.map(item => Number(item.disk_read || 0) / 1048576),
          write: trend.map(item => Number(item.disk_write || 0) / 1048576)
        },
        valueFormatter: value => `${Number(value || 0).toFixed(1)} MiB`
      }
    },
    requestChart () {
      const rps = (this.httpCluster.trend && this.httpCluster.trend.rps) || []
      return {
        title: '请求吞吐趋势',
        labels: rps.map(item => this.time(item.timestamp)),
        keys: ['rps'],
        legends: ['请求/秒'],
        data: { rps: rps.map(item => item.value) },
        valueFormatter: value => Number(value || 0).toFixed(2)
      }
    },
    successRateChart () {
      const trend = this.httpCluster.trend || {}
      const success = trend.success_rate || (trend.error_rate || []).map(item => ({
        timestamp: item.timestamp,
        value: Math.max(0, 100 - Number(item.value || 0))
      }))
      return {
        title: '请求成功率趋势',
        labels: success.map(item => this.time(item.timestamp)),
        keys: ['success'],
        legends: ['成功率 (%)'],
        data: { success: success.map(item => item.value) },
        valueFormatter: value => `${Number(value || 0).toFixed(2)}%`
      }
    },
    statusTrendChart () {
      const trend = this.httpCluster.status_trend || {}
      const codes = Object.keys(trend).sort((a, b) => Number(a) - Number(b))
      const timestamps = [...new Set(codes.reduce((all, code) => all.concat((trend[code] || []).map(item => Number(item.timestamp))), []))].sort((a, b) => a - b)
      const colors = { 200: '#52c41a', 201: '#73d13d', 202: '#95de64', 204: '#13c2c2', 301: '#40a9ff', 302: '#69c0ff', 304: '#91d5ff', 400: '#faad14', 401: '#ffc53d', 403: '#d48806', 404: '#fa8c16', 409: '#d46b08', 422: '#d46b08', 429: '#ad6800', 500: '#f5222d', 502: '#eb2f96', 503: '#cf1322', 504: '#a8071a' }
      const data = {}
      codes.forEach(code => {
        const points = Object.fromEntries((trend[code] || []).map(item => [Number(item.timestamp), Number(item.value || 0)]))
        data[code] = timestamps.map(timestamp => points[timestamp] || 0)
      })
      return {
        title: 'HTTP 状态码随时间变化',
        labels: timestamps.map(timestamp => this.time(timestamp)),
        keys: codes,
        legends: codes,
        data,
        colors: codes.map(code => colors[code] || (code.startsWith('2') ? '#67c23a' : code.startsWith('3') ? '#409eff' : code.startsWith('4') ? '#e6a23c' : code.startsWith('5') ? '#f56c6c' : '#909399'))
      }
    },
    latencyChart () {
      const trend = (this.httpCluster.trend || {})
      const p50 = trend.p50_seconds || []
      return {
        title: '响应时间分位趋势',
        labels: p50.map(item => this.time(item.timestamp)),
        keys: ['p50', 'p95', 'p99'],
        legends: ['P50 (ms)', 'P95 (ms)', 'P99 (ms)'],
        data: {
          p50: p50.map(item => Number(item.value || 0) * 1000),
          p95: (trend.p95_seconds || []).map(item => Number(item.value || 0) * 1000),
          p99: (trend.p99_seconds || []).map(item => Number(item.value || 0) * 1000)
        },
        valueFormatter: value => Number(value || 0).toFixed(1)
      }
    }
  },
  created () {
    this.load()
    this.loadHttp()
    this.loadAlerts()
    this.timer = setInterval(() => { this.load(false); this.loadHttp(false); this.loadAlerts() }, 15000)
  },
  beforeDestroy () { if (this.timer) clearInterval(this.timer) },
  methods: {
    reloadAll () { return Promise.all([this.load(), this.loadHttp(), this.loadAlerts()]) },
    changeRuntime () {
      this.routeKey = null
      return Promise.all([this.load(), this.loadHttp()])
    },
    load (showLoading = true) {
      if (showLoading) this.loading = true
      return projectMonitoring(this.orgId, this.groupId, this.projectId, this.hours, this.runtimeId).then(res => {
        this.data = res.data || this.data
        if (this.runtimeId === null) {
          this.runtimeOptions = [...(this.data.runtimes || [])]
        }
      }).finally(() => { this.loading = false })
    },
    loadHttp (showLoading = true) {
      if (showLoading) this.loading = true
      return projectHttpMonitoring(
        this.orgId,
        this.groupId,
        this.projectId,
        this.hours,
        this.routeKey,
        this.runtimeId
      )
        .then(res => { this.httpData = res.data || this.httpData }).finally(() => { this.loading = false })
    },
    loadAlerts () {
      return projectAlertProfile(this.orgId, this.groupId, this.projectId).then(res => { this.alertData = res.data || this.alertData })
    },
    openAlertSettings () {
      const rule = this.alertData.rule || {}
      this.alertForm = {
        enabled: Boolean(rule.enabled),
        recipients: Array.isArray(rule.recipients) ? [...rule.recipients] : [],
        failure_threshold: Number(rule.failure_threshold || 2),
        cooldown_seconds: Number(rule.cooldown_seconds || 1800),
        notify_recovery: rule.notify_recovery !== false,
        slo_availability_target: Number(rule.slo_availability_target ?? 99.9),
        slo_success_rate_target: 100 - Number(rule.slo_error_rate_max ?? 1),
        slo_p95_ms_max: Number(rule.slo_p95_ms_max ?? 500)
      }
      this.alertDialogVisible = true
    },
    saveAlertSettings () {
      this.alertSaving = true
      const payload = {
        ...this.alertForm,
        slo_error_rate_max: Math.max(0, 100 - Number(this.alertForm.slo_success_rate_target || 0))
      }
      projectAlertSave(this.orgId, this.groupId, this.projectId, payload).then(res => {
        this.alertData.rule = res.data.rule
        this.alertDialogVisible = false
        this.$message.success('告警设置已保存')
      }).finally(() => { this.alertSaving = false })
    },
    runtimeLabel (runtime) {
      const provider = runtime.orchestrator_type === 'kubernetes' ? 'K8s' : 'Swarm'
      const environment = runtime.env ? runtime.env.title : `环境 #${runtime.env_id}`
      return `${runtime.name} · ${environment} · ${provider}`
    },
    number (value) { return Number(value || 0).toFixed(2).replace(/\.00$/, '') },
    bytes (value) {
      let size = Number(value || 0)
      const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
      let index = 0
      while (size >= 1024 && index < units.length - 1) { size /= 1024; index++ }
      return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
    },
    time (timestamp) { return new Date(Number(timestamp) * 1000).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    routeLabel (route) {
      const source = route.route_source === 'gateway' ? '网关 VHost' : '项目 Route'
      const provider = route.orchestrator_type === 'kubernetes' ? 'K8s' : 'Swarm'
      const metrics = route.metrics_available ? '' : ' · 暂无请求指标'
      return `${route.hostname}${route.path_prefix === '/' ? '' : route.path_prefix} · ${provider} · ${source}${metrics}`
    }
  }
}
</script>

<style lang="scss" scoped>
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.page-heading > div { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.runtime-select { width: 270px; }
.range-select { width: 140px; margin-right: 8px; }
.route-select { width: 340px; }
.metric-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
.runtime-metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.section-note { margin: -4px 0 12px; color: #909399; font-size: 12px; }
.section-note a { color: #409eff; }
.alert-toolbar { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding: 12px 14px; border: 1px solid #e4e7ed; border-radius: 6px; background: #fff; }
.alert-state { display: inline-block; margin: 0 0 0 10px; }
.form-tip { margin-top: 6px; color: #909399; font-size: 12px; line-height: 1.5; }
.form-tip.inline { margin-left: 8px; }
.chart-row { margin-top: 20px; }
.chart-card { min-height: 308px; padding: 14px; border: 1px solid #e4e7ed; border-radius: 6px; background: #fff; }
.disk-empty-note { color: #909399; font-size: 12px; }
.breakdown-row { margin-top: 20px; }
.breakdown-card { padding: 12px 14px 14px; border: 1px solid #e4e7ed; border-radius: 6px; background: #fff; }
.http-note { margin: 10px 2px 0; }
.secondary { margin-top: 3px; color: #909399; font-size: 12px; }
@media (max-width: 1500px) { .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
