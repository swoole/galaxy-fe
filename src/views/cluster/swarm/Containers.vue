<template>
  <div
    class="project-container swarm-containers"
    :class="{ 'embedded-resource': embedded }"
    v-loading="effectiveLoading">
    <breadcrumb v-if="!embedded" :breadcrumb="breadcrumb" :cluster="cluster" />
    <div class="resource-head">
      <div class="resource-summary">
        <button
          type="button"
          class="stat-mini-card"
          :class="{ active: statusFilter === null }"
          @click="statusFilter = null">
          <span class="stat-mini-value">{{ containerItems.length }}</span>
          <span class="stat-mini-label">全部</span>
        </button>
        <button
          type="button"
          class="stat-mini-card running"
          :class="{ active: statusFilter === 'running' }"
          @click="statusFilter = 'running'">
          <span class="stat-mini-value">{{ runningCount }}</span>
          <span class="stat-mini-label"><span class="dot"></span>运行中</span>
        </button>
        <button
          type="button"
          class="stat-mini-card stopped"
          :class="{ active: statusFilter === 'stopped' }"
          @click="statusFilter = 'stopped'">
          <span class="stat-mini-value">{{ stoppedCount }}</span>
          <span class="stat-mini-label"><span class="dot"></span>已停止</span>
        </button>
      </div>

      <div class="resource-toolbar">
        <div v-if="canOperate" class="batch-actions">
          <span class="batch-count">已选 {{ selectedContainers.length }} 个</span>
          <el-button
            size="small"
            type="success"
            plain
            icon="el-icon-video-play"
            :disabled="!selectedContainers.length"
            @click="batchAction('start')">启动</el-button>
          <el-button
            size="small"
            type="warning"
            plain
            icon="el-icon-video-pause"
            :disabled="!selectedContainers.length"
            @click="batchAction('stop')">停止</el-button>
          <el-button
            size="small"
            type="danger"
            plain
            icon="el-icon-circle-close"
            :disabled="!selectedContainers.length"
            @click="batchAction('kill')">Kill</el-button>
          <el-button
            size="small"
            plain
            icon="el-icon-refresh"
            :disabled="!selectedContainers.length"
            @click="batchAction('restart')">重启</el-button>
          <el-button
            size="small"
            plain
            icon="el-icon-video-pause"
            :disabled="!selectedContainers.length"
            @click="batchAction('pause')">暂停</el-button>
          <el-button
            size="small"
            plain
            icon="el-icon-video-play"
            :disabled="!selectedContainers.length"
            @click="batchAction('resume')">恢复</el-button>
          <el-button
            size="small"
            type="danger"
            plain
            icon="el-icon-delete"
            :disabled="!selectedContainers.length"
            @click="batchAction('remove')">删除</el-button>
          <el-button v-if="selectedContainers.length" size="small" @click="clearSelection">取消选择</el-button>
        </div>
        <div class="filter-actions">
          <el-input
            v-model="searchKeyword"
            size="small"
            clearable
            placeholder="搜索名称 / 镜像 / ID / 状态"
            prefix-icon="el-icon-search"
            class="search-input" />
          <el-button size="small" icon="el-icon-refresh" :loading="effectiveLoading" @click="refresh">刷新</el-button>
        </div>
      </div>
    </div>

    <el-table
      ref="table"
      :data="displayContainers"
      border
      stripe
      :empty-text="emptyText"
      :header-cell-style="headerCellStyle"
      :default-sort="{ prop: 'memory_usage', order: 'descending' }"
      @selection-change="handleSelectionChange">
      <el-table-column v-if="canOperate" type="selection" width="50" align="center" :selectable="isContainerOperable" />
      <el-table-column label="容器名称" min-width="190" prop="name" sortable>
        <template #default="{ row }">
          <a v-if="isContainerOperable(row)" class="cell-name cell-name-link" @click="goContainerDetail(row)">{{ row.name || shortId(row.id) }}</a>
          <span v-else class="cell-name">{{ row.name || shortId(row.id) }}</span>
          <div class="cell-id mono">{{ shortId(row.id, 16) }}</div>
        </template>
      </el-table-column>
      <el-table-column v-if="!fixedNodeId" label="节点" min-width="155" prop="node_hostname" sortable>
        <template #default="{ row }">
          <span>{{ row.node_hostname || (row.node_id ? shortId(row.node_id) : 'Manager 本机') }}</span>
          <el-tag v-if="isAgentOffline(row)" size="mini" type="danger" class="node-tag">Agent 离线</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="镜像" min-width="220" show-overflow-tooltip prop="image" sortable>
        <template #default="{ row }">
          <image-reference
            :value="row.image"
            :org-id="orgId"
            :cluster-id="clusterId"
            :node-id="row.node_id || fixedNodeId"
            :node-name="row.node_hostname"
            :pulled="true"
            compact />
        </template>
      </el-table-column>
      <el-table-column label="状态" width="150" prop="state" sortable>
        <template #default="{ row }">
          <div class="status-cell">
            <span class="status-dot" :class="containerStateType(row.state)"></span>
            <el-tag size="small" :type="containerStateType(row.state)">{{ row.state }}</el-tag>
            <el-tag
              v-if="showTaskSlot && row.task_state && row.task_state !== 'running'"
              size="mini"
              :type="taskStateType(row.task_state)"
              class="task-state-tag">{{ row.task_state }}</el-tag>
            <div class="cell-sub">{{ row.status }}</div>
            <div v-if="row.task_error" class="cell-sub task-error-text">{{ row.task_error }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        v-if="showTaskSlot"
        label="槽位"
        width="70"
        align="center"
        prop="slot"
        sortable>
        <template #default="{ row }"><span class="mono">{{ row.slot || '-' }}</span></template>
      </el-table-column>
      <el-table-column
        label="CPU"
        width="110"
        align="right"
        prop="cpu_percent"
        sortable
        :sort-method="sortByCpu">
        <template #default="{ row }">
          <span v-if="!isAgentOffline(row)" class="cell-metric">{{ formatNumber(row.cpu_percent) }}%</span>
          <span v-else class="cell-sub">-</span>
        </template>
      </el-table-column>
      <el-table-column
        label="内存"
        width="160"
        align="right"
        prop="memory_usage"
        sortable
        :sort-method="sortByMemory">
        <template #default="{ row }">
          <template v-if="!isAgentOffline(row)">
            <span class="cell-metric">{{ formatBytes(row.memory_usage) }}</span>
            <div class="cell-sub">/ {{ formatBytes(row.memory_limit) }}</div>
          </template>
          <span v-else class="cell-sub">-</span>
        </template>
      </el-table-column>
      <el-table-column label="线程" prop="pids" width="80" align="center" sortable>
        <template #default="{ row }">{{ isAgentOffline(row) ? '-' : row.pids }}</template>
      </el-table-column>
      <el-table-column
        label="网络 I/O"
        width="150"
        align="right"
        prop="network_total"
        sortable
        :sort-method="sortByNetworkIO">
        <template #default="{ row }">
          <template v-if="!isAgentOffline(row)">
            <span class="io-down">&#8595; {{ formatBytes(row.network_rx) }}</span>
            <div class="io-up">&#8593; {{ formatBytes(row.network_tx) }}</div>
          </template>
          <span v-else class="cell-sub">-</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="175" prop="created_at" sortable :sort-method="sortByCreated">
        <template #default="{ row }">
          <span class="cell-date">{{ formatDate(row.created_at) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="端口" min-width="180">
        <template #default="{ row }">
          <template v-if="row.ports && row.ports.length">
            <el-tag v-for="port in row.ports" :key="port" size="small" type="info" class="port-tag">{{ port }}</el-tag>
          </template>
          <span v-else class="cell-sub">-</span>
        </template>
      </el-table-column>
      <el-table-column label="IPv4 内网地址" min-width="170">
        <template #default="{ row }">
          <template v-if="row.ip_addresses && Object.keys(row.ip_addresses).length">
            <div v-for="(ip, net) in row.ip_addresses" :key="net" class="ip-line">
              <span class="ip-addr mono">{{ ip }}</span>
              <span class="ip-net">{{ net }}</span>
            </div>
          </template>
          <span v-else class="cell-sub">-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right" align="center">
        <template #default="{ row }">
          <el-dropdown trigger="click" @command="cmd => handleContainerCommand(cmd, row)" @visible-change="visible => onContainerDropdownVisible(visible, row)">
            <el-button type="text" class="action-dropdown-btn">
              操作 <i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item v-if="canOperate" command="terminal" icon="el-icon-monitor" :disabled="!isContainerOperable(row) || row.state !== 'running'">终端</el-dropdown-item>
              <el-dropdown-item command="logs" icon="el-icon-document" :disabled="!isContainerOperable(row)">日志</el-dropdown-item>
              <el-dropdown-item v-if="canOperate" command="start" icon="el-icon-video-play" :disabled="!isContainerOperable(row) || row.state === 'running'">启动</el-dropdown-item>
              <el-dropdown-item v-if="canOperate" command="stop" icon="el-icon-video-pause" :disabled="!isContainerOperable(row) || row.state !== 'running'">停止</el-dropdown-item>
              <el-dropdown-item v-if="canOperate" command="kill" icon="el-icon-circle-close" :disabled="!isContainerOperable(row) || row.state !== 'running'">Kill</el-dropdown-item>
              <el-dropdown-item v-if="canOperate" command="restart" icon="el-icon-refresh" :disabled="!isContainerOperable(row) || row.state !== 'running'">重启</el-dropdown-item>
              <el-dropdown-item v-if="canOperate" command="pause" icon="el-icon-video-pause" :disabled="!isContainerOperable(row) || row.state !== 'running'">暂停</el-dropdown-item>
              <el-dropdown-item v-if="canOperate" command="resume" icon="el-icon-video-play" :disabled="!isContainerOperable(row) || row.state !== 'paused'">恢复</el-dropdown-item>
              <el-dropdown-item v-if="canOperate" command="remove" icon="el-icon-delete" :disabled="!isContainerOperable(row) || row.state === 'running'" divided>删除</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>
    <swarm-terminal ref="terminal" :org-id="orgId" :cluster-id="clusterId" :scope="scope" />
    <swarm-log-viewer ref="logViewer" :org-id="orgId" :cluster-id="clusterId" :scope="scope" />
  </div>
</template>

<script>
import {
  clusterSwarmContainers,
  clusterSwarmContainerStart,
  clusterSwarmContainerStop,
  clusterSwarmContainerRestart,
  clusterSwarmContainerRemove,
  clusterSwarmContainerPause,
  clusterSwarmContainerResume,
  clusterSwarmContainerKill
} from '@/api/cluster'
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import SwarmTerminal from './SwarmTerminal.vue'
import SwarmLogViewer from './LogViewer.vue'
import { imageTag, routeBreadcrumb } from '@/utils/helpers'

const BATCH_API = {
  start: clusterSwarmContainerStart,
  stop: clusterSwarmContainerStop,
  restart: clusterSwarmContainerRestart,
  remove: clusterSwarmContainerRemove,
  pause: clusterSwarmContainerPause,
  resume: clusterSwarmContainerResume,
  kill: clusterSwarmContainerKill
}

const BATCH_LABEL = {
  start: '启动',
  stop: '停止',
  kill: 'Kill',
  restart: '重启',
  pause: '暂停',
  resume: '恢复',
  remove: '删除'
}

export default {
  name: 'SwarmContainers',
  components: { Breadcrumb, SwarmTerminal, SwarmLogViewer },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true },
    embedded: { type: Boolean, default: false },
    fixedNodeId: { type: String, default: '' },
    items: { type: Array, default: null },
    externalLoading: { type: Boolean, default: false },
    scope: { type: Object, default: () => ({}) },
    canOperate: { type: Boolean, default: true },
    showTaskSlot: { type: Boolean, default: false },
    emptyText: { type: String, default: '当前节点没有容器' }
  },
  data () {
    return {
      loading: false,
      containers: [],
      nodes: [],
      nodeFilter: this.fixedNodeId,
      statusFilter: null,
      searchKeyword: '',
      selectedContainers: [],
      actionTarget: null,
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
    externalMode () {
      return Array.isArray(this.items)
    },
    containerItems () {
      return this.externalMode ? this.items : this.containers
    },
    effectiveLoading () {
      return this.externalMode ? this.externalLoading : this.loading
    },
    runningCount () {
      return this.containerItems.filter(c => c.state === 'running').length
    },
    stoppedCount () {
      return this.containerItems.filter(c => c.state !== 'running').length
    },
    filteredByStatus () {
      const rows = this.nodeFilter ? this.containerItems.filter(c => c.node_id === this.nodeFilter) : this.containerItems
      if (this.statusFilter === 'running') return rows.filter(c => c.state === 'running')
      if (this.statusFilter === 'stopped') return rows.filter(c => c.state !== 'running')
      return rows
    },
    displayContainers () {
      const kw = this.searchKeyword.trim().toLowerCase()
      if (!kw) return this.filteredByStatus
      return this.filteredByStatus.filter(c => {
        const name = (c.name || '').toLowerCase()
        const image = (c.image || '').toLowerCase()
        const id = (c.id || '').toLowerCase()
        const state = (c.state || '').toLowerCase()
        const status = (c.status || '').toLowerCase()
        return name.includes(kw) || image.includes(kw) || id.includes(kw) || state.includes(kw) || status.includes(kw)
      })
    }
  },
  created () {
    if (!this.externalMode) this.load()
  },
  methods: {
    isContainerOperable (container) {
      return container.operable !== false
    },
    isAgentOffline (container) {
      return container.agent_online === false || container.remote === true
    },
    taskStateType (state) {
      if (state === 'failed') return 'danger'
      if (state === 'rejected') return 'warning'
      return 'info'
    },
    refresh () {
      if (this.externalMode) {
        this.$emit('refresh')
        return
      }
      this.load()
    },
    load () {
      if (this.fixedNodeId) this.nodeFilter = this.fixedNodeId
      this.loading = true
      clusterSwarmContainers(this.orgId, this.clusterId, this.nodeFilter).then(res => {
        this.containers = res.data.containers || []
        this.nodes = res.data.nodes || []
        this.nodeFilter = res.data.selected_node_id || this.nodeFilter
      }).finally(() => { this.loading = false })
    },
    openTerminal (container) {
      this.$refs.terminal.open(container)
    },
    openContainerLog (container) {
      this.$refs.logViewer.openContainer(container)
    },
    formatNumber (value) {
      const number = Number(value) || 0
      return Number.isInteger(number) ? number : number.toFixed(2)
    },
    formatBytes (value) {
      let bytes = Number(value) || 0
      if (bytes <= 0) return '0 B'
      const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
      const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
      bytes /= Math.pow(1024, index)
      return `${bytes.toFixed(index === 0 ? 0 : 2)} ${units[index]}`
    },
    shortId (value, length = 12) {
      if (!value) return '-'
      return String(value).slice(0, length)
    },
    containerStateType (state) {
      if (state === 'running' || state === 'healthy') return 'success'
      if (state === 'paused' || state === 'starting') return 'warning'
      if (state === 'unhealthy') return 'danger'
      return 'info'
    },
    formatDate (value) {
      if (!value) return '-'
      const date = new Date(value * 1000)
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
    },
    formatImage (image) {
      if (!image) return '-'
      const s = imageTag(image)
      if (s.startsWith('sha256:')) {
        return s.slice(7, 19)
      }
      return s.length > 64 ? s.slice(0, 61) + '...' : s
    },
    sortByCpu (a, b) {
      return (Number(a.cpu_percent) || 0) - (Number(b.cpu_percent) || 0)
    },
    sortByMemory (a, b) {
      return (Number(a.memory_usage) || 0) - (Number(b.memory_usage) || 0)
    },
    sortByNetworkIO (a, b) {
      return (Number(a.network_rx) || 0) + (Number(a.network_tx) || 0) - (Number(b.network_rx) || 0) - (Number(b.network_tx) || 0)
    },
    sortByCreated (a, b) {
      return (Number(a.created_at) || 0) - (Number(b.created_at) || 0)
    },
    handleSelectionChange (val) {
      this.selectedContainers = val
    },
    clearSelection () {
      if (this.$refs.table) this.$refs.table.clearSelection()
      this.selectedContainers = []
    },
    batchAction (action) {
      const targets = this.selectedContainers
      if (!targets.length) return
      const label = BATCH_LABEL[action] || action
      const needConfirm = action === 'kill' || action === 'remove'
      const doIt = () => {
        if (!this.externalMode) this.loading = true
        const api = BATCH_API[action]
        const tasks = targets.map(row => api(
          this.orgId,
          this.containerClusterId(row),
          row.id,
          this.containerScope(row)
        ))
        Promise.allSettled(tasks).then(results => {
          const failed = results.filter(r => r.status === 'rejected').length
          if (failed === 0) {
            this.$message.success(`已${label} ${targets.length} 个容器`)
          } else {
            this.$message.warning(`${label}完成：${targets.length - failed} 个成功，${failed} 个失败`)
          }
          this.clearSelection()
          this.refresh()
        }).finally(() => {
          if (!this.externalMode) this.loading = false
        })
      }
      if (needConfirm) {
        this.$confirm(`确定对选中的 ${targets.length} 个容器执行「${label}」？`, '批量' + label, {
          type: 'warning',
          confirmButtonText: '确定',
          cancelButtonText: '取消'
        }).then(doIt).catch(() => {})
      } else {
        doIt()
      }
    },
    goContainerDetail (row) {
      if (this.externalMode) {
        this.$emit('open-detail', row)
        return
      }
      this.$router.push({
        name: 'ClusterSwarmContainerDetail',
        params: { clusterId: this.containerClusterId(row), containerId: row.id },
        query: { node_id: row.node_id }
      })
    },
    containerClusterId (row) {
      return Number(row.cluster_id || this.clusterId)
    },
    containerScope (row) {
      return {
        ...this.scope,
        ...(row.node_id ? { nodeId: row.node_id } : {})
      }
    },
    onContainerDropdownVisible (visible, row) {
      if (visible) this.actionTarget = row
    },
    handleContainerCommand (command, row) {
      const target = row || this.actionTarget
      if (!target || !this.isContainerOperable(target)) return
      if (!this.canOperate && command !== 'logs') return
      switch (command) {
        case 'terminal': this.openTerminal(target); break
        case 'logs': this.openContainerLog(target); break
        case 'start': this.doStart(target); break
        case 'stop': this.doStop(target); break
        case 'kill': this.doKill(target); break
        case 'restart': this.doRestart(target); break
        case 'pause': this.doPause(target); break
        case 'resume': this.doResume(target); break
        case 'remove': this.doRemove(target); break
      }
    },
    doStart (row) {
      clusterSwarmContainerStart(this.orgId, this.containerClusterId(row), row.id, this.containerScope(row)).then(() => {
        this.$message.success('容器 ' + (row.name || this.shortId(row.id)) + ' 已启动')
        this.refresh()
      })
    },
    doStop (row) {
      this.$confirm(`确定停止容器「${row.name || this.shortId(row.id)}」？`, '停止确认', {
        type: 'warning',
        confirmButtonText: '确认停止',
        cancelButtonText: '取消'
      }).then(() => {
        return clusterSwarmContainerStop(this.orgId, this.containerClusterId(row), row.id, this.containerScope(row)).then(() => {
          this.$message.success('容器 ' + (row.name || this.shortId(row.id)) + ' 已停止')
          this.refresh()
        })
      }).catch(() => {})
    },
    doKill (row) {
      this.$confirm(`确定强制杀死容器「${row.name || this.shortId(row.id)}」？`, 'Kill 确认', {
        type: 'warning',
        confirmButtonText: '确认 Kill',
        cancelButtonText: '取消'
      }).then(() => {
        return clusterSwarmContainerKill(this.orgId, this.containerClusterId(row), row.id, this.containerScope(row)).then(() => {
          this.$message.success('容器 ' + (row.name || this.shortId(row.id)) + ' 已 Kill')
          this.refresh()
        })
      }).catch(() => {})
    },
    doRestart (row) {
      clusterSwarmContainerRestart(this.orgId, this.containerClusterId(row), row.id, this.containerScope(row)).then(() => {
        this.$message.success('容器 ' + (row.name || this.shortId(row.id)) + ' 正在重启')
        this.refresh()
      })
    },
    doPause (row) {
      clusterSwarmContainerPause(this.orgId, this.containerClusterId(row), row.id, this.containerScope(row)).then(() => {
        this.$message.success('容器 ' + (row.name || this.shortId(row.id)) + ' 已暂停')
        this.refresh()
      })
    },
    doResume (row) {
      clusterSwarmContainerResume(this.orgId, this.containerClusterId(row), row.id, this.containerScope(row)).then(() => {
        this.$message.success('容器 ' + (row.name || this.shortId(row.id)) + ' 已恢复')
        this.refresh()
      })
    },
    doRemove (row) {
      this.$confirm(`确定删除容器「${row.name || this.shortId(row.id)}」？删除后无法恢复。`, '删除确认', {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }).then(() => {
        return clusterSwarmContainerRemove(this.orgId, this.containerClusterId(row), row.id, this.containerScope(row)).then(() => {
          this.$message.success('容器 ' + (row.name || this.shortId(row.id)) + ' 已删除')
          this.refresh()
        })
      }).catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
.resource-head {
  padding: 6px 20px 14px;
}
.resource-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 200px));
  gap: 10px;
}
.stat-mini-card {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  padding: 10px 14px;
  color: inherit;
  font: inherit;
  text-align: left;
  background: #f7f8fa;
  border: 1px solid #ebeef5;
  border-left: 3px solid #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color .2s, background-color .2s;
  &:hover { background: #f2f6fc; border-color: #c6e2ff; }
  &.running { border-left-color: #67c23a; }
  &.stopped { border-left-color: #909399; }
  &.active { background: #ecf5ff; border-color: #a0cfff; }
  .stat-mini-value { flex: none; font-size: 20px; font-weight: 700; color: #303133; line-height: 1.2; }
  .stat-mini-label {
    min-width: 0; font-size: 13px; color: #909399; white-space: nowrap;
    .dot {
      display: inline-block; width: 7px; height: 7px;
      border-radius: 50%; margin-right: 5px; vertical-align: middle;
    }
  }
  &.running .stat-mini-label .dot { background: #67c23a; }
  &.stopped .stat-mini-label .dot { background: #909399; }
}

.content-card {
  border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06);
  ::v-deep .el-card__header { padding: 14px 20px; border-bottom: 1px solid #ebeef5; background: #fafbfc; }
  ::v-deep .el-card__body { padding: 0; }
}
.content-card.embedded-card {
  width: 100%;
  margin: 0 !important;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
  ::v-deep .el-card__header {
    padding: 4px 0 12px;
    border-bottom: 0;
    background: transparent;
  }
  ::v-deep .el-card__body { padding: 0; }
  .resource-head { padding: 4px 0 14px; }
}
.embedded-resource {
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  ::v-deep .el-table { width: 100% !important; }
}
.card-header {
  display: flex; align-items: center;
  font-size: 15px; font-weight: 600; color: #303133;
  .card-header-icon { margin-right: 8px; color: #409eff; font-size: 16px; }
  .card-count { margin-left: 8px; color: #909399; font-size: 13px; font-weight: 400; &::before { content: '('; } &::after { content: ')'; } }
  .card-header-actions { margin-left: auto; display: flex; align-items: center; }
  .search-input { width: 240px; }
  .node-select { width: 190px; }
}

.node-option-state { float: right; margin-left: 18px; color: #909399; font-size: 12px; }

.resource-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
.batch-actions,
.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
  ::v-deep .el-button + .el-button { margin-left: 0; }
}
.batch-actions {
  flex: 1 1 auto;
  .batch-count {
    flex: none;
    margin-right: 2px;
    color: #606266;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
}
.filter-actions {
  flex: 0 1 auto;
  margin-left: auto;
  flex-wrap: nowrap;
  .search-input { width: 250px; }
}

@media (max-width: 1280px) {
  .resource-toolbar { align-items: flex-start; flex-direction: column; }
  .filter-actions {
    width: 100%;
    margin-left: 0;
    .search-input { flex: 1; width: auto; }
  }
}
@media (max-width: 720px) {
  .resource-head { padding: 12px; }
  .content-card.embedded-card .resource-head { padding: 4px 0 12px; }
  .resource-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .stat-mini-card {
    justify-content: center;
    gap: 5px;
    padding: 9px 6px;
    .stat-mini-value { font-size: 17px; }
    .stat-mini-label { font-size: 12px; }
  }
  .batch-actions { gap: 6px; }
}

::v-deep .el-table {
  margin-top: 0;
  th { padding: 11px 0; font-size: 13px; letter-spacing: .3px; }
  td { padding: 10px 0; font-size: 13px; }
  .el-table__empty-text { font-size: 14px; color: #909399; }
}
::v-deep .el-table__body tr:hover > td { background: #f5f7fa; }

.cell-name { font-weight: 600; color: #303133; font-size: 13px; }
.cell-name-link { cursor: pointer; color: #409eff; &:hover { text-decoration: underline; } }
.cell-image { color: #606266; font-size: 13px; }
.cell-id { margin-top: 3px; color: #909399; font-size: 12px; }
.cell-sub { margin-top: 2px; color: #909399; font-size: 12px; }
.cell-metric { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; font-size: 13px; font-weight: 500; color: #303133; }

.status-cell {
  .status-dot {
    display: inline-block; width: 8px; height: 8px;
    border-radius: 50%; margin-right: 5px; vertical-align: middle;
    &.success { background: #67c23a; }
    &.warning { background: #e6a23c; }
    &.info { background: #909399; }
    &.danger { background: #f56c6c; }
  }
}

.io-down { color: #409eff; font-size: 13px; }
.io-up   { color: #e6a23c; font-size: 13px; }

.port-tag { margin: 1px 3px 1px 0; }

.ip-line { display: flex; align-items: baseline; gap: 6px; line-height: 1.7; }
.ip-addr { font-size: 13px; color: #303133; font-weight: 500; }
.ip-net { font-size: 11px; color: #909399; }
.node-tag { margin-left: 6px; }

.action-dropdown-btn {
  font-size: 13px; color: #409eff; padding: 0 4px;
}

.section-gap { margin: 18px 0 16px; }

.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }
</style>
