<template>
  <el-dialog
    :title="`Pod 终端 · ${target.namespace || ''}/${target.name || ''}`"
    :visible.sync="visible"
    width="1080px"
    top="5vh"
    :close-on-click-modal="false"
    @closed="destroyTerminal">
    <el-alert
      class="terminal-tip"
      type="warning"
      :closable="false"
      title="终端命令会直接在容器内执行。容器未安装 sh 时会连接失败（可尝试通过 command 参数指定 shell）。" />
    <div v-if="containers.length > 1" class="terminal-container-select">
      <span class="terminal-container-label">容器</span>
      <el-select v-model="containerName" size="small" placeholder="请选择容器" :disabled="connected">
        <el-option v-for="c in containers" :key="c" :label="c" :value="c" />
      </el-select>
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
import { createClusterK8sTerminalTicket } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sTerminal',
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true }
  },
  data () {
    return {
      visible: false,
      connecting: false,
      connected: false,
      target: {},
      containers: [],
      containerName: '',
      socket: null,
      term: null,
      fitAddon: null,
      inputDisposable: null,
      resizeDisposable: null
    }
  },
  computed: {
    statusText () {
      if (this.connecting) return '正在连接 Kubernetes Exec...'
      return this.connected ? '已连接' : '未连接'
    }
  },
  beforeDestroy () {
    this.destroyTerminal()
  },
  methods: {
    open (target) {
      this.target = {
        namespace: target.namespace || '',
        name: target.name || '',
        containers: target.containers || []
      }
      this.containers = this.target.containers
      this.containerName = this.containers.length ? this.containers[0] : ''
      this.visible = true
      this.$nextTick(this.connect)
    },
    connect () {
      if (this.connecting || this.connected) return
      if (!this.containerName) {
        this.$message.warning('请先选择容器')
        this.connecting = false
        return
      }
      this.connecting = true
      this.initializeTerminal()
      createClusterK8sTerminalTicket(this.orgId, this.clusterId, {
        namespace: this.target.namespace,
        name: this.target.name,
        container: this.containerName,
        command: []
      }).then(res => {
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
          this.$message.error('连接 Pod 终端失败')
        }
        socket.onclose = event => {
          this.connected = false
          this.connecting = false
          if (this.term && event.code !== 1000) {
            this.term.write(`\r\n\x1b[31m连接已断开 (${event.code})\x1b[0m\r\n`)
          }
        }
      }).catch(err => {
        this.connecting = false
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '申请终端票据失败')
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
      this.target = {}
      this.containers = []
      this.containerName = ''
    }
  }
}
</script>

<style lang="scss" scoped>
.terminal-tip { margin-bottom: 12px; }
.terminal-container-select {
  display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
  .terminal-container-label { flex: 0 0 auto; color: #606266; font-size: 13px; }
  .el-select { width: 280px; }
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
