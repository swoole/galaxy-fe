<template>
  <div class="project-container swarm-overview" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />

    <div class="project-main">
      <div class="page-heading">
        <easy-title title="Docker Swarm 集群概览" margin-set="0 20" />
        <div class="page-actions">
          <span v-if="overview.generated_at" class="updated-at">
            更新于 {{ formatTimestamp(overview.generated_at) }}
          </span>
          <el-button type="primary" size="small" icon="el-icon-refresh" :loading="loading" @click="loadOverview">
            刷新
          </el-button>
        </div>
      </div>

      <el-card shadow="never" class="core-components-card">
        <div slot="header" class="core-components-header">
          <span>集群核心组件完整性</span>
          <el-tag size="small" :type="coreComponentsStatusType">
            {{ coreComponentsStatusText }}
          </el-tag>
        </div>
        <div class="core-components-grid">
          <div class="core-component">
            <div>
              <strong>Traefik Web 网关</strong>
              <div class="core-component-description">承载集群 HTTP/HTTPS 流量入口与服务发现</div>
            </div>
            <div class="core-component-status">
              <el-tag size="small" :type="componentStatusType(webGatewayInstalled, webGatewayRuntime)">
                {{ componentStatusText(webGatewayInstalled, webGatewayRuntime) }}
              </el-tag>
              <span v-if="webGatewayInstalled" class="runtime-count">
                {{ webGatewayRuntime.running || 0 }} / {{ webGatewayRuntime.desired || 0 }} 运行
              </span>
            </div>
          </div>
          <div class="core-component">
            <div>
              <strong>Prometheus</strong>
              <div class="core-component-description">采集并存储集群资源与 Web 请求指标</div>
            </div>
            <div class="core-component-status">
              <el-tag size="small" :type="componentStatusType(prometheusInstalled, prometheusRuntime)">
                {{ componentStatusText(prometheusInstalled, prometheusRuntime) }}
              </el-tag>
              <span v-if="prometheusInstalled" class="runtime-count">
                {{ prometheusRuntime.running || 0 }} / {{ prometheusRuntime.desired || 0 }} 运行
              </span>
            </div>
          </div>
        </div>
        <el-alert
          v-if="coreComponentsWarning"
          class="core-components-warning"
          type="warning"
          :closable="false"
          show-icon
          title="集群核心组件尚不完整">
          <div class="core-components-warning-content">
            <span>{{ coreComponentsWarning }}</span>
            <el-button type="warning" plain size="small" @click="openWebGateway">前往安装配置</el-button>
          </div>
        </el-alert>
      </el-card>

      <el-alert
        v-if="errorMessage"
        class="section-gap"
        type="error"
        title="无法读取集群信息"
        :description="errorMessage"
        show-icon
        :closable="false" />

      <el-alert
        v-if="sectionErrors.length"
        class="section-gap"
        type="warning"
        title="部分指标加载失败"
        :description="sectionErrors.join('；')"
        show-icon
        :closable="false" />

      <template v-if="loaded">
        <el-alert
          v-for="(warning, index) in overview.engine.warnings"
          :key="`warning-${index}`"
          class="section-gap"
          type="warning"
          :title="warning"
          show-icon
          :closable="false" />

        <el-row :gutter="16" class="metric-grid">
          <el-col v-for="metric in summaryMetrics" :key="metric.title" :xs="12" :sm="8" :lg="4">
            <el-card shadow="hover" class="metric-card">
              <div class="metric-title">{{ metric.title }}</div>
              <div class="metric-value">{{ metric.value }}</div>
              <div class="metric-detail">{{ metric.detail }}</div>
            </el-card>
          </el-col>
        </el-row>

        <easy-title title="资源容量与用量" margin-set="24 16" />
        <el-row :gutter="16">
          <el-col :xs="24" :lg="8">
            <el-card shadow="never" class="resource-card">
              <div class="resource-title">CPU 预留</div>
              <el-progress
                :percentage="progressPercentage(overview.resources.cpu_reserved_percentage)"
                :status="progressStatus(overview.resources.cpu_reserved_percentage)" />
              <div class="resource-detail">
                Service 已声明 {{ formatNumber(overview.resources.cpu_reserved) }} / 集群容量 {{ formatNumber(overview.resources.cpu_capacity) }} Core
                （{{ formatNumber(overview.resources.cpu_reserved_percentage) }}%）
              </div>
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="8">
            <el-card shadow="never" class="resource-card">
              <div class="resource-title">内存预留</div>
              <el-progress
                :percentage="progressPercentage(overview.resources.memory_reserved_percentage)"
                :status="progressStatus(overview.resources.memory_reserved_percentage)" />
              <div class="resource-detail">
                Service 已声明 {{ formatBytes(overview.resources.memory_reserved) }} / 集群容量 {{ formatBytes(overview.resources.memory_capacity) }}
                （{{ formatNumber(overview.resources.memory_reserved_percentage) }}%）
              </div>
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="8">
            <el-card shadow="never" class="resource-card">
              <div class="resource-title">当前 Manager 本机容器</div>
              <div class="local-resource">
                {{ formatNumber(overview.resources.manager_container_cpu_cores) }} Core ·
                {{ formatBytes(overview.resources.manager_container_memory) }} 内存
              </div>
              <div class="resource-detail">实时统计仅覆盖当前连接的 Manager，不代表所有 Swarm 节点的实际使用量。</div>
            </el-card>
          </el-col>
        </el-row>

        <easy-title title="资源实时利用率（近 1 小时）" margin-set="24 16" />
        <el-alert
          v-if="utilizationError"
          class="section-gap"
          type="info"
          :closable="false"
          title="实时利用率暂不可用"
          :description="utilizationError" />
        <el-row v-else :gutter="16" class="section-gap">
          <el-col :xs="24" :lg="8">
            <el-card shadow="never" class="util-card">
              <monitor-line-chart v-if="utilization.cpu" :chart-data="utilization.cpu" height="260px" />
              <div v-else class="empty-text">{{ utilizationLoading ? '加载中…' : '无数据' }}</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="8">
            <el-card shadow="never" class="util-card">
              <monitor-line-chart v-if="utilization.mem" :chart-data="utilization.mem" height="260px" />
              <div v-else class="empty-text">{{ utilizationLoading ? '加载中…' : '无数据' }}</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="8">
            <el-card shadow="never" class="util-card">
              <monitor-line-chart v-if="utilization.disk" :chart-data="utilization.disk" height="260px" />
              <div v-else class="empty-text">{{ utilizationLoading ? '加载中…' : '无数据' }}</div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16" class="section-gap">
          <el-col :xs="24" :lg="12">
            <el-card shadow="never" class="detail-card">
              <div slot="header" class="card-header">Swarm 集群</div>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="Swarm ID">{{ shortId(overview.cluster.id, 20) }}</el-descriptions-item>
                <el-descriptions-item label="集群名称">{{ overview.cluster.name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Manager API">{{ overview.connection.endpoint }}</el-descriptions-item>
                <el-descriptions-item label="管理通道">{{ transportLabel(overview.connection.transport) }}</el-descriptions-item>
                <el-descriptions-item label="API 版本">{{ overview.connection.api_version || '-' }}（最低 {{ overview.connection.min_api_version || '-' }}）</el-descriptions-item>
                <el-descriptions-item label="本机节点地址">{{ overview.cluster.local_node_address || '-' }}</el-descriptions-item>
                <el-descriptions-item label="请求耗时">{{ overview.connection.latency_ms }} ms</el-descriptions-item>
                <el-descriptions-item label="Manager Quorum">
                  <el-tag size="mini" :type="overview.cluster.manager_quorum_healthy ? 'success' : 'danger'">
                    {{ overview.cluster.managers_reachable || 0 }} 可达 / 至少 {{ overview.cluster.manager_quorum_required || 0 }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="Root CA 轮换">{{ overview.cluster.root_rotation_in_progress ? '进行中' : '未进行' }}</el-descriptions-item>
                <el-descriptions-item label="任务历史保留">{{ displayValue(overview.cluster.task_history_retention) }}</el-descriptions-item>
                <el-descriptions-item label="调度心跳">{{ displayValue(overview.cluster.dispatcher_heartbeat_seconds, ' 秒') }}</el-descriptions-item>
                <el-descriptions-item label="节点证书有效期">{{ displayValue(overview.cluster.node_cert_expiry_days, ' 天') }}</el-descriptions-item>
                <el-descriptions-item label="Manager 自动锁定">{{ yesNo(overview.cluster.autolock_managers) }}</el-descriptions-item>
                <el-descriptions-item label="默认地址池">{{ formatList(overview.cluster.default_address_pool) }}</el-descriptions-item>
                <el-descriptions-item label="Data Path 端口">{{ overview.cluster.data_path_port || '-' }}</el-descriptions-item>
                <el-descriptions-item label="创建时间">{{ formatDate(overview.cluster.created_at) }}</el-descriptions-item>
                <el-descriptions-item label="更新时间">{{ formatDate(overview.cluster.updated_at) }}</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="12">
            <el-card shadow="never" class="detail-card">
              <div slot="header" class="card-header">Docker Engine</div>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="主机名">{{ overview.engine.name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Docker 版本">{{ overview.engine.version || '-' }}</el-descriptions-item>
                <el-descriptions-item label="操作系统">{{ overview.engine.operating_system || '-' }} {{ overview.engine.os_version }}</el-descriptions-item>
                <el-descriptions-item label="内核">{{ overview.engine.kernel_version || '-' }}</el-descriptions-item>
                <el-descriptions-item label="架构">{{ overview.engine.architecture || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Go 版本">{{ overview.engine.go_version || '-' }}</el-descriptions-item>
                <el-descriptions-item label="存储驱动">{{ overview.engine.storage_driver || '-' }}</el-descriptions-item>
                <el-descriptions-item label="日志驱动">{{ overview.engine.logging_driver || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Cgroup">v{{ overview.engine.cgroup_version || '-' }} / {{ overview.engine.cgroup_driver || '-' }}</el-descriptions-item>
                <el-descriptions-item label="默认 Runtime">{{ overview.engine.default_runtime || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Docker Root">{{ overview.engine.docker_root_dir || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Live Restore">{{ yesNo(overview.engine.live_restore_enabled) }}</el-descriptions-item>
                <el-descriptions-item label="安全选项" :span="2">{{ formatList(overview.engine.security_options) }}</el-descriptions-item>
                <el-descriptions-item label="Registry Mirrors" :span="2">{{ formatList(overview.engine.registry_mirrors) }}</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
        </el-row>

        <easy-title title="节点" margin-set="24 16" />
        <el-table :data="overview.nodes" border stripe empty-text="该 Swarm 暂无节点">
          <el-table-column label="节点" min-width="180">
            <template #default="{ row }">
              <strong>{{ row.hostname || shortId(row.id) }}</strong>
              <el-tag v-if="row.leader" size="mini" type="success">Leader</el-tag>
              <div class="muted mono">{{ shortId(row.id, 16) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="角色" prop="role" width="90" />
          <el-table-column label="状态" width="130">
            <template #default="{ row }">
              <el-tag size="mini" :type="row.state === 'ready' ? 'success' : 'danger'">{{ row.state || '-' }}</el-tag>
              <span class="muted"> / {{ row.availability || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Manager" min-width="145">
            <template #default="{ row }">{{ row.reachability || '-' }}<div class="muted">{{ row.manager_address || '-' }}</div></template>
          </el-table-column>
          <el-table-column label="节点地址" prop="address" min-width="130" />
          <el-table-column label="CPU" width="90">
            <template #default="{ row }">{{ formatNumber(row.cpu_cores) }} Core</template>
          </el-table-column>
          <el-table-column label="内存" width="110">
            <template #default="{ row }">{{ formatBytes(row.memory_bytes) }}</template>
          </el-table-column>
          <el-table-column label="平台 / Engine" min-width="160">
            <template #default="{ row }">{{ row.os }}/{{ row.architecture }}<div class="muted">{{ row.engine_version }}</div></template>
          </el-table-column>
          <el-table-column label="标签" min-width="160">
            <template #default="{ row }">{{ formatLabels(row.labels) }}</template>
          </el-table-column>
        </el-table>

        <el-row :gutter="16" class="section-gap bottom-gap">
          <el-col :xs="24" :lg="12">
            <el-card shadow="never" class="chart-card">
              <div slot="header" class="card-header">任务状态分布</div>
              <monitor-pie-chart v-if="taskPieData.length" title="Task 状态" :data="taskPieData" height="280px" />
              <div v-else class="empty-text">暂无 Task</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="12">
            <el-card shadow="never">
              <div slot="header" class="card-header">当前 Manager Docker 磁盘占用</div>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="镜像层">{{ formatBytes(overview.storage.layers_bytes) }}</el-descriptions-item>
                <el-descriptions-item label="容器可写层">{{ formatBytes(overview.storage.containers_writable_bytes) }}</el-descriptions-item>
                <el-descriptions-item label="Volumes">{{ formatBytes(overview.storage.volumes_bytes) }}</el-descriptions-item>
                <el-descriptions-item label="构建缓存">{{ formatBytes(overview.storage.build_cache_bytes) }}</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
        </el-row>
      </template>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import EasyTitle from '@/views/components/EasyTitle'
import MonitorPieChart from '@/views/components/Chart/MonitorPieChart.vue'
import MonitorLineChart from '@/views/components/Chart/MonitorLineChart.vue'
import { clusterSwarmOverviewCore, clusterSwarmOverviewTopology, clusterSwarmOverviewRuntime, clusterSwarmWebGateway, clusterSwarmPrometheus, clusterSwarmPrometheusQuery } from '@/api/cluster'
import { routeBreadcrumb } from '@/utils/helpers'

const emptyOverview = () => ({
  generated_at: 0,
  connection: {},
  cluster: {},
  resources: {},
  counts: {},
  engine: { warnings: [] },
  storage: {},
  task_states: {},
  nodes: [],
  services: [],
  containers: [],
  networks: [],
  volumes: []
})

export default {
  name: 'ClusterSwarmOverview',
  components: {
    Breadcrumb,
    EasyTitle,
    MonitorPieChart,
    MonitorLineChart
  },
  props: {
    orgId: {
      type: [Number, String],
      required: true
    },
    clusterId: {
      type: Number,
      required: true
    },
    cluster: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      loading: false,
      requestPending: false,
      loaded: false,
      errorMessage: '',
      sectionErrors: [],
      refreshTimer: null,
      overview: emptyOverview(),
      utilization: { cpu: null, mem: null, disk: null },
      utilizationLoading: false,
      utilizationError: '',
      webGatewayInstalled: null,
      webGatewayRuntime: { desired: 0, running: 0, failed: 0, tasks: [] },
      webGatewayStatusRequest: null,
      prometheusInstalled: null,
      prometheusRuntime: { desired: 0, running: 0, failed: 0, tasks: [] },
      prometheusStatusRequest: null
    }
  },
  computed: {
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: this.$route.meta.title, to: '' }
      ]
    },
    summaryMetrics () {
      const counts = this.overview.counts
      const cluster = this.overview.cluster
      return [
        { title: '节点', value: `${counts.nodes_ready || 0} / ${counts.nodes_total || 0}`, detail: `Manager ${cluster.managers || 0} · Worker ${cluster.workers || 0}` },
        { title: 'Services', value: `${counts.services_healthy || 0} / ${counts.services_total || 0}`, detail: `异常 ${counts.services_degraded || 0}` },
        { title: 'Tasks', value: counts.tasks_running || 0, detail: `总计 ${counts.tasks_total || 0} · 失败 ${counts.tasks_failed || 0}` },
        { title: '容器（本机）', value: counts.containers_running || 0, detail: `总计 ${counts.containers_total || 0} · 停止 ${counts.containers_stopped || 0}` },
        { title: 'Configs', value: counts.configs || 0, detail: `配置项` },
        { title: 'Secrets', value: counts.secrets || 0, detail: `密钥项` },
        { title: '镜像', value: counts.images || 0, detail: `网络 ${counts.networks || 0}` },
        { title: 'Volumes（本机）', value: counts.volumes || 0, detail: `不可用节点 ${counts.nodes_unavailable || 0}` }
      ]
    },
    taskStates () {
      return Object.keys(this.overview.task_states).map(state => ({
        state,
        count: this.overview.task_states[state]
      }))
    },
    taskPieData () {
      return this.taskStates.map(item => ({ name: item.state, value: item.count }))
    },
    coreComponentsStatusText () {
      if (this.webGatewayInstalled === null || this.prometheusInstalled === null) return '检查中'
      const installed = Number(this.webGatewayInstalled) + Number(this.prometheusInstalled)
      return installed === 2 ? '2 / 2 已安装' : `${installed} / 2 已安装`
    },
    coreComponentsStatusType () {
      if (this.webGatewayInstalled === null || this.prometheusInstalled === null) return 'info'
      return this.webGatewayInstalled && this.prometheusInstalled ? 'success' : 'warning'
    },
    coreComponentsWarning () {
      if (this.webGatewayInstalled === null || this.prometheusInstalled === null) return ''
      const missing = []
      if (!this.webGatewayInstalled) missing.push('Traefik Web 网关')
      if (!this.prometheusInstalled) missing.push('Prometheus')
      if (missing.length) return `尚未安装 ${missing.join('、')}，域名路由、流量入口或监控指标功能将不可用。请尽快完成安装。`
      const unhealthy = []
      if (!this.componentHealthy(this.webGatewayInstalled, this.webGatewayRuntime)) unhealthy.push('Traefik Web 网关')
      if (!this.componentHealthy(this.prometheusInstalled, this.prometheusRuntime)) unhealthy.push('Prometheus')
      return unhealthy.length ? `${unhealthy.join('、')}尚未达到期望运行副本数，请尽快检查。` : ''
    }
  },
  created () {
    this.loadOverview()
    this.refreshTimer = window.setInterval(() => this.loadOverview(true), 30000)
  },
  beforeDestroy () {
    window.clearInterval(this.refreshTimer)
  },
  methods: {
    loadOverview (silent = false) {
      if (this.requestPending) return
      this.requestPending = true
      if (!silent) this.loading = true
      this.errorMessage = ''
      this.sectionErrors = []
      const core = this.loadOverviewSection('核心信息', clusterSwarmOverviewCore(this.orgId, this.clusterId), true)
        .finally(() => { this.loading = false })
      const topology = this.loadOverviewSection('节点、Service 和 Task', clusterSwarmOverviewTopology(this.orgId, this.clusterId))
      const runtime = this.loadOverviewSection('容器实时指标和存储', clusterSwarmOverviewRuntime(this.orgId, this.clusterId))
      const coreComponents = this.loadCoreComponents(!silent)
      Promise.all([core, topology, runtime, coreComponents].map(promise => promise.catch(() => null))).finally(() => {
        this.loading = false
        this.requestPending = false
        this.loadUtilization(false)
      })
    },
    loadOverviewSection (name, promise, critical = false) {
      return promise.then(res => {
        this.mergeOverview(res.data.overview || {})
        this.loaded = true
      }).catch(error => {
        const message = error.message || `${name}加载失败`
        if (critical) this.errorMessage = message
        else this.sectionErrors.push(`${name}：${message}`)
        throw error
      })
    },
    mergeOverview (section) {
      Object.keys(section).forEach(key => {
        const value = section[key]
        if (key === 'generated_at') {
          this.overview.generated_at = Math.max(Number(this.overview.generated_at) || 0, Number(value) || 0)
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          this.overview[key] = Object.assign({}, this.overview[key] || {}, value)
        } else {
          this.overview[key] = value
        }
      })
    },
    progressPercentage (value) {
      return Math.max(0, Math.min(100, Number(value) || 0))
    },
    progressStatus (value) {
      if (Number(value) >= 90) return 'exception'
      if (Number(value) >= 75) return 'warning'
      return 'success'
    },
    loadCoreComponents (refresh = false) {
      return Promise.all([
        this.loadWebGatewayStatus(refresh),
        this.loadPrometheusStatus(refresh)
      ])
    },
    loadWebGatewayStatus (refresh = false) {
      if (!refresh && this.webGatewayInstalled !== null) return Promise.resolve(this.webGatewayInstalled)
      if (this.webGatewayStatusRequest) return this.webGatewayStatusRequest
      this.webGatewayStatusRequest = clusterSwarmWebGateway(this.orgId, this.clusterId)
        .then(res => {
          this.webGatewayInstalled = Boolean(res.data && res.data.installed)
          this.webGatewayRuntime = (res.data && res.data.runtime) || this.webGatewayRuntime
          return this.webGatewayInstalled
        })
        .finally(() => { this.webGatewayStatusRequest = null })
      return this.webGatewayStatusRequest
    },
    loadPrometheusStatus (refresh = false) {
      if (!refresh && this.prometheusInstalled !== null) return Promise.resolve(this.prometheusInstalled)
      if (this.prometheusStatusRequest) return this.prometheusStatusRequest
      this.prometheusStatusRequest = clusterSwarmPrometheus(this.orgId, this.clusterId)
        .then(res => {
          this.prometheusInstalled = Boolean(res.data && res.data.installed)
          this.prometheusRuntime = (res.data && res.data.runtime) || this.prometheusRuntime
          return this.prometheusInstalled
        })
        .finally(() => { this.prometheusStatusRequest = null })
      return this.prometheusStatusRequest
    },
    componentHealthy (installed, runtime) {
      if (!installed) return false
      const desired = Number(runtime && runtime.desired) || 0
      const running = Number(runtime && runtime.running) || 0
      return desired > 0 && running >= desired
    },
    componentStatusText (installed, runtime) {
      if (installed === null) return '检查中'
      if (!installed) return '未安装'
      return this.componentHealthy(installed, runtime) ? '运行正常' : '运行异常'
    },
    componentStatusType (installed, runtime) {
      if (installed === null) return 'info'
      if (!installed) return 'warning'
      return this.componentHealthy(installed, runtime) ? 'success' : 'danger'
    },
    openWebGateway () {
      this.$router.push({ name: 'ClusterSwarmSettings', params: { clusterId: this.clusterId } })
    },
    loadUtilization (refreshPrometheusStatus = false) {
      if (this.utilizationLoading) return
      this.utilizationLoading = true
      const queries = {
        cpu: '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
        mem: '(1 - avg(node_memory_MemAvailable_bytes) / avg(node_memory_MemTotal_bytes)) * 100',
        disk: '(1 - avg(node_filesystem_avail_bytes{fstype!~"tmpfs|overlay|devtmpfs",mountpoint="/"}) / avg(node_filesystem_size_bytes{fstype!~"tmpfs|overlay|devtmpfs",mountpoint="/"})) * 100'
      }
      this.loadPrometheusStatus(refreshPrometheusStatus)
        .then(installed => {
          if (!installed) {
            this.utilization.cpu = this.utilization.mem = this.utilization.disk = null
            this.utilizationError = '该集群尚未部署 Prometheus，已关闭实时利用率图表。'
            return null
          }
          return clusterSwarmPrometheusQuery(this.orgId, this.clusterId, queries, '1h', 60)
        })
        .then(res => {
          if (!res) return
          const results = (res.data && res.data.results) || {}
          this.utilization.cpu = this.buildLineChart('集群 CPU 使用率', results.cpu, '%')
          this.utilization.mem = this.buildLineChart('集群内存使用率', results.mem, '%')
          this.utilization.disk = this.buildLineChart('集群磁盘使用率', results.disk, '%')
          this.utilizationError = ''
        })
        .catch(error => {
          this.utilization.cpu = this.utilization.mem = this.utilization.disk = null
          this.utilizationError = error.message || '无法加载实时监控数据'
        })
        .finally(() => { this.utilizationLoading = false })
    },
    buildLineChart (title, result, unit) {
      const series = (result && result.result && result.result[0]) ? result.result[0].values : []
      return {
        title,
        keys: ['value'],
        legends: [title],
        labels: series.map(point => this.formatClock(Number(point[0]))),
        data: { value: series.map(point => Number(Number(point[1]).toFixed(2))) },
        valueFormatter: value => `${value}${unit}`
      }
    },
    formatClock (timestamp) {
      const date = new Date(timestamp * 1000)
      if (Number.isNaN(date.getTime())) return ''
      const pad = n => String(n).padStart(2, '0')
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`
    },
    formatNumber (value) {
      const number = Number(value) || 0
      return Number.isInteger(number) ? number : number.toFixed(2)
    },
    transportLabel (transport) {
      return transport === 'agent' ? 'Galaxy Agent 节点通道' : transport || 'Galaxy Agent 节点通道'
    },
    formatBytes (value) {
      let bytes = Number(value) || 0
      if (bytes <= 0) return '0 B'
      const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
      const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
      bytes /= Math.pow(1024, index)
      return `${bytes.toFixed(index === 0 ? 0 : 2)} ${units[index]}`
    },
    formatDate (value) {
      if (!value) return '-'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
    },
    formatTimestamp (value) {
      return this.formatDate(Number(value) * 1000)
    },
    shortId (value, length = 12) {
      if (!value) return '-'
      return String(value).slice(0, length)
    },
    formatList (value) {
      return Array.isArray(value) && value.length ? value.join(', ') : '-'
    },
    formatLabels (labels) {
      if (!labels || !Object.keys(labels).length) return '-'
      return Object.keys(labels).map(key => `${key}=${labels[key]}`).join(', ')
    },
    displayValue (value, suffix = '') {
      return value === null || value === undefined || value === '' ? '-' : `${value}${suffix}`
    },
    yesNo (value) {
      return value ? '是' : '否'
    },
    containerStateType (state) {
      if (state === 'running') return 'success'
      if (state === 'paused') return 'warning'
      return 'info'
    },
    taskStateType (state) {
      if (state === 'running' || state === 'complete') return 'success'
      if (['failed', 'rejected', 'orphaned'].includes(state)) return 'danger'
      return 'info'
    }
  }
}
</script>

<style lang="scss" scoped>
.swarm-overview {
  .project-main {
    padding-bottom: 30px;
  }
  .page-heading {
    position: relative;
    .page-actions {
      position: absolute;
      top: 0;
      right: 0;
    }
    .updated-at {
      margin-right: 12px;
      color: #909399;
      font-size: 13px;
    }
    .el-button + .el-button {
      margin-left: 8px;
    }
  }
  .section-gap {
    margin-top: 16px;
  }
  .core-components-card {
    margin-top: 18px;
  }
  .core-components-header,
  .core-component,
  .core-component-status,
  .core-components-warning-content {
    display: flex;
    align-items: center;
  }
  .core-components-header,
  .core-component,
  .core-components-warning-content {
    justify-content: space-between;
  }
  .core-components-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .core-component {
    padding: 16px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
  }
  .core-component-description,
  .runtime-count {
    color: #909399;
    font-size: 13px;
  }
  .core-component-description {
    margin-top: 6px;
  }
  .core-component-status {
    flex-shrink: 0;
    margin-left: 16px;
  }
  .runtime-count {
    margin-left: 8px;
  }
  .core-components-warning {
    margin-top: 16px;
  }
  .core-components-warning-content {
    gap: 16px;
  }
  @media (max-width: 767px) {
    .core-components-grid {
      grid-template-columns: 1fr;
    }
    .core-components-warning-content {
      align-items: flex-start;
      flex-direction: column;
    }
  }
  .bottom-gap {
    margin-bottom: 40px;
  }
  .metric-grid {
    margin-top: 18px;
  }
  .metric-card {
    margin-bottom: 16px;
    min-height: 126px;
    .metric-title {
      color: #909399;
      font-size: 14px;
    }
    .metric-value {
      margin: 10px 0 8px;
      color: #303133;
      font-size: 28px;
      font-weight: 600;
    }
    .metric-detail {
      color: #606266;
      font-size: 12px;
    }
  }
  .resource-card {
    min-height: 150px;
    margin-bottom: 16px;
    .resource-title {
      margin-bottom: 18px;
      color: #303133;
      font-weight: 600;
    }
    .resource-detail {
      margin-top: 14px;
      color: #606266;
      font-size: 12px;
      line-height: 1.6;
    }
    .local-resource {
      margin: 8px 0;
      color: #409eff;
      font-size: 21px;
      font-weight: 600;
    }
  }
  .detail-card {
    min-height: 430px;
    margin-bottom: 16px;
  }
  .card-header {
    color: #303133;
    font-weight: 600;
  }
  .chart-card {
    min-height: 360px;
    margin-bottom: 16px;
  }
  .util-card {
    min-height: 300px;
    margin-bottom: 16px;
  }
  .muted {
    margin-top: 3px;
    color: #909399;
    font-size: 12px;
  }
  .mono {
    font-family: Consolas, Monaco, monospace;
  }
  .table-note {
    margin-bottom: 12px;
  }
  .tag-list .el-tag {
    margin: 0 8px 8px 0;
  }
  .stack-service-tag {
    margin: 0 6px 6px 0;
  }
  .empty-text {
    padding: 20px;
    color: #909399;
    text-align: center;
  }
}
</style>
