<template>
  <el-dialog
    :title="`Web 终端 · ${container.name || shortId(container.id)}`"
    :visible.sync="visible"
    width="1080px"
    top="5vh"
    :close-on-click-modal="false"
    @closed="destroyTerminal">
    <el-alert
      class="terminal-tip"
      type="warning"
      :closable="false"
      title="终端命令会直接在容器内执行。容器未安装 bash 时会自动使用 ash 或 sh。" />
    <div v-if="nativeSshCommand" class="native-terminal">
      <span class="native-terminal-label">原生终端</span>
      <el-input :value="nativeSshCommand" size="small" readonly>
        <el-button
          slot="append"
          v-clipboard:copy="nativeSshCommand"
          v-clipboard:success="copySshCommand"
          icon="el-icon-document-copy">复制命令</el-button>
      </el-input>
    </div>
    <div v-loading="connecting" class="terminal-shell">
      <div class="terminal-toolbar">
        <span class="status-dot" :class="connected ? 'online' : 'offline'" />
        <span>{{ statusText }}</span>
        <el-button v-if="!connected" size="mini" type="primary" :loading="connecting" @click="connect">重新连接</el-button>
        <el-button v-else size="mini" type="warning" @click="disconnect">断开</el-button>
      </div>
      <div ref="xterm" class="xterm" />
    </div>
  </el-dialog>
</template>

<script>
import 'xterm/css/xterm.css'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { createClusterSwarmTerminalTicket } from '@/api/cluster'

export default {
  name: 'ClusterSwarmTerminal',
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    scope: { type: Object, default: () => ({}) },
    ticketFactory: { type: Function, default: null }
  },
  data () {
    return {
      visible: false,
      connecting: false,
      connected: false,
      container: {},
      socket: null,
      term: null,
      fitAddon: null,
      inputDisposable: null,
      resizeDisposable: null,
      nativeSshCommand: ''
    }
  },
  computed: {
    statusText () {
      if (this.connecting) return '正在连接 Docker Exec...'
      return this.connected ? '已连接' : '未连接'
    }
  },
  beforeDestroy () {
    this.destroyTerminal()
  },
  methods: {
    open (container) {
      this.container = container
      this.visible = true
      this.$nextTick(this.connect)
    },
    connect () {
      if (this.connecting || this.connected || !this.container.id) return
      this.connecting = true
      this.initializeTerminal()
      const ticketRequest = this.ticketFactory
        ? this.ticketFactory(this.container)
        : createClusterSwarmTerminalTicket(this.orgId, Number(this.container.cluster_id || this.clusterId), this.container.id, {
          ...this.scope,
          nodeId: this.container.node_id || this.scope.nodeId
        })
      Promise.resolve(ticketRequest).then(res => {
        this.nativeSshCommand = (res.data.ssh && res.data.ssh.command) || ''
        this.fitTerminal()
        const socketUrl = this.websocketUrl(
          res.data.websocket_path,
          res.data.ticket,
          this.term ? this.term.cols : 120,
          this.term ? this.term.rows : 40
        )
        const socket = new WebSocket(socketUrl)
        socket.binaryType = 'arraybuffer'
        this.socket = socket
        socket.onopen = () => {
          this.connected = true
          this.connecting = false
          this.fitTerminal()
          this.term.focus()
        }
        socket.onmessage = event => {
          const data = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : event.data
          this.term && this.term.write(data)
        }
        socket.onerror = () => {
          this.connecting = false
          this.$message.error('连接 Web 终端失败')
        }
        socket.onclose = event => {
          this.connected = false
          this.connecting = false
          if (this.term && event.code !== 1000) this.term.write(`\r\n\x1b[31m连接已断开 (${event.code})\x1b[0m\r\n`)
        }
      }).catch(() => {
        this.connecting = false
      })
    },
    initializeTerminal () {
      if (this.term) return
      const term = new Terminal({
        rendererType: 'canvas',
        fontSize: 14,
        cursorBlink: true,
        scrollback: 10000,
        tabStopWidth: 4,
        convertEol: true,
        theme: { background: '#111827' }
      })
      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(this.$refs.xterm)
      this.term = term
      this.fitAddon = fitAddon
      this.inputDisposable = term.onData(data => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(new TextEncoder().encode(data))
        }
      })
      this.resizeDisposable = term.onResize(size => this.sendResize(size.cols, size.rows))
      window.addEventListener('resize', this.fitTerminal)
    },
    websocketUrl (path, ticket, cols, rows) {
      const base = new URL(process.env.VUE_APP_BASE_API, window.location.href)
      base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
      const normalizedBase = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`
      base.pathname = normalizedBase + String(path).replace(/^\//, '')
      base.searchParams.set('ticket', ticket)
      base.searchParams.set('cols', cols)
      base.searchParams.set('rows', rows)
      return base.toString()
    },
    fitTerminal () {
      if (!this.fitAddon || !this.term) return
      this.fitAddon.fit()
      this.sendResize(this.term.cols, this.term.rows)
    },
    sendResize (cols, rows) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'resize', cols, rows }))
      }
    },
    disconnect () {
      if (this.socket) this.socket.close(1000, 'user disconnect')
      this.socket = null
      this.connected = false
    },
    copySshCommand () {
      this.$message.success('原生终端命令已复制')
    },
    destroyTerminal () {
      this.disconnect()
      window.removeEventListener('resize', this.fitTerminal)
      this.inputDisposable && this.inputDisposable.dispose()
      this.resizeDisposable && this.resizeDisposable.dispose()
      this.term && this.term.dispose()
      this.inputDisposable = null
      this.resizeDisposable = null
      this.term = null
      this.fitAddon = null
      this.nativeSshCommand = ''
      this.container = {}
    },
    shortId (value) {
      return value ? String(value).slice(0, 12) : '-'
    }
  }
}
</script>

<style lang="scss" scoped>
.terminal-tip { margin-bottom: 12px; }
.native-terminal {
  display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
  .native-terminal-label { flex: 0 0 auto; color: #606266; font-size: 13px; }
  .el-input { flex: 1; }
}
.terminal-shell { min-height: 540px; background: #111827; border-radius: 5px; overflow: hidden; }
.terminal-toolbar {
  display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 14px;
  color: #d1d5db; background: #1f2937; font-size: 13px;
  .el-button { margin-left: auto; }
}
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
.status-dot.online { background: #22c55e; }
.xterm { height: 498px; padding: 10px; }
::v-deep .el-dialog {
  max-width: calc(100vw - 48px);
  margin-left: auto;
  margin-right: auto;
}
::v-deep .el-dialog__body { padding-top: 10px; }

@media (max-width: 768px) {
  ::v-deep .el-dialog { max-width: calc(100vw - 24px); }
  .terminal-shell { min-height: 460px; }
  .xterm { height: 418px; }
}
</style>
