<template>
  <div class="project-container swarm-settings" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="project-main">
      <easy-title title="Galaxy Agent 连接" margin-set="0 20" />

      <el-alert
        class="architecture-alert"
        type="info"
        :closable="false"
        show-icon
        title="Galaxy 只通过节点 Agent 管理 Docker Swarm"
        description="无需开放 Docker TCP API，也无需上传 Docker TLS 证书或配置 SSH。Agent 在每个 Swarm 节点主动连接 Galaxy API，不监听任何入站端口。" />

      <div class="status-grid">
        <el-card shadow="never" class="status-card">
          <div class="status-label">注册状态</div>
          <div class="status-value">
            <span class="status-dot" :class="registrationStatusClass" />
            {{ registrationStatusText }}
          </div>
          <div class="status-help">{{ registrationStatusHelp }}</div>
        </el-card>
        <el-card shadow="never" class="status-card">
          <div class="status-label">Agent 状态</div>
          <div class="status-value">
            <span class="status-dot" :class="agentStatusClass" />
            {{ agentStatusText }}
          </div>
          <div class="status-help">{{ agentStatusHelp }}</div>
        </el-card>
        <el-card shadow="never" class="status-card">
          <div class="status-label">Swarm ID</div>
          <div class="status-value monospace">{{ swarmId || '等待注册' }}</div>
          <div class="status-help">首次 Manager 注册时自动绑定，Web 端不可手工修改。</div>
        </el-card>
      </div>

      <el-card v-if="registrationStatus !== 'registered'" shadow="never" class="guide-card">
        <div slot="header" class="card-header">
          <span>在 Swarm Manager 部署 Agent</span>
          <el-tag size="small" type="warning">尚未注册</el-tag>
        </div>

        <el-alert
          type="warning"
          :closable="false"
          show-icon
          title="请在具有 Docker Socket 权限的 Swarm Manager 上执行"
          description="Bootstrap Agent 完成身份绑定后，会自动创建加密 Overlay 网络、版本化 Docker Secret，并将 galaxy-agent 以 Global Service 部署到所有 Linux 节点。" />

        <div class="server-field">
          <div class="field-label">Agent 可访问的 Galaxy API 地址</div>
          <el-input v-model.trim="agentServerInput" :placeholder="detectedAgentServer">
            <el-button slot="append" @click="useDetectedServer">使用当前地址</el-button>
          </el-input>
          <div class="field-help">
            该地址必须能从所有 Swarm 节点访问。生产环境请使用 HTTPS；如果页面地址是 localhost，请改为节点可访问的域名或 IP。
          </div>
          <el-alert
            v-if="agentServerError"
            class="server-error"
            type="error"
            :closable="false"
            show-icon
            :title="agentServerError" />
        </div>

        <el-steps direction="vertical" :active="deploymentStep" finish-status="success" class="deploy-steps">
          <el-step title="准备 Galaxy CLI">
            <template #description>
              <div class="step-content">
                在 Swarm Manager 上使用分发给用户的 <code>galaxy</code> CLI。无需另外下载或常驻运行宿主机
                <code>galaxy-agent</code> 二进制。
                <command-block value="galaxy version" @copy="copyText" />
              </div>
            </template>
          </el-step>
          <el-step title="生成一次性 Bootstrap Token">
            <template #description>
              <div class="step-content">
                页面已自动生成 Token，并将其写入第三步的完整安装命令。Token 有效期 15 分钟且只能使用一次。
                <el-input
                  v-if="agentToken"
                  :value="agentToken"
                  readonly
                  class="bootstrap-token-input">
                  <el-button slot="append" @click="copyText(agentToken)">复制 Token</el-button>
                </el-input>
                <div v-else-if="!tokenRequestFailed" class="bootstrap-token-loading">
                  <i class="el-icon-loading" />
                  正在生成 Bootstrap Token…
                </div>
                <div v-else class="bootstrap-token-error">
                  <i class="el-icon-warning-outline" />
                  Bootstrap Token 生成失败，请点击下方按钮重试。
                </div>
                <div class="step-action">
                  <el-button type="warning" size="small" :loading="rotating" @click="rotateToken">
                    重新生成 15 分钟 Bootstrap Token
                  </el-button>
                </div>
              </div>
            </template>
          </el-step>
          <el-step title="一键注册并部署 Agent">
            <template #description>
              <div class="step-content">
                复制并执行下方完整命令，无需再次输入 Token。Galaxy CLI 会完成 Manager 检查、Swarm 注册、机器凭证和
                Docker Secret 创建，并将 <code>galaxy-agent</code> Global Service 部署到所有 Linux 节点。
                安装完成后 CLI 自动退出，不需要保留常驻 CLI 进程。
                <command-block v-if="!agentServerError" :value="agentInstallCommand" @copy="copyText" />
                <el-alert
                  v-else
                  type="warning"
                  :closable="false"
                  show-icon
                  title="请先填写所有 Swarm 节点均可访问的 Galaxy API 地址。" />
              </div>
            </template>
          </el-step>
        </el-steps>

        <div class="guide-footer">
          <el-button icon="el-icon-refresh" :loading="refreshing" @click="loadSettings(false)">刷新连接状态</el-button>
          <span>注册过程中页面会自动刷新；所有 Ready 节点 Agent 在线后状态变为“健康”。</span>
        </div>
      </el-card>

      <el-card v-else shadow="never" class="guide-card">
        <div slot="header" class="card-header">
          <span>Agent 部署状态</span>
          <el-tag size="small" :type="agentTagType">{{ agentStatusText }}</el-tag>
        </div>
        <el-alert
          :type="agentStatus === 'healthy' ? 'success' : 'warning'"
          :closable="false"
          show-icon
          :title="registeredAlertTitle"
          :description="registeredAlertDescription" />

        <div class="maintenance-grid">
          <div>
            <div class="maintenance-title">部署结果</div>
            <ul>
              <li><code>galaxy-agent</code> 以 Global Service 运行，每个 Linux 节点一个 Task。</li>
              <li>凭证保存在版本化 Docker Secret 中，Web 与 API 不返回凭证明文。</li>
              <li>Agent 只主动连接 Galaxy API，不需要 Docker API、TLS 证书或节点入站端口。</li>
            </ul>
          </div>
          <div>
            <div class="maintenance-title">Manager 问题排查</div>
            <div class="maintenance-help">
              先检查 Service Task 和 Agent 日志。若日志显示正在连接
              <code>127.0.0.1</code>、<code>localhost</code>、旧地址或持续出现
              <code>connection refused</code>，再使用下方 Galaxy CLI 修复。
            </div>
            <command-block value="sudo docker service ps galaxy-agent --no-trunc" @copy="copyText" />
            <command-block value="sudo docker service logs galaxy-agent --tail 100" @copy="copyText" />
            <div class="maintenance-title agent-set-title">Agent 参数设置</div>
            <div class="maintenance-help">
              Agent 因管理中心地址错误而离线时，在任一 Manager 执行下方 Galaxy CLI 命令。
              CLI 会自动更新现有 Global Service 并触发滚动重启，无需手工操作 Docker。
            </div>
            <el-input v-model.trim="agentServerInput" class="agent-set-server-input" />
            <el-alert
              v-if="agentServerError"
              type="error"
              :closable="false"
              show-icon
              :title="agentServerError" />
            <command-block v-else :value="agentSetCommand" @copy="copyText" />
          </div>
        </div>
        <div class="guide-footer">
          <el-button icon="el-icon-refresh" :loading="refreshing" @click="loadSettings(false)">刷新 Agent 状态</el-button>
          <el-button
            type="danger"
            plain
            icon="el-icon-refresh-left"
            :loading="resetting"
            @click="resetAgentRegistration">
            解除绑定并重新部署
          </el-button>
          <span v-if="agentStatus !== 'healthy'">请先检查 Manager 到 Galaxy API 的网络连通性和 Service Task 日志。</span>
        </div>
      </el-card>

    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import CommandBlock from '@/views/cluster/components/AgentCommandBlock'
