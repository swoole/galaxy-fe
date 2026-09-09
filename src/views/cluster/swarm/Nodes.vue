<template>
  <div class="project-container swarm-nodes" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />

    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-s-grid card-header-icon"></i> Swarm 节点
        <span class="card-count">{{ nodes.length }}</span>
        <div class="card-header-actions">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索主机名 / 地址..."
            clearable
            prefix-icon="el-icon-search"
            size="small"
            style="width: 220px; margin-right: 8px" />
          <el-select v-model="roleFilter" size="small" clearable placeholder="角色" style="width: 120px; margin-right: 8px">
            <el-option label="全部" value="" />
            <el-option label="Manager" value="manager" />
            <el-option label="Worker" value="worker" />
          </el-select>
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>

      <el-row :gutter="16" class="stat-mini-grid">
        <el-col :xs="8" :sm="6" :lg="3">
          <div class="stat-mini-card">
            <div class="stat-mini-value">{{ nodes.length }}</div>
            <div class="stat-mini-label">节点总数</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="3">
          <div class="stat-mini-card info">
            <div class="stat-mini-value">{{ managerCount }}</div>
            <div class="stat-mini-label">Manager</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="3">
          <div class="stat-mini-card">
            <div class="stat-mini-value">{{ workerCount }}</div>
            <div class="stat-mini-label">Worker</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="3">
          <div class="stat-mini-card healthy">
            <div class="stat-mini-value">{{ readyCount }}</div>
            <div class="stat-mini-label"><span class="dot"></span>就绪</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="3">
          <div class="stat-mini-card" :class="{ degraded: warningCount > 0 }">
            <div class="stat-mini-value">{{ warningCount }}</div>
            <div class="stat-mini-label">告警</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="4">
          <div class="stat-mini-card">
            <div class="stat-mini-value">{{ totalCpu.toFixed(1) }}</div>
            <div class="stat-mini-label">CPU 核数</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="5">
          <div class="stat-mini-card">
            <div class="stat-mini-value">{{ formatBytes(totalMemory) }}</div>
            <div class="stat-mini-label">内存总量</div>
          </div>
        </el-col>
      </el-row>

      <el-table
        :data="filteredNodes"
        border
        stripe
        empty-text="暂无节点"
        :header-cell-style="headerCellStyle"
        >
        <el-table-column label="主机名" min-width="200">
          <template #default="{ row }">
            <div class="cell-name">
              <i class="el-icon-star-on leader-icon" v-if="row.leader" title="Leader"></i>
              <a class="cell-link" @click="openNode(row)"> {{ row.hostname || '未知主机' }} </a>
            </div>
            <div class="cell-id mono">{{ shortId(row.id) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.role === 'manager' ? 'primary' : 'info'">
              {{ row.role || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态 / 调度" width="180" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.state === 'ready' ? 'success' : 'danger'">
              {{ row.state || 'unknown' }}
            </el-tag>
            <el-tag size="small" :type="availabilityTagType(row.availability)" style="margin-left: 4px">
              {{ row.availability || 'unknown' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Manager 状态" width="150" align="center">
          <template #default="{ row }">
            <span v-if="row.role === 'manager'">
              <el-tag size="small" :type="row.reachability === 'reachable' ? 'success' : 'danger'">
                {{ row.reachability || '-' }}
              </el-tag>
              <div class="cell-id mono" v-if="row.leader">Leader</div>
            </span>
            <span v-else class="cell-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="Engine / 平台" min-width="170">
          <template #default="{ row }">
            <span class="cell-engine">Docker {{ row.engine_version || '-' }}</span>
            <div class="cell-id mono">{{ row.os || '-' }} / {{ row.architecture || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="资源" width="150" align="center">
          <template #default="{ row }">
            <div class="cell-metric">{{ row.cpu_cores }} 核</div>
            <div class="cell-metric">{{ formatBytes(row.memory_bytes) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="预留 / 使用" width="200" align="center">
          <template #default="{ row }">
            <div class="usage-line">
              <span class="usage-label">CPU</span>
              <el-progress
                :percentage="Math.min(row.reserved.cpu_percent || 0, 100)"
                :stroke-width="6"
                :show-text="false"
                :color="progressColor(row.reserved.cpu_percent)" />
              <span class="usage-value">{{ row.reserved.cpu_percent || 0 }}%</span>
            </div>
            <div class="usage-line">
              <span class="usage-label">MEM</span>
              <el-progress
                :percentage="Math.min(row.reserved.memory_percent || 0, 100)"
                :stroke-width="6"
                :show-text="false"
                :color="progressColor(row.reserved.memory_percent)" />
              <span class="usage-value">{{ row.reserved.memory_percent || 0 }}%</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="任务 / 容器" width="140" align="center">
          <template #default="{ row }">
            <div class="cell-metric">任务 {{ row.task_total || 0 }}</div>
            <div class="cell-metric" v-if="runtimeReady">
              容器 {{ row.container_running || 0 }}/{{ row.container_count || 0 }}
            </div>
            <div v-else class="cell-muted">容器 -</div>
          </template>
        </el-table-column>
        <el-table-column label="地址" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="cell-muted">{{ row.address || '-' }}</span>
            <div class="cell-id mono" v-if="row.manager_address">{{ row.manager_address }}</div>
          </template>
        </el-table-column>
        <el-table-column label="告警" width="100" align="center">
          <template #default="{ row }">
            <el-tooltip v-if="row.warnings && row.warnings.length" placement="left">
              <div slot="content">
                <div v-for="(w, i) in row.warnings" :key="i" class="warn-tip">
                  <i :class="w.level === 'danger' ? 'el-icon-warning' : 'el-icon-warning-outline'"></i>
                  {{ w.message }}
                </div>
              </div>
              <el-tag size="small" :type="row.health_level === 'danger' ? 'danger' : 'warning'">
                {{ row.warnings.length }} 项
              </el-tag>
            </el-tooltip>
            <el-tag v-else size="small" type="success">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="mini" type="text" @click.stop="openNode(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { clusterSwarmNodes, clusterSwarmNodesRuntime } from '@/api/cluster'
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import { routeBreadcrumb, shortId } from '@/utils/helpers'
import { formatBytes } from '@/utils/filters'

export default {
  name: 'SwarmNodes',
  components: { Breadcrumb },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  },
  data () {
    return {
      loading: false,
      runtimeLoading: false,
      runtimeReady: false,
      nodes: [],
      storage: {},
      searchKeyword: '',
      roleFilter: '',
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
        { title: this.$route.meta.title, to: '' }
      ]
    },
    managerCount () {
      return this.nodes.filter(n => n.role === 'manager').length
    },
    workerCount () {
      return this.nodes.filter(n => n.role === 'worker').length
    },
    readyCount () {
      return this.nodes.filter(n => n.state === 'ready' && n.availability === 'active').length
    },
    warningCount () {
      return this.nodes.filter(n => (n.warnings || []).length > 0).length
    },
    totalCpu () {
      return this.nodes.reduce((sum, n) => sum + (parseFloat(n.cpu_cores) || 0), 0)
    },
    totalMemory () {
      return this.nodes.reduce((sum, n) => sum + (parseInt(n.memory_bytes) || 0), 0)
    },
    filteredNodes () {
      let list = this.nodes
      if (this.roleFilter) {
        list = list.filter(n => n.role === this.roleFilter)
      }
      if (this.searchKeyword) {
        const kw = this.searchKeyword.toLowerCase()
        list = list.filter(n =>
          (n.hostname || '').toLowerCase().includes(kw) ||
          (n.address || '').toLowerCase().includes(kw)
        )
      }
      return list
    }
  },
  created () {
    this.load()
  },
  methods: {
    load () {
      this.loading = true
      this.runtimeReady = false
      clusterSwarmNodes(this.orgId, this.clusterId).then(res => {
        const data = res.data || {}
        this.nodes = data.nodes || []
        this.storage = data.storage || {}
      }).finally(() => {
        this.loading = false
        this.loadRuntime()
      })
    },
    loadRuntime () {
      this.runtimeLoading = true
      clusterSwarmNodesRuntime(this.orgId, this.clusterId).then(res => {
        const data = res.data || {}
        this.storage = data.storage || {}
        const runtime = data.nodes_runtime || {}
        this.nodes = this.nodes.map(node => {
          const rt = runtime[node.id] || {}
          const cpuCores = parseFloat(node.cpu_cores) || 0
          const memBytes = parseInt(node.memory_bytes) || 0
          const cpuUsedCores = (rt.cpu_used || 0) / 100
          const memUsed = rt.memory_used || 0
          return {
            ...node,
            container_count: rt.container_count != null ? rt.container_count : node.container_count,
            container_running: rt.container_running != null ? rt.container_running : node.container_running,
            used: {
              cpu_cores: Math.round(cpuUsedCores * 1000) / 1000,
              memory_bytes: memUsed,
              cpu_percent: cpuCores > 0 ? Math.round(rt.cpu_used / cpuCores) : 0,
              memory_percent: memBytes > 0 ? Math.round(memUsed / memBytes * 100) : 0
            }
          }
        })
        this.runtimeReady = true
      }).finally(() => { this.runtimeLoading = false })
    },
    openNode (row) {
      if (!row || !row.id) return
      this.$router.push({ name: 'ClusterSwarmNode', params: { clusterId: this.clusterId, nodeId: row.id } })
    },
    availabilityTagType (availability) {
      if (availability === 'active') return 'success'
      if (availability === 'pause') return 'warning'
      if (availability === 'drain') return 'info'
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
    }
  }
}
</script>

<style lang="scss" scoped>
.swarm-nodes {
  .leader-icon {
    color: #e6a23c;
    margin-right: 2px;
  }
  .mono {
    font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
  }

  .cell-link { color: #409eff; cursor: pointer; font-weight: 600; font-size: 13px; }

  // 顶部统计卡片
  .stat-mini-grid {
    margin: 16px 0;
  }
  .stat-mini-card {
    background: #fff; border-radius: 6px; padding: 16px 20px;
    box-shadow: 0 1px 4px rgba(0,0,0,.06); border-left: 3px solid #e4e7ed;
    transition: box-shadow .2s;
    &:hover { box-shadow: 0 2px 8px rgba(0,0,0,.10); }
    &.healthy { border-left-color: #67c23a; }
    &.degraded { border-left-color: #e6a23c; }
    &.info { border-left-color: #409eff; }
    .stat-mini-value { font-size: 26px; font-weight: 700; color: #303133; line-height: 1.2; }
    .stat-mini-label {
      margin-top: 6px; font-size: 13px; color: #909399;
      .dot {
        display: inline-block; width: 7px; height: 7px;
        border-radius: 50%; margin-right: 5px; vertical-align: middle;
      }
    }
    &.healthy .stat-mini-label .dot { background: #67c23a; }
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

  // 单元格
  .cell-name { font-weight: 600; color: #303133; font-size: 13px; }
  .cell-engine { font-weight: 500; }
  .cell-image { color: #606266; font-size: 13px; }
  .cell-id { margin-top: 3px; color: #909399; font-size: 12px; }
  .cell-muted { color: #909399; font-size: 12px; }
  .cell-metric { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; font-size: 13px; font-weight: 500; color: #303133; }

  // 预留 / 使用进度
  .usage-line { display: flex; align-items: center; margin: 3px 0; }
  .usage-label { width: 34px; text-align: left; font-size: 12px; color: #909399; }
  .usage-line ::v-deep .el-progress { flex: 1; margin: 0 6px; }
  .usage-value { width: 44px; text-align: right; font-size: 12px; color: #606266; }

  .warn-tip { line-height: 20px; }
}
</style>
