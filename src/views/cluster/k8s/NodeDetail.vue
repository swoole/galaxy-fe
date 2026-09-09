<template>
  <div class="project-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <div class="project-main">
      <div class="heading">
        <easy-title :title="node.name || '节点详情'" margin-set="0" />
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
      </div>

      <el-alert
        v-if="error"
        class="section"
        type="error"
        :closable="false"
        show-icon
        :title="error" />

      <template v-if="loaded">
        <el-tabs v-model="activeTab" class="section" @tab-click="onTabClick">
          <!-- 概览 -->
          <el-tab-pane label="概览" name="overview">
            <el-row :gutter="16">
              <el-col :xs="24" :lg="12">
                <div class="block">
                  <easy-title :level="'h4'">基本信息</easy-title>
                  <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="状态">
                      <el-tag size="small" :type="node.ready ? 'success' : 'danger'">{{ node.ready ? 'Ready' : 'NotReady' }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="角色">{{ (node.roles || []).join(', ') || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="可调度">{{ node.unschedulable ? '否（已封锁）' : '是' }}</el-descriptions-item>
                    <el-descriptions-item label="Kubelet 版本">{{ node.kubelet_version || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="容器运行时">{{ node.container_runtime || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="操作系统">{{ node.os_image || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="架构">{{ node.architecture || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="创建时间">{{ formatK8sDate(node.created_at) }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </el-col>
              <el-col :xs="24" :lg="12">
                <div class="block">
                  <easy-title :level="'h4'">地址</easy-title>
                  <el-table :data="node.addresses || []" size="small" border fit>
                    <el-table-column label="类型" prop="type" width="160" />
                    <el-table-column label="地址" prop="address" />
                  </el-table>
                </div>
              </el-col>
            </el-row>
          </el-tab-pane>

          <!-- 资源 -->
          <el-tab-pane label="资源" name="resources">
            <div class="block">
              <easy-title :level="'h4'">资源容量 / 可分配</easy-title>
              <el-table :data="resourceRows" size="small" border fit class="table">
                <el-table-column label="资源" prop="key" width="160" />
                <el-table-column label="容量">
                  <template #default="{ row }">{{ formatValue(row.capacity) }}</template>
                </el-table-column>
                <el-table-column label="可分配">
                  <template #default="{ row }">{{ formatValue(row.allocatable) }}</template>
                </el-table-column>
                <el-table-column label="使用率" min-width="220">
                  <template #default="{ row }">
                    <usage-bar
                      v-if="nodeUsage && nodeUsage[row.key]"
                      :value="nodeUsage[row.key].percent"
                      :used-text="nodeUsage[row.key].usedText"
                      :all-text="nodeUsage[row.key].allText" />
                    <span v-else class="cell-sub">N/A</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <!-- 状态 -->
          <el-tab-pane label="状态" name="status">
            <el-row :gutter="16">
              <el-col :xs="24" :lg="12">
                <div class="block">
                  <easy-title :level="'h4'">Conditions</easy-title>
                  <el-table :data="node.conditions || []" size="small" border fit>
                    <el-table-column label="类型" prop="type" width="150" />
                    <el-table-column label="状态" width="90" align="center">
                      <template #default="{ row }"><el-tag size="small" :type="row.status === 'True' ? 'success' : 'danger'">{{ row.status }}</el-tag></template>
                    </el-table-column>
                    <el-table-column label="原因" prop="reason" width="160" />
                    <el-table-column label="消息" prop="message" show-overflow-tooltip />
                    <el-table-column label="最后切换" width="180">
                      <template #default="{ row }">{{ formatK8sDate(row.last_transition_time) }}</template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-col>
              <el-col :xs="24" :lg="12">
                <div class="block">
                  <easy-title :level="'h4'">Taints</easy-title>
                  <el-table :data="node.taints || []" size="small" border fit>
                    <el-table-column label="Key" prop="key" />
                    <el-table-column label="Value" prop="value" />
                    <el-table-column label="Effect" prop="effect" width="140" />
                  </el-table>
                  <div v-if="!(node.taints || []).length" class="empty">无 Taint</div>
                </div>
              </el-col>
            </el-row>
          </el-tab-pane>

          <!-- 系统信息 -->
          <el-tab-pane label="系统信息" name="system">
            <div class="block">
              <easy-title :level="'h4'">系统信息</easy-title>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="主机名">{{ node.node_info.hostname || '-' }}</el-descriptions-item>
                <el-descriptions-item label="内核版本">{{ node.node_info.kernel_version || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Kubelet">{{ node.node_info.kubelet_version || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Kube-Proxy">{{ node.node_info.kube_proxy_version || '-' }}</el-descriptions-item>
                <el-descriptions-item label="容器运行时">{{ node.node_info.container_runtime_version || '-' }}</el-descriptions-item>
                <el-descriptions-item label="操作系统">{{ node.node_info.operating_system || '-' }}</el-descriptions-item>
                <el-descriptions-item label="架构">{{ node.node_info.architecture || '-' }}</el-descriptions-item>
                <el-descriptions-item label="System UUID">{{ node.node_info.system_uuid || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>

          <!-- 标签与注解 -->
          <el-tab-pane label="标签与注解" name="meta">
            <el-row :gutter="16">
              <el-col :xs="24" :lg="12">
                <div class="block">
                  <easy-title :level="'h4'">标签</easy-title>
                  <div v-if="Object.keys(node.labels || {}).length">
                    <el-tag v-for="(value, key) in node.labels" :key="key" size="small" class="tag">{{ key }}={{ value }}</el-tag>
                  </div>
                  <span v-else class="cell-sub">-</span>
                </div>
              </el-col>
              <el-col :xs="24" :lg="12">
                <div class="block">
                  <easy-title :level="'h4'">注解</easy-title>
                  <div v-if="Object.keys(node.annotations || {}).length">
                    <el-tag v-for="(value, key) in node.annotations" :key="key" size="small" class="tag">{{ key }}={{ value }}</el-tag>
                  </div>
                  <span v-else class="cell-sub">-</span>
                </div>
              </el-col>
            </el-row>
          </el-tab-pane>

          <!-- 镜像 -->
          <el-tab-pane label="镜像" name="images">
            <div class="block">
              <easy-title :level="'h4'">运行时镜像（{{ (node.images || []).length }}）</easy-title>
              <div v-if="(node.images || []).length">
                <div v-for="image in node.images" :key="image" class="image">{{ image }}</div>
              </div>
              <span v-else class="cell-sub">-</span>
            </div>
          </el-tab-pane>

          <!-- 事件 -->
          <el-tab-pane label="事件" name="events">
            <div class="events-toolbar">
              <el-select v-model="eventType" size="small" class="events-type" @change="loadEvents">
                <el-option label="全部类型" value="" />
                <el-option label="Normal" value="Normal" />
                <el-option label="Warning" value="Warning" />
              </el-select>
              <el-input
                v-model="eventKeyword"
                size="small"
                clearable
                class="events-search"
                placeholder="搜索原因 / 消息"
                prefix-icon="el-icon-search" />
            </div>
            <el-table v-loading="eventsLoading" :data="displayEvents" size="small" border fit class="table">
              <el-table-column label="类型" width="100" align="center">
                <template #default="{ row }">
                  <el-tag size="small" :type="row.type === 'Warning' ? 'warning' : 'success'">{{ row.type }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="原因" prop="reason" width="180" />
              <el-table-column label="对象" min-width="200">
                <template #default="{ row }">
                  <strong>{{ row.involved_name }}</strong>
                  <div class="secondary">{{ row.involved_kind }}<template v-if="row.involved_namespace"> · {{ row.involved_namespace }}</template></div>
                </template>
              </el-table-column>
              <el-table-column label="消息" prop="message" min-width="320" show-overflow-tooltip />
              <el-table-column label="来源" min-width="160">
                <template #default="{ row }">{{ row.source_component || '-' }}<template v-if="row.source_host"> · {{ row.source_host }}</template></template>
              </el-table-column>
              <el-table-column label="次数" prop="count" width="70" align="center" />
              <el-table-column label="最后时间" prop="last_timestamp" width="180">
                <template #default="{ row }">{{ row.last_timestamp ? formatK8sDate(row.last_timestamp) : '-' }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </template>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import UsageBar from './components/UsageBar'
import { routeBreadcrumb } from '@/utils/helpers'
import { formatK8sDate, formatK8sCpu, formatK8sMemory, parseK8sCpuToCores, parseK8sMemoryToKi } from '@/utils/filters'
import { kubernetesClusterNodeDetail, kubernetesClusterObjectEvents } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sNodeDetail',
  components: { Breadcrumb, EasyTitle, UsageBar },
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
      activeTab: 'overview',
      eventsLoaded: false,
      eventsLoading: false,
      events: [],
      eventType: '',
      eventKeyword: '',
      node: {
        name: '', ready: false, roles: [], addresses: [], conditions: [], taints: [],
        labels: {}, annotations: {}, images: [], node_info: {}, capacity: {}, allocatable: {},
        created_at: '', kubelet_version: '', container_runtime: '', os_image: '', architecture: '',
        unschedulable: false, usage: null, pod_count: null
      }
    }
  },
  computed: {
    breadcrumb () {
      return [...routeBreadcrumb(this), { title: '节点', to: { name: 'ClusterK8sNodes', params: { clusterId: this.clusterId } } }, { title: this.node.name || '详情', to: '' }]
    },
    resourceRows () {
      const keys = ['cpu', 'memory', 'pods', 'ephemeral-storage']
      return keys.map(key => ({
        key,
        capacity: (this.node.capacity || {})[key],
        allocatable: (this.node.allocatable || {})[key]
      }))
    },
    nodeUsage () {
      const usage = this.node.usage
      if (!usage || (!usage.cpu && !usage.memory)) return null
      const result = {}
      const cpuUsed = parseK8sCpuToCores(usage.cpu)
      const cpuAll = parseK8sCpuToCores((this.node.allocatable || {}).cpu)
      if (cpuAll > 0) {
        result.cpu = {
          percent: (cpuUsed / cpuAll) * 100,
          usedText: formatK8sCpu(usage.cpu),
          allText: formatK8sCpu((this.node.allocatable || {}).cpu)
        }
      }
      const memUsed = parseK8sMemoryToKi(usage.memory)
      const memAll = parseK8sMemoryToKi((this.node.allocatable || {}).memory)
      if (memAll > 0) {
        result.memory = {
          percent: (memUsed / memAll) * 100,
          usedText: formatK8sMemory(usage.memory),
          allText: formatK8sMemory((this.node.allocatable || {}).memory)
        }
      }
      const podsAll = parseInt((this.node.allocatable || {}).pods, 10)
      if (podsAll > 0 && this.node.pod_count !== null && this.node.pod_count !== undefined) {
        result.pods = {
          percent: (this.node.pod_count / podsAll) * 100,
          usedText: String(this.node.pod_count),
          allText: String(podsAll)
        }
      }
      return result
    },
    displayEvents () {
      const kw = this.eventKeyword.trim().toLowerCase()
      return this.events.filter(row => {
        if (this.eventType && row.type !== this.eventType) return false
        if (kw && !JSON.stringify(row).toLowerCase().includes(kw)) return false
        return true
      })
    }
  },
  created () { this.load() },
  methods: {
    load () {
      const name = this.$route.query.name || ''
      if (!name) {
        this.error = '缺少节点名称'
        return
      }
      this.loading = true
      this.error = ''
      kubernetesClusterNodeDetail(this.orgId, this.clusterId, name).then(res => {
        this.node = Object.assign({}, this.node, res.data.node || {})
        this.loaded = true
      }).catch(err => {
        this.error = err.response?.data?.msg || err.response?.data?.message || '获取节点详情失败'
      }).finally(() => { this.loading = false })
    },
    onTabClick (tab) {
      if (tab.name === 'events' && !this.eventsLoaded) {
        this.loadEvents()
      }
    },
    loadEvents () {
      const name = this.$route.query.name || ''
      if (!name) return
      this.eventsLoading = true
      kubernetesClusterObjectEvents(this.orgId, this.clusterId, 'Node', name).then(res => {
        this.events = res.data.events || []
        this.eventsLoaded = true
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '获取事件失败')
      }).finally(() => { this.eventsLoading = false })
    },
    formatValue (value) {
      if (value === undefined || value === null || value === '') return '-'
      if (/Ki|Mi|Gi|Ti|Pi|Ei/i.test(String(value))) return formatK8sMemory(value)
      if (/m$/.test(String(value))) return formatK8sCpu(value) + ' Core'
      if (/^\d+$/.test(String(value))) return value
      return value
    },
    formatK8sDate
  }
}
</script>

<style lang="scss" scoped>
.heading { display: flex; align-items: center; justify-content: space-between; }
.section { margin-top: 18px; }
.block { margin-top: 18px; }
.table { margin-top: 0; }
.tag { margin: 0 6px 6px 0; }
.image { padding: 2px 0; color: #606266; font-size: 13px; }
.empty, .cell-sub { color: #909399; }
.events-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.events-toolbar .events-type { width: 130px; }
.events-toolbar .events-search { width: 240px; }
.secondary { margin-top: 4px; color: #909399; font-size: 12px; }
</style>
