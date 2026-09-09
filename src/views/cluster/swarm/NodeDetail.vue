<template>
  <div class="project-container swarm-node-detail" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />

    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-server card-header-icon"></i>
        <span class="node-title">
          <i class="el-icon-star-on leader-icon" v-if="detail.manager_status && detail.manager_status.leader" title="Leader"></i>
          {{ detail.hostname || '未知主机' }}
        </span>
        <span class="card-count mono">{{ shortId(detail.id) }}</span>
        <div class="card-header-actions">
          <el-button size="small" icon="el-icon-back" @click="back">返回节点列表</el-button>
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="基本信息" name="basic">
          <div style="padding: 6px;">
            <el-row :gutter="12" class="node-summary">
              <el-col :span="4">
                <div class="summary-label">角色</div>
                <el-tag size="small" :type="detail.role === 'manager' ? 'primary' : 'info'">{{ detail.role || '-' }}</el-tag>
              </el-col>
              <el-col :span="5">
                <div class="summary-label">状态</div>
                <el-tag size="small" :type="detail.state === 'ready' ? 'success' : 'danger'">{{ detail.state || 'unknown' }}</el-tag>
              </el-col>
              <el-col :span="5">
                <div class="summary-label">调度</div>
                <el-tag size="small" :type="availabilityTagType(detail.availability)">{{ detail.availability || 'unknown' }}</el-tag>
              </el-col>
              <el-col :span="5">
                <div class="summary-label">Manager 可达性</div>
                <el-tag v-if="detail.role === 'manager'" size="small" :type="(detail.manager_status && detail.manager_status.reachability === 'reachable') ? 'success' : 'danger'">
                  {{ (detail.manager_status && detail.manager_status.reachability) || '-' }}
                </el-tag>
                <span v-else class="cell-muted">非 Manager</span>
              </el-col>
              <el-col :span="5">
                <div class="summary-label">健康</div>
                <el-tag size="small" :type="healthTagType(healthLevel)">{{ healthText(healthLevel) }}</el-tag>
              </el-col>
            </el-row>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="主机名">{{ detail.hostname || '-' }}</el-descriptions-item>
            <el-descriptions-item label="节点 ID">
              <span class="mono">{{ detail.id || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="地址">{{ detail.address || '-' }}</el-descriptions-item>
            <el-descriptions-item label="Manager 地址">
              {{ (detail.manager_status && detail.manager_status.address) || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="角色">{{ detail.role || '-' }}</el-descriptions-item>
            <el-descriptions-item label="调度状态">{{ detail.availability || '-' }}</el-descriptions-item>
            <el-descriptions-item label="运行状态">{{ detail.state || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态信息">{{ detail.status_message || '-' }}</el-descriptions-item>
            <el-descriptions-item label="操作系统">{{ (detail.platform && detail.platform.os) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="架构">{{ (detail.platform && detail.platform.architecture) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDate(detail.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDate(detail.updated_at) }}</el-descriptions-item>
            <el-descriptions-item label="节点标签" :span="2">
              <div v-if="labelList.length">
                <el-tag v-for="(lbl, i) in labelList" :key="i" size="mini" style="margin: 2px">{{ lbl }}</el-tag>
              </div>
              <span v-else class="cell-muted">无</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="Engine 与资源" name="engine">
          <el-row :gutter="16">
            <el-col :span="12">
              <h4 class="section-title">Engine</h4>
              <el-descriptions :column="1" border :labelStyle="{width: '100px'}">
                <el-descriptions-item label="Docker 版本">{{ (detail.engine && detail.engine.version) || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Engine 标签" :span="1">
                  <div v-if="engineLabels.length">
                    <el-tag v-for="(lbl, i) in engineLabels" :key="i" size="mini" style="margin: 2px">{{ lbl }}</el-tag>
                  </div>
                  <span v-else class="cell-muted">无</span>
                </el-descriptions-item>
                <el-descriptions-item label="Docker 插件" :span="1">
                  <div v-if="pluginList.length">
                    <el-tag v-for="(p, i) in pluginList" :key="i" size="mini" type="info" style="margin: 2px">
                      {{ p.type }}: {{ p.name }}
                    </el-tag>
                  </div>
                  <span v-else class="cell-muted">无</span>
                </el-descriptions-item>
              </el-descriptions>
            </el-col>
            <el-col :span="12">
              <h4 class="section-title">资源容量</h4>
              <el-descriptions :column="1" border>
                <el-descriptions-item label="CPU 核数">{{ cpuCapacityText }}</el-descriptions-item>
                <el-descriptions-item label="内存">{{ formatBytes(detail.resources ? detail.resources.memory_bytes : 0) }}</el-descriptions-item>
                <el-descriptions-item label="自定义资源" :span="1">
                  <div v-if="genericResources.length">
                    <el-tag v-for="(g, i) in genericResources" :key="i" size="mini" style="margin: 2px">{{ g }}</el-tag>
                  </div>
                  <span v-else class="cell-muted">无</span>
                </el-descriptions-item>
              </el-descriptions>
            </el-col>
          </el-row>

          <h4 class="section-title section-gap">资源占用（预留 / 实际使用）</h4>
          <el-row :gutter="16">
            <el-col :span="12">
              <div class="usage-block">
                <div class="usage-head">
                  <span>CPU</span>
                  <span class="usage-num">
                    预留 {{ reserved.cpu_cores }} 核 ({{ reserved.cpu_percent || 0 }}%) ·
                    使用 {{ used.cpu_cores }} 核 ({{ used.cpu_percent || 0 }}%)
                  </span>
                </div>
                <el-progress
                  :percentage="Math.min(reserved.cpu_percent || 0, 100)"
                  :color="progressColor(reserved.cpu_percent)"
                  :stroke-width="10" />
              </div>
            </el-col>
            <el-col :span="12">
              <div class="usage-block">
                <div class="usage-head">
                  <span>内存</span>
                  <span class="usage-num">
                    预留 {{ formatBytes(reserved.memory_bytes) }} ({{ reserved.memory_percent || 0 }}%) ·
                    使用 {{ formatBytes(used.memory_bytes) }} ({{ used.memory_percent || 0 }}%)
                  </span>
                </div>
                <el-progress
                  :percentage="Math.min(reserved.memory_percent || 0, 100)"
                  :color="progressColor(reserved.memory_percent)"
                  :stroke-width="10" />
              </div>
            </el-col>
          </el-row>

          <h4 class="section-title section-gap">Manager / Raft</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="是否 Leader">
              {{ (detail.manager_status && detail.manager_status.leader) ? '是' : '否' }}
            </el-descriptions-item>
            <el-descriptions-item label="Reachability">
              {{ (detail.manager_status && detail.manager_status.reachability) || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="Raft Election Tick">{{ raftValue('ElectionTick') }}</el-descriptions-item>
            <el-descriptions-item label="Raft Heartbeat Tick">{{ raftValue('HeartbeatTick') }}</el-descriptions-item>
            <el-descriptions-item label="Raft Snapshot Threshold">{{ raftValue('SnapshotThreshold') }}</el-descriptions-item>
            <el-descriptions-item label="Raft Snapshot Interval">{{ raftValue('SnapshotInterval') }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="任务" name="tasks">
          <el-alert
            v-if="tasksError"
            class="tab-alert"
            type="error"
            :closable="false"
            show-icon
            :title="tasksError" />
          <el-table
            :data="tasks"
            border
            stripe
            empty-text="该节点暂无任务"
            :header-cell-style="headerCellStyle">
            <el-table-column label="Service" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                <router-link
                  v-if="row.service_id"
                  :to="{ name: 'ClusterSwarmServiceDetail', params: { clusterId, serviceId: row.service_id } }"
                  class="cell-name-link">
                  {{ row.service_name || '未知' }}
                </router-link>
                <span v-else class="cell-name">{{ row.service_name || '非 Service 任务' }}</span>
                <div class="cell-id mono">#{{ row.slot }}</div>
              </template>
            </el-table-column>
            <el-table-column label="镜像" min-width="210" show-overflow-tooltip>
              <template #default="{ row }">
                <image-reference
                  :value="row.image"
                  :org-id="orgId"
                  :cluster-id="clusterId"
                  :node-id="nodeId"
                  :node-name="node.hostname"
                  compact />
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="taskTagType(row.state)">{{ row.state }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="期望状态" width="120" align="center">
              <template #default="{ row }">{{ row.desired_state }}</template>
            </el-table-column>
            <el-table-column label="错误信息" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.error" class="cell-error">{{ row.error }}</span>
                <span v-else class="cell-muted">{{ row.message || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="容器 ID" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="mono">{{ row.container_id ? shortId(row.container_id, 16) : '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="更新时间" width="170">
              <template #default="{ row }">{{ formatDate(row.updated_at) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane name="containers">
          <span slot="label"><i class="el-icon-box resource-tab-icon"></i>容器</span>
          <swarm-containers
            v-if="activeTab === 'containers'"
            embedded
            :fixed-node-id="nodeId"
            :org-id="orgId"
            :cluster-id="clusterId"
            :cluster="cluster" />
        </el-tab-pane>

        <el-tab-pane name="images">
          <span slot="label"><i class="el-icon-picture-outline resource-tab-icon"></i>镜像</span>
          <swarm-images
            v-if="activeTab === 'images'"
            embedded
            :fixed-node-id="nodeId"
            :org-id="orgId"
            :cluster-id="clusterId"
            :cluster="cluster" />
        </el-tab-pane>

        <el-tab-pane name="volumes">
          <span slot="label"><i class="el-icon-files resource-tab-icon"></i>数据卷</span>
          <swarm-volumes
            v-if="activeTab === 'volumes'"
            embedded
            :fixed-node-id="nodeId"
            :org-id="orgId"
            :cluster-id="clusterId"
            :cluster="cluster" />
        </el-tab-pane>

        <el-tab-pane label="健康" name="health">
          <el-alert
            v-for="(w, i) in warnings"
            :key="i"
            class="section-gap"
            :type="w.level === 'danger' ? 'error' : 'warning'"
            :closable="false"
            show-icon>
            <template slot="title">{{ w.message }}</template>
          </el-alert>
          <el-alert
            v-if="!warnings.length"
            class="section-gap"
            type="success"
            :closable="false"
            show-icon>
            <template slot="title">节点健康状态正常</template>
          </el-alert>

          <h4 class="section-title section-gap">资源压力</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="CPU 预留">{{ reserved.cpu_cores }} 核 / {{ cpuCapacityText }} ({{ reserved.cpu_percent || 0 }}%)</el-descriptions-item>
            <el-descriptions-item label="CPU 使用">{{ used.cpu_cores }} 核 ({{ used.cpu_percent || 0 }}%)</el-descriptions-item>
            <el-descriptions-item label="内存预留">{{ formatBytes(reserved.memory_bytes) }} / {{ formatBytes(detail.resources ? detail.resources.memory_bytes : 0) }} ({{ reserved.memory_percent || 0 }}%)</el-descriptions-item>
            <el-descriptions-item label="内存使用">{{ formatBytes(used.memory_bytes) }} ({{ used.memory_percent || 0 }}%)</el-descriptions-item>
            <el-descriptions-item label="任务数">{{ taskTotal }}</el-descriptions-item>
            <el-descriptions-item label="容器数">{{ containerRunning }}/{{ containerCount }}</el-descriptions-item>
          </el-descriptions>

          <h4 class="section-title section-gap">集群存储占用（Docker API 不提供单节点磁盘数据）</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="镜像层">{{ formatBytes(storage.layers_bytes) }}</el-descriptions-item>
            <el-descriptions-item label="容器可写层">{{ formatBytes(storage.containers_writable_bytes) }}</el-descriptions-item>
            <el-descriptions-item label="数据卷">{{ formatBytes(storage.volumes_bytes) }}</el-descriptions-item>
            <el-descriptions-item label="构建缓存">{{ formatBytes(storage.build_cache_bytes) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script>
import { clusterSwarmNode, clusterSwarmNodeTasks } from '@/api/cluster'
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import SwarmContainers from './Containers.vue'
import SwarmImages from './Images.vue'
import SwarmVolumes from './Volumes.vue'
import { routeBreadcrumb, shortId, formatDateTime, imageTag } from '@/utils/helpers'
import { formatBytes } from '@/utils/filters'

export default {
  name: 'SwarmNodeDetail',
  components: {
    Breadcrumb,
    SwarmContainers,
    SwarmImages,
    SwarmVolumes
  },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  },
  data () {
    return {
      loading: false,
      activeTab: 'basic',
      detail: {},
      reserved: {},
      used: {},
      taskCounts: {},
      taskTotal: 0,
      containerCount: 0,
      containerRunning: 0,
      storage: {},
      warnings: [],
      healthLevel: 'normal',
      tasks: [],
      tasksError: '',
      headerCellStyle: {
        background: '#f8f9fb',
        color: '#303133',
        fontWeight: 600,
        fontSize: '13px'
      }
    }
  },
  computed: {
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: '节点', to: { name: 'ClusterSwarmNodes', params: { clusterId: this.clusterId } } },
        { title: this.$route.meta.title, to: '' }
      ]
    },
    nodeId () {
      return this.$route.params.nodeId
    },
    cpuCapacityText () {
      const cores = this.detail.resources ? this.detail.resources.cpu_cores : 0
      return cores ? `${cores} 核` : '-'
    },
    labelList () {
      const labels = this.detail.labels || {}
      return Object.keys(labels).map(k => `${k}=${labels[k]}`)
    },
    engineLabels () {
      const labels = (this.detail.engine && this.detail.engine.labels) || {}
      return Object.keys(labels).map(k => `${k}=${labels[k]}`)
    },
    pluginList () {
      return (this.detail.engine && this.detail.engine.plugins) || []
    },
    genericResources () {
      return (this.detail.resources && this.detail.resources.generic_resources) || []
    }
  },
  created () {
    this.load()
  },
  methods: {
    imageTag,
    load () {
      this.loading = true
      this.tasksError = ''
      const nodeId = this.nodeId
      Promise.allSettled([
        clusterSwarmNode(this.orgId, this.clusterId, nodeId).then(res => res.data || {}),
        clusterSwarmNodeTasks(this.orgId, this.clusterId, nodeId).then(res => (res.data || {}).tasks || [])
      ]).then(([nodeResult, tasksResult]) => {
        if (nodeResult.status === 'fulfilled') {
          const node = nodeResult.value
          this.detail = node.detail || {}
          this.reserved = node.reserved || {}
          this.used = node.used || {}
          this.taskCounts = node.task_counts || {}
          this.taskTotal = node.task_total || 0
          this.containerCount = node.container_count || 0
          this.containerRunning = node.container_running || 0
          this.storage = node.storage || {}
          this.warnings = node.warnings || []
          this.healthLevel = node.health_level || 'normal'
        } else {
          this.$message.error(this.errorMessage(nodeResult.reason, '加载节点详情失败'))
        }
        if (tasksResult.status === 'fulfilled') {
          this.tasks = tasksResult.value
        } else {
          this.tasks = []
          this.tasksError = this.errorMessage(tasksResult.reason, '加载节点任务失败')
        }
      }).finally(() => { this.loading = false })
    },
    errorMessage (error, fallback) {
      return error?.response?.data?.msg || error?.response?.data?.message || error?.message || fallback
    },
    back () {
      this.$router.push({ name: 'ClusterSwarmNodes', params: { clusterId: this.clusterId } })
    },
    raftValue (key) {
      const raft = this.detail.raft || {}
      return raft[key] !== undefined && raft[key] !== null ? raft[key] : '-'
    },
    availabilityTagType (availability) {
      if (availability === 'active') return 'success'
      if (availability === 'pause') return 'warning'
      if (availability === 'drain') return 'info'
      return 'info'
    },
    healthTagType (level) {
      if (level === 'danger' || level === 'error') return 'danger'
      if (level === 'warning') return 'warning'
      return 'success'
    },
    containerHealthType (health) {
      if (health === 'healthy') return 'success'
      if (health === 'unhealthy') return 'danger'
      if (health === 'starting') return 'warning'
      return 'info'
    },
    healthText (level) {
      if (level === 'danger') return '异常'
      if (level === 'warning') return '告警'
      return '正常'
    },
    taskTagType (state) {
      if (state === 'running') return 'success'
      if (['failed', 'rejected', 'orphaned'].includes(state)) return 'danger'
      if (state === 'pending' || state === 'assigned' || state === 'accepted' || state === 'preparing' || state === 'starting') return 'warning'
      return 'info'
    },
    progressColor (percent) {
      if (!percent || percent < 60) return '#67c23a'
      if (percent < 90) return '#e6a23c'
      return '#f56c6c'
    },
    shortId (value, length = 12) {
      return shortId(value, length)
    },
    formatBytes (value) {
      return formatBytes(value)
    },
    formatDate (value) {
      return formatDateTime(value)
    }
  }
}
</script>

<style lang="scss" scoped>
.swarm-node-detail {
  .node-title {
    font-weight: 600;
    font-size: 15px;
  }
  .leader-icon {
    color: #e6a23c;
    margin-right: 2px;
  }
  .mono {
    font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
  }

  // 头部摘要
  .node-summary {
    margin: 0 0 16px;
    padding: 14px 0;
    background: #fafbfc;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    .summary-label {
      color: #909399;
      font-size: 12px;
      margin-bottom: 6px;
      text-align: center;
    }
    .el-col {
      text-align: center;
      border-right: 1px solid #ebeef5;
      &:last-child { border-right: none; }
    }
  }

  // 卡片头
  .content-card {
    border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06);
    ::v-deep .el-card__header { padding: 14px 20px; border-bottom: 1px solid #ebeef5; background: #fafbfc; }
    ::v-deep .el-card__body { padding: 0 20px 20px; }
  }
  .card-header {
    display: flex; align-items: center;
    font-size: 15px; font-weight: 600; color: #303133;
    .card-header-icon { margin-right: 8px; color: #409eff; font-size: 16px; }
    .card-count { margin-left: 8px; color: #909399; font-size: 13px; font-weight: 400; &::before { content: '('; } &::after { content: ')'; } }
    .card-header-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  }

  // 表格
  ::v-deep .el-table {
    margin-top: 0;
    th { padding: 11px 0; font-size: 13px; letter-spacing: .3px; }
    td { padding: 10px 0; font-size: 13px; }
    .el-table__empty-text { font-size: 14px; color: #909399; }
  }
  ::v-deep .el-table__body tr:hover > td { background: #f5f7fa; }

  // 标签页（与 ServiceDetail 一致）
  .detail-tabs {
    margin-top: 12px;
    ::v-deep .el-tabs__header { margin-bottom: 12px; }
    ::v-deep .el-tabs__item { font-size: 14px; font-weight: 500; }
  }
  .resource-tab-icon { margin-right: 4px; }
  .tab-alert { margin-bottom: 12px; }

  // 单元格
  .cell-name { font-weight: 600; color: #303133; font-size: 13px; }
  .cell-name-link { cursor: pointer; color: #409eff; font-weight: 600; &:hover { text-decoration: underline; } }
  .cell-image { color: #606266; font-size: 13px; }
  .cell-error { color: #f56c6c; }
  .cell-muted { color: #909399; font-size: 12px; }
  .cell-id { margin-top: 3px; color: #909399; font-size: 12px; }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 10px;
  }
  .section-gap {
    margin-top: 16px;
  }
  .usage-block {
    margin-bottom: 8px;
  }
  .usage-head {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #606266;
    margin-bottom: 4px;
  }
}
</style>
