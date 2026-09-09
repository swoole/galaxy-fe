<template>
  <el-drawer
    :with-header="false"
    :append-to-body="appendToBody"
    direction="ltr"
    size="50%"
    :before-close="beforeClose"
    :visible.sync="visible">
    <div class="log-container">
      <div class="log-header">
        <span>构建 #{{ log.id }}</span>
        <el-tag :type="status.type === 'error' ? 'danger' : status.type" size="small">{{ status.label }}</el-tag>
        <span class="runner">{{ log.executor || 'buildkit' }}</span>
      </div>
      <div class="log-note">
        {{ log.start_at | formatDate }}
        <template v-if="log.end_at"> ~ {{ log.end_at | formatDate }}</template>
        <span v-else-if="active"><i class="el-icon-loading" /> 构建执行中</span>
      </div>
      <el-alert v-if="log.error" :title="log.error" type="error" :closable="false" show-icon />
      <div v-if="timing.available" class="timing-panel">
        <div class="timing-summary">
          <strong>阶段耗时</strong>
          <span>总耗时 {{ formatSeconds(timing.wall_seconds) }}</span>
          <span>阶段累计 {{ formatSeconds(timing.stage_time_seconds) }}</span>
          <el-tooltip content="BuildKit 会并行执行互不依赖的阶段，因此阶段累计可能大于墙钟总耗时。" placement="top">
            <i class="el-icon-info" />
          </el-tooltip>
        </div>
        <div v-for="stage in visibleStages" :key="stage.id" class="timing-row">
          <span class="timing-name" :title="stage.operation">#{{ stage.id }} {{ stage.stage || stage.category }} · {{ stage.operation }}</span>
          <span class="timing-bar"><i :style="{ width: stageWidth(stage) }" /></span>
          <strong>{{ formatSeconds(stage.duration_seconds) }}</strong>
        </div>
      </div>
      <div ref="terminal" class="terminal" />
    </div>
  </el-drawer>
</template>

<script>
import 'xterm/css/xterm.css'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { buildLog } from '@/api/project'
import { STATUSES, STATUS_ERROR, STATUS_PENDING, STATUS_RUNNING, STATUS_SUCCESS } from '@/consts/pipeline'
import { formatDate } from '@/utils/filters'

export default {
  name: 'BuildLog',
  filters: { formatDate },
  props: {
    orgId: { type: [Number, String], required: true },
    appendToBody: { type: Boolean, default: true }
  },
  data () {
    return { visible: false, log: {}, timer: null, terminal: null, fitAddon: null, context: null }
  },
  computed: {
    status () {
      return STATUSES[Number(this.log.status)] || { label: '未知', type: 'info' }
    },
    active () {
      return [STATUS_PENDING, STATUS_RUNNING].includes(Number(this.log.status))
    },
    timing () {
      return this.log.timing || { available: false, stages: [] }
    },
    visibleStages () {
      return (this.timing.stages || []).slice(0, 8)
    }
  },
  beforeDestroy () {
    this.stopPolling()
    if (this.terminal) this.terminal.dispose()
  },
  methods: {
    formatSeconds (value) {
      const seconds = Number(value || 0)
      if (seconds < 1) return `${Math.round(seconds * 1000)}ms`
      if (seconds < 60) return `${seconds.toFixed(1)}s`
      return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
    },
    stageWidth (stage) {
      const max = Number((this.visibleStages[0] || {}).duration_seconds || 0)
      return `${max > 0 ? Math.max(2, Number(stage.duration_seconds || 0) / max * 100) : 0}%`
    },
    show (groupId, projectId, buildId) {
      this.context = { groupId, projectId, buildId }
      this.visible = true
      this.$nextTick(() => {
        this.ensureTerminal()
        this.fetchLog(true)
      })
    },
    ensureTerminal () {
      if (this.terminal) return
      this.terminal = new Terminal({ convertEol: true, letterSpacing: 2, lineHeight: 1.5, fontSize: 13, scrollback: 20000, disableStdin: true })
      this.fitAddon = new FitAddon()
      this.terminal.loadAddon(this.fitAddon)
      this.terminal.open(this.$refs.terminal)
      this.fitAddon.fit()
    },
    fetchLog (showLoading = false) {
      if (!this.context) return
      const loading = showLoading ? this.$loading() : null
      const { groupId, projectId, buildId } = this.context
      buildLog(this.orgId, groupId, projectId, buildId).then(res => {
        const previousStatus = Number(this.log.status)
        this.log = res.data.buildlog || {}
        this.renderLog()
        if (this.active) {
          this.timer = setTimeout(() => this.fetchLog(), 3000)
        } else {
          this.stopPolling()
          this.$emit('finish', this.log)
          if ([STATUS_SUCCESS, STATUS_ERROR].includes(Number(this.log.status)) && previousStatus !== Number(this.log.status)) {
            this.$emit(Number(this.log.status) === STATUS_SUCCESS ? 'success' : 'error', this.log)
          }
        }
      }).catch(() => {
        if (this.visible) this.timer = setTimeout(() => this.fetchLog(), 5000)
      }).finally(() => {
        if (loading) loading.close()
      })
    },
    renderLog () {
      if (!this.terminal) return
      this.terminal.reset()
      const content = this.log.log || '等待 BuildKit 输出...'
      this.terminal.write(String(content).replace(/\n/g, '\r\n'))
      this.terminal.scrollToBottom()
      this.$nextTick(() => this.fitAddon && this.fitAddon.fit())
    },
    stopPolling () {
      if (this.timer) clearTimeout(this.timer)
      this.timer = null
    },
    beforeClose (done) {
      this.stopPolling()
      this.context = null
      done()
    }
  }
}
</script>

<style lang="scss" scoped>
.log-container { padding: 18px; height: 100%; box-sizing: border-box; background: #111827; color: #e5e7eb; }
.log-header { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; }
.runner { margin-left: auto; color: #9ca3af; font-size: 13px; font-weight: normal; }
.log-note { margin: 8px 0 12px; color: #9ca3af; font-size: 13px; }
.timing-panel { margin-top: 12px; padding: 10px 12px; border: 1px solid #374151; border-radius: 6px; background: #1f2937; }
.timing-summary { display: flex; align-items: center; gap: 14px; margin-bottom: 8px; color: #9ca3af; font-size: 12px; }
.timing-summary strong { color: #f3f4f6; font-size: 13px; }
.timing-row { display: grid; grid-template-columns: minmax(220px, 1fr) 180px 58px; align-items: center; gap: 10px; min-height: 24px; font-size: 13px; }
.timing-name { overflow: hidden; color: #d1d5db; text-overflow: ellipsis; white-space: nowrap; }
.timing-bar { height: 5px; overflow: hidden; border-radius: 4px; background: #374151; }
.timing-bar i { display: block; height: 100%; border-radius: 4px; background: #409eff; }
.timing-row strong { text-align: right; color: #93c5fd; font-weight: 500; }
.terminal { height: calc(100vh - 330px); padding: 8px; background-color: #000; min-height: 300px; margin-top: 12px; border: 1px solid #374151; border-radius: 6px; }
</style>