import { clusterSwarmAgentReset, clusterSwarmAgentTokenRotate, clusterSwarmSettings } from '@/api/cluster'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'ClusterSwarmAgentConnection',
  components: {
    Breadcrumb,
    EasyTitle,
    CommandBlock
  },
  props: {
    clusterId: {
      type: Number,
      required: true
    }
  },
  data () {
    return {
      loading: false,
      refreshing: false,
      rotating: false,
      resetting: false,
      initialTokenRequested: false,
      tokenRequestFailed: false,
      agentToken: '',
      registrationStatus: 'pending',
      agentStatus: 'pending',
      swarmId: '',
      agentServerInput: '',
      refreshTimer: null
    }
  },
  computed: {
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: this.$route.meta.title, to: '' }
      ]
    },
    orgId () {
      return this.$store.getters.orgId
    },
    detectedAgentServer () {
      const url = new URL(process.env.VUE_APP_BASE_API || '/', window.location.origin)
      url.pathname = url.pathname.replace(/\/api\/?$/, '').replace(/\/$/, '')
      url.search = ''
      url.hash = ''
      return url.toString().replace(/\/$/, '')
    },
    agentServer () {
      return (this.agentServerInput || this.detectedAgentServer).replace(/\/$/, '')
    },
    agentServerError () {
      try {
        const url = new URL(this.agentServer)
        const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase()
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
          return '不能使用 localhost 或回环 IP：Agent 容器内的回环地址指向容器自身。'
        }
        return ''
      } catch (error) {
        return 'Galaxy API 地址格式无效。'
      }
    },
    agentInstallCommand () {
      const command = `sudo galaxy agent install --server ${this.shellQuote(this.agentServer)}`
      if (!this.agentToken) return command
      return `${command} --bootstrap-token ${this.shellQuote(this.agentToken)}`
    },
    agentSetCommand () {
      return `sudo galaxy agent set --server ${this.shellQuote(this.agentServer)}`
    },
    registrationStatusText () {
      return this.registrationStatus === 'registered' ? '已绑定 Swarm' : '等待 Manager 注册'
    },
    registrationStatusHelp () {
      return this.registrationStatus === 'registered'
        ? 'Swarm 身份已绑定，不能从 Web 修改。'
        : '生成 Bootstrap Token，并在现有 Manager 上完成首次注册。'
    },
    registrationStatusClass () {
      return this.registrationStatus === 'registered' ? 'success' : 'warning'
    },
    agentStatusText () {
      return {
        pending: '等待部署',
        initializing: '正在初始化',
        healthy: '健康',
        degraded: '部分节点离线',
        offline: '离线'
      }[this.agentStatus] || this.agentStatus || '未知'
    },
    agentStatusHelp () {
      return {
        pending: '尚未收到 Manager Agent 注册。',
        initializing: 'Manager 已注册，正在部署或发现节点 Agent。',
        healthy: 'Manager 和全部 Ready 节点 Agent 在线。',
        degraded: 'Manager 在线，但部分 Ready 节点 Agent 离线。',
        offline: '当前没有可用的 Manager Agent。'
      }[this.agentStatus] || '等待 Agent 状态上报。'
    },
    agentStatusClass () {
      if (this.agentStatus === 'healthy') return 'success'
      if (this.agentStatus === 'pending' || this.agentStatus === 'initializing') return 'warning'
      return 'danger'
    },
    agentTagType () {
      if (this.agentStatus === 'healthy') return 'success'
      if (this.agentStatus === 'initializing') return 'warning'
      return 'danger'
    },
    deploymentStep () {
      if (this.agentToken) return 2
      return 1
    },
    registeredAlertTitle () {
      if (this.agentStatus === 'healthy') return 'Galaxy Agent 已覆盖所有 Ready 节点'
      if (this.agentStatus === 'initializing') return 'Global Agent Service 正在部署'
      if (this.agentStatus === 'degraded') return '部分 Swarm 节点 Agent 离线'
      return 'Manager Agent 当前离线'
    },
    registeredAlertDescription () {
      if (this.agentStatus === 'healthy') return '集群管理流量全部通过节点 Agent WebSocket 转发，无需维护任何 Docker API 连接信息。'
      return '机器凭证不会在 Web 中导出。请在 Manager 检查 galaxy-agent Global Service、节点网络和 Task 日志。'
    }
  },
  created () {
    this.loadSettings().then(() => this.generateInitialToken()).catch(() => {})
    this.refreshTimer = window.setInterval(() => {
      if (this.registrationStatus !== 'registered' || this.agentStatus !== 'healthy') {
        this.loadSettings(false, true)
      }
    }, 5000)
  },
  beforeDestroy () {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer)
    this.agentToken = ''
  },
  methods: {
    shellQuote (value) {
      return `'${String(value).replace(/'/g, `'"'"'`)}'`
    },
    loadSettings (showLoading = true, silent = false) {
      if (showLoading) this.loading = true
      else if (!silent) this.refreshing = true
      return clusterSwarmSettings(this.orgId, this.clusterId).then(res => {
        const settings = res.data.settings
        this.registrationStatus = settings.registration_status || 'pending'
        this.agentStatus = settings.agent_status || 'pending'
        this.swarmId = settings.swarm_id || ''
        if (!this.agentServerInput && settings.agent_server_url) {
          this.agentServerInput = settings.agent_server_url
        }
      }).finally(() => {
        this.loading = false
        this.refreshing = false
      })
    },
    rotateToken () {
      this.$confirm(
        '新 Token 生成后，此前尚未使用的 Bootstrap Token 会立即失效。是否继续？',
        '生成 Bootstrap Token',
        { type: 'warning' }
      ).then(() => {
        return this.requestBootstrapToken()
      }).catch(() => {})
    },
    generateInitialToken () {
      if (this.initialTokenRequested || this.registrationStatus === 'registered') return
      this.initialTokenRequested = true
      return this.requestBootstrapToken()
    },
    requestBootstrapToken () {
      this.rotating = true
      this.tokenRequestFailed = false
      return clusterSwarmAgentTokenRotate(this.orgId, this.clusterId).then(res => {
        this.agentToken = res.data.bootstrap_token
      }).catch(error => {
        this.tokenRequestFailed = true
        throw error
      }).finally(() => {
        this.rotating = false
      })
    },
    resetAgentRegistration () {
      this.$confirm(
        '此操作会撤销当前所有 Agent 机器凭证并断开在线 Session。Galaxy 集群记录和 Swarm 工作负载不会删除；重新执行页面生成的安装命令后，现有 galaxy-agent Service 会被更新。是否继续？',
        '解除 Agent 绑定',
        {
          type: 'warning',
          confirmButtonText: '解除绑定并重新生成 Token',
          cancelButtonText: '取消'
        }
      ).then(() => {
        this.resetting = true
        return clusterSwarmAgentReset(this.orgId, this.clusterId).then(res => {
          this.registrationStatus = 'pending'
          this.agentStatus = 'pending'
          this.swarmId = ''
          this.agentToken = res.data.bootstrap_token
          this.initialTokenRequested = true
          this.tokenRequestFailed = false
          this.$message.success('Agent 绑定已解除，请执行新的安装命令')
        }).finally(() => {
          this.resetting = false
        })
      }).catch(() => {})
    },
    useDetectedServer () {
      this.agentServerInput = this.detectedAgentServer
    },
    copyText (value) {
      navigator.clipboard.writeText(value).then(() => this.$message.success('已复制'))
    }
  }
}
</script>

