<template>
  <div class="project-container container-detail" v-loading="pageLoading">
    <component :is="breadcrumbComponent" :breadcrumb="breadcrumb" v-bind="breadcrumbSubject" />

    <el-card shadow="never" class="header-card">
      <div class="header-row">
        <div class="container-title">
          <h2 class="container-name">{{ containerName }}</h2>
          <el-tag v-if="detail" size="small" :type="stateType(detail.state)">{{ detail.state }}</el-tag>
          <image-reference
            v-if="detail"
            :value="detail.image"
            :org-id="orgId"
            :cluster-id="clusterId"
            :node-id="detail.node_id || ''"
            :node-name="detail.node_hostname || ''"
            :pulled="true"
            compact />
          <span v-if="detail && detail.platform" class="container-meta">{{ detail.platform }}</span>
        </div>
        <div class="header-actions">
          <el-button size="small" icon="el-icon-arrow-left" @click="goBack">返回</el-button>
          <el-button size="small" icon="el-icon-refresh" :loading="inspectLoading" @click="loadDetail">刷新</el-button>
        </div>
      </div>

      <div class="ops-bar" v-if="detail">
        <el-button v-if="canOperate" size="small" icon="el-icon-monitor" :disabled="detail.state !== 'running'" @click="openTerminal">终端</el-button>
        <el-button
          v-if="canOperate"
          size="small"
          icon="el-icon-connection"
          :disabled="detail.state !== 'running'"
          :loading="sshLoading"
          @click="openSshConnection">SSH 连接</el-button>
        <el-button size="small" icon="el-icon-document" @click="openLogs">日志</el-button>
        <template v-if="canOperate">
          <el-button size="small" icon="el-icon-video-play" :disabled="detail.state === 'running'" @click="doStart">启动</el-button>
          <el-button size="small" icon="el-icon-video-pause" :disabled="detail.state !== 'running'" @click="doStop">停止</el-button>
          <el-button size="small" icon="el-icon-refresh" :disabled="detail.state !== 'running'" @click="doRestart">重启</el-button>
          <el-button
            size="small"
            icon="el-icon-delete"
            type="danger"
            plain
            :disabled="detail.state === 'running'"
            @click="doRemove">删除</el-button>
        </template>
      </div>
    </el-card>

    <el-card v-if="detail" shadow="never" class="content-card">
      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="基本信息" name="info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="容器 ID" :span="2">
              <span class="mono">{{ detail.id }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <span class="status-dot" :class="stateType(detail.state)"></span>
              <el-tag :type="stateType(detail.state)">{{ detail.state }}</el-tag>
              <span v-if="detail.exit_code !== undefined && detail.exit_code !== 0" class="exit-code">Exit {{ detail.exit_code }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="镜像">
              <image-reference
                :value="detail.image"
                :org-id="orgId"
                :cluster-id="clusterId"
                :node-id="detail.node_id || ''"
                :node-name="detail.node_hostname || ''"
                :pulled="true" />
            </el-descriptions-item>
            <el-descriptions-item label="名称">{{ detail.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="平台">{{ detail.platform || '-' }}</el-descriptions-item>
            <el-descriptions-item label="Hostname">{{ detail.hostname || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatTs(detail.created) }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.started_at" label="启动时间">{{ formatTs(detail.started_at) }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.finished_at" label="结束时间">{{ formatTs(detail.finished_at) }}</el-descriptions-item>
            <el-descriptions-item label="重启次数">{{ detail.restart_count || 0 }}</el-descriptions-item>
            <el-descriptions-item label="Exit Code">{{ detail.exit_code !== undefined ? detail.exit_code : '-' }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.error" label="错误信息" :span="2">
              <span class="inspect-error">{{ detail.error }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="环境变量" name="env">
          <el-table v-if="detail.env && detail.env.length" :data="envRows" border size="small" max-height="400">
            <el-table-column label="变量" min-width="240">
              <template #default="{ row: e }"><code class="mono env-key">{{ e.key }}</code></template>
            </el-table-column>
            <el-table-column label="值" min-width="260">
              <template #default="{ row: e }"><code class="mono env-val">{{ e.val }}</code></template>
            </el-table-column>
          </el-table>
          <div v-else class="cell-sub">-</div>
        </el-tab-pane>

        <el-tab-pane label="挂载" name="mounts">
          <el-table v-if="detail.mounts && detail.mounts.length" :data="detail.mounts" border size="small">
            <el-table-column label="类型" width="80" prop="type" />
            <el-table-column label="源路径" min-width="180">
              <template #default="{ row: m }"><code class="mono">{{ m.source || '-' }}</code></template>
            </el-table-column>
            <el-table-column label="目标路径" min-width="180">
              <template #default="{ row: m }"><code class="mono">{{ m.destination }}</code></template>
            </el-table-column>
            <el-table-column label="模式" width="80">
              <template #default="{ row: m }">
                <el-tag size="small" :type="m.rw ? 'success' : 'warning'">{{ m.mode || (m.rw ? 'rw' : 'ro') }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div v-else class="cell-sub">-</div>
        </el-tab-pane>

        <el-tab-pane label="文件浏览器" name="files">
          <div class="file-browser" ref="fileBrowser">
            <div class="file-toolbar" ref="fileToolbar">
              <el-button size="small" icon="el-icon-refresh" :loading="filesLoading" @click="loadFiles">刷新</el-button>
              <el-button v-if="canOperate" size="small" icon="el-icon-upload2" :loading="uploading" @click="triggerUpload">上传</el-button>
              <input ref="fileInput" type="file" style="display:none" @change="handleUpload" />
              <el-input
                v-model="pathInput"
                size="small"
                placeholder="输入路径后回车跳转，如 /etc/nginx"
                class="path-input"
                clearable
                @keyup.enter.native="goToPath"
                @change="onPathInputChange" />
              <div class="file-breadcrumb">
                <template v-for="(seg, i) in pathSegments">
                  <span v-if="i > 0" :key="'sep-' + i" class="breadcrumb-sep">/</span>
                  <a
                    :key="i"
                    class="breadcrumb-link"
                    :class="{ current: i === pathSegments.length - 1 }"
                    @click="navigateToPath(i)">{{ seg || '根目录' }}</a>
                </template>
              </div>
            </div>
            <el-table
              v-loading="filesLoading"
              :data="files"
              border
              stripe
              size="small"
              empty-text="目录为空"
              :height="fileTableHeight"
              @row-dblclick="handleFileDblClick">
              <el-table-column label="名称" min-width="260">
                <template #default="{ row }">
                  <div class="file-name">
                    <svg-icon :icon-class="fileIcon(row)" class="file-icon" />
                    <a class="file-link" @click="handleFileClick(row)">{{ row.name }}</a>
                    <span v-if="row.link_target" class="link-target mono">-> {{ row.link_target }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="大小" width="100" align="right">
                <template #default="{ row }">
                  <span v-if="row.type !== 'dir'" class="mono">{{ formatFileSize(row.size) }}</span>
                  <span v-else class="cell-sub">-</span>
                </template>
              </el-table-column>
              <el-table-column label="权限" width="120">
                <template #default="{ row }"><code class="mono">{{ row.permissions }}</code></template>
              </el-table-column>
              <el-table-column label="修改时间" width="160">
                <template #default="{ row }">
                  <span class="cell-date">{{ row.date }} {{ row.time }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80" align="center">
                <template #default="{ row }">
                  <el-button
                    v-if="row.type !== 'dir'"
                    type="text"
                    size="small"
                    icon="el-icon-download"
                    :loading="row._downloading"
                    @click="downloadFile(row)">下载</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane v-if="detail.labels && Object.keys(detail.labels).length" label="标签" name="labels">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item v-for="(v, k) in detail.labels" :key="k" :label="k">
              <code class="mono">{{ v }}</code>
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="实时统计" name="statistics">
          <div v-if="detail.state !== 'running'" class="cell-sub stats-empty">容器未运行，暂无实时统计</div>
          <div v-else v-loading="statsLoading" class="stats-grid">
            <div class="stats-card">
              <monitor-line-chart :chart-data="memoryChartData" height="240px" />
            </div>
            <div class="stats-card">
              <monitor-line-chart :chart-data="cpuChartData" height="240px" />
            </div>
            <div class="stats-card">
              <monitor-line-chart :chart-data="networkChartData" height="240px" />
            </div>
            <div class="stats-card">
              <monitor-line-chart :chart-data="ioChartData" height="240px" />
            </div>
            <div class="stats-meta">
              <span v-if="statsUpdatedAt">更新于 {{ statsUpdatedAt }}</span>
              <span>每 5 秒自动刷新</span>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="进程" name="processes">
          <div v-if="detail.state !== 'running'" class="cell-sub">容器未运行，暂无进程信息</div>
          <div v-else>
            <div class="process-toolbar">
              <el-button size="small" icon="el-icon-refresh" :loading="processesLoading" @click="loadProcesses">刷新</el-button>
              <span class="cell-sub">共 {{ processRows.length }} 个进程</span>
            </div>
            <el-table
              v-loading="processesLoading"
              :data="processRows"
              border
              stripe
              size="small"
              max-height="500">
              <el-table-column
                v-for="col in processColumns"
                :key="col.prop"
                :label="col.label"
                :prop="col.prop"
                :min-width="col.minWidth"
                :show-overflow-tooltip="col.tooltip" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <swarm-terminal ref="terminal" :org-id="orgId" :cluster-id="clusterId" :scope="requestScope" />
    <swarm-log-viewer ref="logViewer" :org-id="orgId" :cluster-id="clusterId" :scope="requestScope" />

    <el-dialog
      title="原生 SSH 终端"
      :visible.sync="sshDialogVisible"
      width="720px"
      append-to-body>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="请在本机终端执行以下命令。首次连接时请核对并确认 SSH 主机指纹。" />
      <div class="ssh-command-block">
        <code>{{ sshConnection.command }}</code>
        <el-button
          v-if="sshConnection.command"
          v-clipboard:copy="sshConnection.command"
          v-clipboard:success="copySshCommand"
          size="small"
          type="primary"
          icon="el-icon-document-copy">复制命令</el-button>
      </div>
      <div class="ssh-key-tip">
        登录使用用户中心登记的私人 SSH 公钥。
        <router-link to="/user/sshkey">管理私人 SSH 密钥</router-link>
      </div>
      <span slot="footer">
        <el-button size="small" @click="sshDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  clusterSwarmContainerInspect,
  clusterSwarmContainerStart,
  clusterSwarmContainerStop,
  clusterSwarmContainerRestart,
  clusterSwarmContainerRemove,
  clusterSwarmContainerListFiles,
  clusterSwarmContainerReadFile,
  clusterSwarmContainerWriteFile,
  clusterSwarmContainerStats,
  clusterSwarmContainerTop,
  getClusterSwarmTerminalSshCommand
} from '@/api/cluster'
import ClusterBreadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import ProjectBreadcrumb from '@/views/project/components/Breadcrumb.vue'
import SwarmTerminal from '../SwarmTerminal.vue'
import SwarmLogViewer from '../LogViewer.vue'
import MonitorLineChart from '@/views/components/Chart/MonitorLineChart.vue'
import { routeBreadcrumb, shortId as _shortId, formatDateTime as _formatDateTime } from '@/utils/helpers'

export default {
  name: 'ContainerDetailBase',
  components: { ClusterBreadcrumb, ProjectBreadcrumb, SwarmTerminal, SwarmLogViewer, MonitorLineChart },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) },
    project: { type: Object, default: null },
    groupId: { type: [Number, String], default: null },
    projectId: { type: [Number, String], default: null },
    mode: { type: String, default: 'swarm', validator: value => ['swarm', 'project'].includes(value) },
    canOperate: { type: Boolean, default: true }
  },
  data () {
    return {
      pageLoading: false,
      inspectLoading: false,
      detail: null,
      activeTab: 'info',
      filesLoading: false,
      files: [],
      currentPath: '/',
      pathInput: '/',
      uploading: false,
      fileTableHeight: 400,
      maxPoints: 15,
      statsLoading: false,
      statsUpdatedAt: '',
      statsTimer: null,
      statsLabels: [],
      statsMemory: [],
      statsMemoryLimit: [],
      statsCpu: [],
      statsNetRx: [],
      statsNetTx: [],
      statsIoRead: [],
      statsIoWrite: [],
      processesLoading: false,
      processColumns: [],
      processRows: [],
      sshLoading: false,
      sshDialogVisible: false,
      sshConnection: {}
    }
  },
  computed: {
    projectMode () {
      return this.mode === 'project'
    },
    requestScope () {
      return {
        ...(this.projectMode ? { groupId: this.groupId, projectId: this.projectId } : {}),
        ...(this.$route.query.node_id ? { nodeId: this.$route.query.node_id } : {})
      }
    },
    breadcrumbComponent () {
      return this.projectMode ? 'ProjectBreadcrumb' : 'ClusterBreadcrumb'
    },
    breadcrumbSubject () {
      return this.projectMode ? { project: this.project || {} } : { cluster: this.cluster || {} }
    },
    containerId () {
      return this.$route.params.containerId
    },
    containerName () {
      return this.detail ? this.detail.name : this.shortId(this.containerId)
    },
    breadcrumb () {
      if (this.projectMode) {
        const serviceId = this.$route.query.serviceId
        const serviceBreadcrumb = serviceId
          ? [{
              title: 'Service',
              to: {
                name: 'ProjectSwarmServiceDetail',
                params: {
                  groupId: this.groupId,
                  projectId: this.projectId,
                  runtimeId: this.$route.params.runtimeId,
                  serviceId
                },
                query: { cluster_id: this.clusterId }
              }
            }]
          : []
        return [
          ...routeBreadcrumb(this),
          { title: '实例', to: { name: 'ProjectInstance', params: { groupId: this.groupId, projectId: this.projectId } } },
          ...serviceBreadcrumb,
          { title: this.containerName, to: '' }
        ]
      }
      return [
        ...routeBreadcrumb(this),
        { title: '容器', to: { name: 'ClusterSwarmContainers', params: { clusterId: this.clusterId } } },
        { title: this.containerName, to: '' }
      ]
    },
    envRows () {
      if (!this.detail || !this.detail.env) return []
      return this.detail.env.map(e => {
        const idx = e.indexOf('=')
        return idx >= 0 ? { key: e.slice(0, idx), val: e.slice(idx + 1) } : { key: e, val: '' }
      })
    },
    pathSegments () {
      if (this.currentPath === '/') return ['']
      const parts = this.currentPath.split('/').filter(Boolean)
      return ['', ...parts]
    },
    memoryChartData () {
      return {
        title: 'Memory usage',
        keys: ['usage', 'limit'],
        legends: ['使用量', '限制'],
        labels: this.statsLabels,
        data: { usage: this.statsMemory, limit: this.statsMemoryLimit },
        valueFormatter: this.mbFormatter
      }
    },
    cpuChartData () {
      return {
        title: 'CPU usage',
        keys: ['usage'],
        legends: ['CPU 使用率'],
        labels: this.statsLabels,
        data: { usage: this.statsCpu },
        valueFormatter: this.percentFormatter
      }
    },
    networkChartData () {
      return {
        title: 'Network usage',
        keys: ['rx', 'tx'],
        legends: ['接收', '发送'],
        labels: this.statsLabels,
        data: { rx: this.statsNetRx, tx: this.statsNetTx },
        valueFormatter: this.mbFormatter
      }
    },
    ioChartData () {
      return {
        title: 'I/O usage',
        keys: ['read', 'write'],
        legends: ['读取', '写入'],
        labels: this.statsLabels,
        data: { read: this.statsIoRead, write: this.statsIoWrite },
        valueFormatter: this.mbFormatter
      }
    }
  },
  created () {
    this.loadDetail()
  },
  mounted () {
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy () {
    this.stopStatsPolling()
    window.removeEventListener('resize', this.handleResize)
  },
  watch: {
    activeTab (val) {
      if (val === 'statistics') {
        if (this.detail && this.detail.state === 'running') {
          this.startStatsPolling()
        }
      } else {
        this.stopStatsPolling()
      }
      if (val === 'processes') {
        if (this.detail && this.detail.state === 'running') {
          this.loadProcesses()
        }
      }
      if (val === 'files') {
        this.calcFileTableHeight()
        if (this.detail && this.detail.state === 'running') {
          this.loadFiles()
        }
      }
    }
  },
  methods: {
    loadDetail () {
      this.inspectLoading = true
      this.pageLoading = true
      clusterSwarmContainerInspect(this.orgId, this.clusterId, this.containerId, this.requestScope).then(res => {
        this.detail = res.data
        this.pageLoading = false
      }).catch(() => {
        this.$message.error('无法加载容器详情，可能已被删除')
        this.goBack()
      }).finally(() => {
        this.inspectLoading = false
        this.pageLoading = false
        this.calcFileTableHeight()
      })
    },
    goBack () {
      const serviceId = this.$route.query.serviceId
      if (this.projectMode) {
        if (this.$route.query.from === 'service' && serviceId) {
          this.$router.push({
            name: 'ProjectSwarmServiceDetail',
            params: {
              groupId: this.groupId,
              projectId: this.projectId,
              runtimeId: this.$route.params.runtimeId,
              serviceId
            },
            query: { tab: 'containers', cluster_id: this.clusterId }
          })
          return
        }
        this.$router.push({ name: 'ProjectInstance', params: { groupId: this.groupId, projectId: this.projectId } })
        return
      }
      if (this.$route.query.from === 'service' && serviceId) {
        this.$router.push({
          name: 'ClusterSwarmServiceDetail',
          params: { clusterId: this.clusterId, serviceId },
          query: { tab: 'containers' }
        })
        return
      }
      this.$router.push({ name: 'ClusterSwarmContainers', params: { clusterId: this.clusterId } })
    },
    // 计算文件浏览器表格高度，使其占满视口剩余空间
    calcFileTableHeight () {
      this.$nextTick(() => {
        const toolbar = this.$refs.fileToolbar
        if (!toolbar) return
        const rect = toolbar.getBoundingClientRect()
        const bottomPadding = 20
        const scrollGap = 50
        const topBar = 48
        const available = window.innerHeight - rect.bottom - bottomPadding - scrollGap
        const maxAllowed = window.innerHeight - topBar - bottomPadding - scrollGap
        this.fileTableHeight = Math.max(Math.min(available, maxAllowed), 200)
      })
    },
    handleResize () {
      this.calcFileTableHeight()
    },
    startStatsPolling () {
      this.stopStatsPolling()
      this.pollStats()
      this.statsTimer = setInterval(this.pollStats, 5000)
    },
    stopStatsPolling () {
      if (this.statsTimer) {
        clearInterval(this.statsTimer)
        this.statsTimer = null
      }
    },
    pollStats () {
      if (!this.detail || this.detail.state !== 'running') return
      this.statsLoading = true
      clusterSwarmContainerStats(this.orgId, this.clusterId, this.containerId, this.requestScope).then(res => {
        const d = res.data
        const label = this.formatClock(d.timestamp)
        this.pushPoint(this.statsLabels, label)
        this.pushPoint(this.statsMemory, this.toMB(d.memory.usage))
        this.pushPoint(this.statsMemoryLimit, this.toMB(d.memory.limit))
        this.pushPoint(this.statsCpu, d.cpu.usage)
        this.pushPoint(this.statsNetRx, this.toMB(d.network.rx_bytes))
        this.pushPoint(this.statsNetTx, this.toMB(d.network.tx_bytes))
        this.pushPoint(this.statsIoRead, this.toMB(d.io.read_bytes))
        this.pushPoint(this.statsIoWrite, this.toMB(d.io.write_bytes))
        this.statsUpdatedAt = this.formatTs(d.timestamp)
      }).catch(err => {
        this.$message.error(typeof err === 'string' ? err : (err.response?.data?.msg || err.message || '加载实时统计失败'))
      }).finally(() => {
        this.statsLoading = false
      })
    },
    pushPoint (arr, value) {
      arr.push(value)
      if (arr.length > this.maxPoints) arr.shift()
    },
    loadProcesses () {
      if (!this.detail || this.detail.state !== 'running') return
      this.processesLoading = true
      clusterSwarmContainerTop(this.orgId, this.clusterId, this.containerId, this.requestScope).then(res => {
        const d = res.data || {}
        const titles = d.titles || []
        this.processColumns = titles.map((t, i) => ({
          prop: 'c' + i,
          label: t,
          minWidth: this.processColWidth(t),
          tooltip: t === 'CMD' || t === 'COMMAND'
        }))
        this.processRows = (d.processes || []).map(proc => {
          const row = {}
          titles.forEach((t, i) => { row['c' + i] = proc[i] })
          return row
        })
      }).catch(err => {
        this.$message.error(typeof err === 'string' ? err : (err.response?.data?.msg || err.message || '加载进程列表失败'))
      }).finally(() => {
        this.processesLoading = false
      })
    },
    processColWidth (title) {
      if (title === 'CMD' || title === 'COMMAND') return 320
      if (['UID', 'PID', 'PPID', 'C', 'STIME', 'TTY', 'TIME'].includes(title)) return 90
      return 100
    },
    toMB (bytes) {
      return Number((bytes / 1024 / 1024).toFixed(1))
    },
    mbFormatter (val) {
      const num = typeof val === 'number' ? val : Number(val)
      if (Number.isNaN(num)) return '-'
      return num.toFixed(1) + ' MB'
    },
    percentFormatter (val) {
      const num = typeof val === 'number' ? val : Number(val)
      if (Number.isNaN(num)) return '-'
      return num.toFixed(1) + ' %'
    },
    formatClock (ts) {
      const date = new Date((ts || 0) * 1000)
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString('zh-CN', { hour12: false })
    },
    openTerminal () {
      if (this.detail) {
        this.$refs.terminal.open({ id: this.detail.id, name: this.detail.name })
      }
    },
    openSshConnection () {
      if (!this.detail || this.detail.state !== 'running' || this.sshLoading) return
      this.sshLoading = true
      getClusterSwarmTerminalSshCommand(
        this.orgId,
        this.clusterId,
        this.detail.id,
        this.requestScope
      ).then(res => {
        this.sshConnection = res.data || {}
        this.sshDialogVisible = true
      }).finally(() => {
        this.sshLoading = false
      })
    },
    copySshCommand () {
      this.$message.success('SSH 连接命令已复制')
    },
    openLogs () {
      if (this.detail) {
        this.$refs.logViewer.openContainer({ id: this.detail.id, name: this.detail.name })
      }
    },
    doStart () {
      if (!this.detail) return
      clusterSwarmContainerStart(this.orgId, this.clusterId, this.detail.id, this.requestScope).then(() => {
        this.$message.success('容器已启动')
        this.loadDetail()
      })
    },
    doStop () {
      if (!this.detail) return
      this.$confirm(`确定停止容器「${this.detail.name || this.shortId(this.detail.id)}」？`, '停止确认', {
        type: 'warning',
        confirmButtonText: '确认停止',
        cancelButtonText: '取消'
      }).then(() => {
        return clusterSwarmContainerStop(this.orgId, this.clusterId, this.detail.id, this.requestScope).then(() => {
          this.$message.success('容器已停止')
          this.loadDetail()
        })
      }).catch(() => {})
    },
    doRestart () {
      if (!this.detail) return
      clusterSwarmContainerRestart(this.orgId, this.clusterId, this.detail.id, this.requestScope).then(() => {
        this.$message.success('容器正在重启')
        this.loadDetail()
      })
    },
    doRemove () {
      if (!this.detail) return
      this.$confirm(`确定删除容器「${this.detail.name || this.shortId(this.detail.id)}」？删除后无法恢复。`, '删除确认', {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }).then(() => {
        return clusterSwarmContainerRemove(this.orgId, this.clusterId, this.detail.id, this.requestScope).then(() => {
          this.$message.success('容器已删除')
          this.goBack()
        })
      }).catch(() => {})
    },
    loadFiles () {
      if (!this.detail || this.detail.state !== 'running') {
        this.$message.warning('容器未运行，无法浏览文件')
        return
      }
      this.filesLoading = true
      clusterSwarmContainerListFiles(this.orgId, this.clusterId, this.detail.id, this.currentPath, this.requestScope).then(res => {
        const data = res.data || {}
        // 以服务端返回的真实 pwd 作为当前路径，避免前端自行拼接造成的历史叠加
        if (data.pwd) {
          this.currentPath = data.pwd
          this.pathInput = data.pwd
        }
        this.files = (data.files || []).map(f => ({ ...f, _downloading: false }))
      }).catch(err => {
        this.$message.error(typeof err === 'string' ? err : (err.response?.data?.msg || err.message || '加载文件列表失败'))
      }).finally(() => {
        this.filesLoading = false
      })
    },
    navigateToPath (index) {
      if (index === 0) {
        this.currentPath = '/'
      } else {
        const parts = this.pathSegments.slice(1, index + 1)
        this.currentPath = '/' + parts.join('/')
      }
      this.pathInput = this.currentPath
      this.loadFiles()
    },
    goToPath () {
      let raw = this.pathInput.trim()
      if (!raw) {
        this.pathInput = this.currentPath
        return
      }
      // Normalize: ensure leading slash and collapse multiple slashes
      raw = '/' + raw.replace(/^\/+/, '').replace(/\/{2,}/g, '/')
      this.currentPath = raw
      this.pathInput = raw
      this.loadFiles()
    },
    onPathInputChange () {
      // Sync with current path when cleared
      if (!this.pathInput) {
        this.pathInput = this.currentPath
      }
    },
    handleFileClick (row) {
      if (row.type === 'dir') {
        this.currentPath = this.currentPath === '/'
          ? '/' + row.name
          : this.currentPath + '/' + row.name
        this.loadFiles()
      } else {
        this.downloadFile(row)
      }
    },
    handleFileDblClick (row) {
      this.handleFileClick(row)
    },
    downloadFile (row) {
      if (!this.detail) return
      const filePath = this.currentPath === '/'
        ? '/' + row.name
        : this.currentPath + '/' + row.name
      this.$set(row, '_downloading', true)
      clusterSwarmContainerReadFile(this.orgId, this.clusterId, this.detail.id, filePath, this.requestScope).then(res => {
        const data = res.data
        const raw = (data.content || '').replace(/\s/g, '')
        const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
        const blob = new Blob([bytes])
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = row.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }).catch(err => {
        this.$message.error(typeof err === 'string' ? err : (err.response?.data?.msg || err.message || '下载失败'))
      }).finally(() => {
        this.$set(row, '_downloading', false)
      })
    },
    triggerUpload () {
      if (this.detail && this.detail.state !== 'running') {
        this.$message.warning('容器未运行，无法上传文件')
        return
      }
      this.$refs.fileInput.click()
    },
    handleUpload (event) {
      const file = event.target.files[0]
      if (!file) return
      const destPath = this.currentPath === '/'
        ? '/' + file.name
        : this.currentPath + '/' + file.name
      this.uploading = true
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        clusterSwarmContainerWriteFile(this.orgId, this.clusterId, this.detail.id, destPath, base64, 'base64', this.requestScope).then(() => {
          this.$message.success('文件已上传')
          this.loadFiles()
        }).catch(err => {
          this.$message.error(typeof err === 'string' ? err : (err.response?.data?.msg || err.message || '上传失败'))
        }).finally(() => {
          this.uploading = false
          this.$refs.fileInput.value = ''
        })
      }
      reader.onerror = () => {
        this.$message.error('读取文件失败')
        this.uploading = false
        this.$refs.fileInput.value = ''
      }
      reader.readAsDataURL(file)
    },
    fileIcon (row) {
      if (row.type === 'dir') return 'dir'
      if (row.type === 'link') return 'link'
      return 'file'
    },
    stateType (state) {
      if (state === 'running' || state === 'healthy') return 'success'
      if (state === 'paused' || state === 'starting') return 'warning'
      if (state === 'unhealthy') return 'danger'
      return 'info'
    },
    shortId (value, length) {
      return _shortId(value, length)
    },
    formatDateTime (value) {
      return _formatDateTime(value)
    },
    formatTs (value) {
      if (!value || value < 0) return '-'
      const date = new Date(value * 1000)
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false })
    },
    formatFileSize (bytes) {
      if (bytes === 0) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
      const size = bytes / Math.pow(1024, index)
      return size.toFixed(index === 0 ? 0 : 1) + ' ' + units[index]
    }
  }
}
</script>

<style lang="scss" scoped>
.header-card {
  margin: 20px 20px 0;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  ::v-deep .el-card__body { padding: 16px 20px; }
}
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.container-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.container-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.container-meta {
  font-size: 13px;
  color: #909399;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.ops-bar {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ssh-command-block {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid #dcdfe6;
  border-radius: 5px;
  background: #f5f7fa;
  code {
    flex: 1;
    display: block;
    min-width: 0;
    height: auto;
    margin: 0;
    padding: 0;
    background: transparent;
    color: #303133;
    font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    line-height: 1.7;
    overflow-wrap: anywhere;
    user-select: all;
  }
  .el-button {
    flex: none;
  }
}
.ssh-key-tip {
  margin-top: 12px;
  color: #606266;
  font-size: 13px;
}

.content-card {
  margin: 16px 20px 20px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  ::v-deep .el-card__body { padding: 0 20px 20px; }
}

.detail-tabs {
  ::v-deep .el-tabs__header { margin-bottom: 12px; }
  ::v-deep .el-tabs__item { font-size: 14px; font-weight: 500; }
}

.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }

.status-dot {
  display: inline-block; width: 10px; height: 10px;
  border-radius: 50%; margin-right: 6px; vertical-align: middle;
  &.success { background: #67c23a; }
  &.warning { background: #e6a23c; }
  &.danger { background: #f56c6c; }
  &.info { background: #909399; }
}
.exit-code { color: #f56c6c; font-size: 13px; font-weight: 600; margin-left: 6px; }
.inspect-error { color: #f56c6c; font-size: 13px; }

.env-key { color: #409eff; font-size: 13px; }
.env-val { color: #606266; word-break: break-all; font-size: 13px; }

.cell-sub { color: #909399; font-size: 12px; }
.cell-date { color: #606266; font-size: 13px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.stats-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px 12px 4px;
  background: #fff;
  min-height: 240px;
}
.stats-meta {
  grid-column: 1 / -1;
  display: flex;
  gap: 16px;
  color: #909399;
  font-size: 12px;
}
.stats-empty {
  padding: 24px 0;
  text-align: center;
}
.process-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.file-browser {
  .file-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid #ebeef5;
    flex-wrap: wrap;
  }
  .path-input {
    width: 360px;
    max-width: 100%;
    font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
  }
  .file-breadcrumb {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 14px;
    overflow-x: auto;
    white-space: nowrap;
  }
  .breadcrumb-sep {
    color: #c0c4cc;
    margin: 0 2px;
  }
  .breadcrumb-link {
    color: #409eff;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    &:hover { background: #ecf5ff; }
    &.current {
      color: #303133;
      font-weight: 600;
      cursor: default;
      &:hover { background: transparent; }
    }
  }
  .file-name {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .file-icon {
    width: 18px; height: 18px;
    color: #909399;
  }
  .file-link {
    cursor: pointer;
    color: #409eff;
    font-size: 13px;
    &:hover { text-decoration: underline; }
  }
  .link-target {
    color: #909399;
    font-size: 12px;
  }
}

.code-block {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  margin-bottom: 4px;
  background: #f5f7fa;
  border-radius: 4px;
  .code-label {
    display: inline-block;
    min-width: 80px;
    font-size: 12px;
    font-weight: 600;
    color: #909399;
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  code {
    font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    color: #303133;
    word-break: break-all;
  }
}
</style>