<style lang="scss" scoped>
.swarm-settings {
  .project-main {
    padding-bottom: 50px;
  }
  .architecture-alert {
    margin: 18px 0;
  }
  .status-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }
  .status-card {
    min-height: 132px;
  }
  .status-label {
    margin-bottom: 12px;
    color: #909399;
    font-size: 13px;
  }
  .status-value {
    min-height: 25px;
    color: #303133;
    font-size: 18px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .status-help {
    margin-top: 10px;
    color: #909399;
    font-size: 12px;
    line-height: 1.55;
  }
  .status-dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    margin-right: 7px;
    border-radius: 50%;
    background: #909399;
    &.success { background: #67c23a; box-shadow: 0 0 0 4px rgba(103, 194, 58, 0.13); }
    &.warning { background: #e6a23c; box-shadow: 0 0 0 4px rgba(230, 162, 60, 0.13); }
    &.danger { background: #f56c6c; box-shadow: 0 0 0 4px rgba(245, 108, 108, 0.13); }
  }
  .monospace,
  code {
    font-family: Consolas, Monaco, monospace;
  }
  .guide-card {
    margin-top: 18px;
    max-width: 1120px;
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
  }
  .server-field {
    max-width: 760px;
    margin: 24px 0;
  }
  .field-label {
    margin-bottom: 8px;
    color: #303133;
    font-size: 14px;
    font-weight: 600;
  }
  .field-help {
    margin-top: 7px;
    color: #909399;
    font-size: 12px;
    line-height: 1.55;
  }
  .server-error {
    margin-top: 10px;
  }
  .deploy-steps {
    min-height: 390px;
    margin: 25px 0 0 5px;
  }
  .step-content {
    max-width: 850px;
    padding: 7px 0 20px;
    color: #606266;
    font-size: 13px;
    line-height: 1.7;
  }
  .step-action {
    margin-top: 10px;
  }
  .bootstrap-token-input {
    max-width: 760px;
    margin-top: 12px;
  }
  .bootstrap-token-loading {
    margin-top: 12px;
    color: #909399;
  }
  .bootstrap-token-error {
    margin-top: 12px;
    color: #f56c6c;
  }
  .guide-footer {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-top: 16px;
    border-top: 1px solid #ebeef5;
    color: #909399;
    font-size: 12px;
  }
  .maintenance-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin: 24px 0;
    color: #606266;
    font-size: 13px;
    line-height: 1.8;
    ul {
      margin: 8px 0 0;
      padding-left: 20px;
    }
  }
  .maintenance-title {
    color: #303133;
    font-size: 14px;
    font-weight: 600;
  }
  .maintenance-help {
    margin-top: 8px;
    color: #909399;
    line-height: 1.65;
  }
  .agent-set-server-input {
    margin: 12px 0 4px;
  }
  .agent-set-title {
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid #ebeef5;
  }
}

@media (max-width: 900px) {
  .swarm-settings {
    .status-grid,
    .maintenance-grid {
      grid-template-columns: 1fr;
    }
    .guide-footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }
}
</style>
