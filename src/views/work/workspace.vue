<template>
  <div class="project-container workspace-page">
    <div class="page-head">
      <div>
        <h2>{{ workspace.title || '开发环境' }}</h2>
        <div class="subtitle">{{ projectTitle }} · 用户 #{{ userId }}</div>
      </div>
      <el-tag v-if="workspace.id" :type="statusType">{{ statusText }}</el-tag>
    </div>

    <el-alert
      title="开发环境属于您在当前项目组中的个人工作空间，使用项目组授权的集群、Web 网关、域名和证书资源；它不隶属于任何单个项目。"
      type="info"
      :closable="false"
      show-icon />

    <el-card v-loading="loading" shadow="never" class="workspace-card">
      <template v-if="!workspace.id">
        <div slot="header" class="card-title">创建开发环境</div>
        <el-form ref="createForm" :model="form" :rules="rules" label-width="120px" class="workspace-form">
          <el-form-item label="环境名称" prop="title">
            <el-input v-model.trim="form.title" maxlength="100" placeholder="例如：我的开发工作区" />
          </el-form-item>
          <el-form-item label="开发入口" prop="mode">
            <el-radio-group v-model="form.mode" @change="modeChanged">
              <el-radio-button label="web-ide">Web IDE</el-radio-button>
              <el-radio-button label="terminal">CLI 终端</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="运行集群" prop="cluster_id">
            <el-select v-model="form.cluster_id" style="width: 100%" placeholder="选择项目组已获授权的集群">
              <el-option
                v-for="cluster in options.clusters"
                :key="cluster.id"
                :label="cluster.title"
                :value="cluster.id"
                :disabled="form.mode === 'web-ide' && !cluster.workspace_gateway_ready">
                <span>{{ cluster.title }}</span>
                <span v-if="form.mode === 'web-ide' && !cluster.workspace_gateway_ready" class="option-warning">未配置 Workspace 域名</span>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="开发镜像" prop="image"><el-input v-model.trim="form.image" /></el-form-item>
          <el-form-item label="资源配置">
            <resource-config-editor
              v-model="workspaceResources"
              :show-reservations="false"
              :allow-unlimited="false"
              :min-cpu="0.1"
              :max-cpu="8"
              :min-memory="256"
              :max-memory="32768" />
          </el-form-item>
          <el-form-item><el-button type="primary" :loading="submitting" @click="createWorkspace">创建开发环境</el-button></el-form-item>
        </el-form>
      </template>

      <template v-else>
        <el-alert v-if="workspace.error" :title="workspace.error" type="error" :closable="false" show-icon />
        <el-descriptions :column="2" border class="profile">
          <el-descriptions-item label="所属项目组">{{ projectTitle }}</el-descriptions-item>
          <el-descriptions-item label="运行集群">{{ clusterTitle }}</el-descriptions-item>
          <el-descriptions-item label="开发入口">{{ workspace.mode === 'terminal' ? 'CLI 终端' : 'Web IDE' }}</el-descriptions-item>
          <el-descriptions-item label="Swarm Service"><code>{{ workspace.runtime_ref || '-' }}</code></el-descriptions-item>
          <el-descriptions-item label="开发镜像">
            <image-reference
              :value="workspace.image"
              :org-id="orgId"
              :cluster-id="Number(workspace.cluster_id || 0)" />
          </el-descriptions-item>
          <el-descriptions-item label="持久化卷"><code>{{ workspace.volume_name || '-' }}</code></el-descriptions-item>
          <el-descriptions-item label="CPU 上限">{{ workspace.spec && workspace.spec.cpu }} mCPU</el-descriptions-item>
          <el-descriptions-item label="内存上限">{{ workspace.spec && workspace.spec.memory }} MiB</el-descriptions-item>
          <el-descriptions-item v-if="workspace.mode === 'web-ide'" label="访问地址" :span="2">
            <span>{{ workspace.url }}</span>
            <span class="auth-hint">（需通过“进入 Web IDE”完成身份验证）</span>
          </el-descriptions-item>
        </el-descriptions>
        <el-alert
          class="repo-notice"
          title="项目仓库将在下一步通过独立的“开发环境仓库”关系接入；当前可先使用 Web IDE 或终端维护开发环境。"
          type="warning"
          :closable="false" />
        <div class="actions">
          <el-button v-if="workspace.mode === 'web-ide'" type="primary" :disabled="workspace.status !== 'running'" :loading="opening" @click="openWorkspace">进入 Web IDE</el-button>
          <el-button type="primary" plain :disabled="workspace.status !== 'running'" @click="openTerminal">打开 CLI 终端</el-button>
          <el-button v-if="workspace.status === 'stopped' || (workspace.status === 'error' && workspace.runtime_ref)" :loading="operating" @click="setState('start')">启动</el-button>
          <el-button :loading="loading" @click="loadWorkspace">刷新</el-button>
          <el-button
            v-if="workspace.status !== 'stopped' && workspace.status !== 'error'"
            type="warning"
            plain
            :disabled="workspace.status !== 'running'"
            :loading="operating"
            @click="setState('stop')">停止</el-button>
          <el-button type="danger" plain :loading="deleting" @click="deleteWorkspace">删除开发环境</el-button>
        </div>
      </template>
    </el-card>

    <swarm-terminal
      v-if="workspace.cluster_id"
      ref="terminal"
      :orgId="orgId"
      :clusterId="Number(workspace.cluster_id)"
      :ticketFactory="createTerminalTicket" />
  </div>
</template>

<script>
import SwarmTerminal from '@/views/cluster/swarm/SwarmTerminal.vue'
import ResourceConfigEditor from '@/views/components/ResourceConfigEditor.vue'
import {
  workspaceAccess,
  workspaceCreate,
  workspaceDelete,
  workspaceOptions,
  workspaceProfile,
  workspaceSetState,
  workspaceTerminal
} from '@/api/workspace'

export default {
  name: 'DeveloperWorkspace',
  components: { SwarmTerminal, ResourceConfigEditor },
  props: {
    groupId: { type: [Number, String], required: true },
    userId: { type: [Number, String], required: true }
  },
  data () {
    return {
      orgId: this.$store.getters.orgId,
      loading: false,
      submitting: false,
      operating: false,
      opening: false,
      deleting: false,
      workspace: {},
      options: { clusters: [], defaults: {}, modes: [] },
      form: { title: '我的开发环境', mode: 'web-ide', cluster_id: null, image: '', cpu: 500, memory: 1024 },
      rules: {
        title: [{ required: true, message: '请输入环境名称', trigger: 'blur' }],
        mode: [{ required: true, message: '请选择开发入口', trigger: 'change' }],
        cluster_id: [{ required: true, message: '请选择运行集群', trigger: 'change' }],
        image: [{ required: true, message: '请输入开发镜像', trigger: 'blur' }]
      },
      timer: null
    }
  },
  computed: {
    workspaceResources: {
      get () {
        return {
          cpu_limit: Number(this.form.cpu || 0) / 1000,
          memory_limit: Number(this.form.memory || 0),
          cpu_reservation: 0,
          memory_reservation: 0
        }
      },
      set (resources) {
        this.form.cpu = Math.round(Number(resources.cpu_limit || 0) * 1000)
        this.form.memory = Math.round(Number(resources.memory_limit || 0))
      }
    },
    projectTitle () { return (this.options.project && this.options.project.title) || `项目组 #${this.groupId}` },
    clusterTitle () {
      const cluster = this.options.clusters.find(item => Number(item.id) === Number(this.workspace.cluster_id))
      return cluster ? cluster.title : `集群 #${this.workspace.cluster_id}`
    },
    statusText () { return ({ pending: '等待创建', starting: '启动中', running: '运行中', stopped: '已停止', error: '异常' })[this.workspace.status] || this.workspace.status },
    statusType () { return ({ running: 'success', starting: 'warning', stopped: 'info', error: 'danger' })[this.workspace.status] || 'info' }
  },
  created () {
    if (Number(this.userId) !== Number((this.$store.getters.user || {}).id)) {
      this.$message.error('只能访问自己的开发环境')
      this.$router.replace({ name: 'DevEnv' })
      return
    }
    Promise.all([this.loadOptions(), this.loadWorkspace()])
  },
  beforeDestroy () { this.stopPolling() },
  methods: {
    loadOptions () {
      return workspaceOptions(this.orgId, this.groupId, this.userId).then(res => {
        this.options = res.data || { clusters: [], defaults: {} }
        const defaults = this.options.defaults || {}
        this.form.image = defaults.image || 'codegalaxy/workspace:2026.07'
        this.form.cpu = defaults.cpu || 500
        this.form.memory = defaults.memory || 1024
        this.form.mode = defaults.mode || 'web-ide'
        const selectable = this.options.clusters.filter(item => this.form.mode !== 'web-ide' || item.workspace_gateway_ready)
        if (selectable.length === 1) this.form.cluster_id = selectable[0].id
      })
    },
    loadWorkspace () {
      this.loading = true
      return workspaceProfile(this.orgId, this.groupId, this.userId).then(res => {
        this.workspace = (res.data && res.data.workspace) || {}
        if (this.workspace.status === 'starting') this.startPolling()
        else this.stopPolling()
      }).finally(() => { this.loading = false })
    },
    modeChanged () {
      const selected = this.options.clusters.find(item => Number(item.id) === Number(this.form.cluster_id))
      if (this.form.mode === 'web-ide' && selected && !selected.workspace_gateway_ready) this.form.cluster_id = null
    },
    createWorkspace () {
      this.$refs.createForm.validate(valid => {
        if (!valid) return
        this.submitting = true
        workspaceCreate(this.orgId, this.groupId, this.userId, this.form).then(res => {
          this.workspace = res.data.workspace
          this.$message.success('开发环境已提交创建')
          this.startPolling()
        }).finally(() => { this.submitting = false })
      })
    },
    setState (action) {
      this.operating = true
      workspaceSetState(this.orgId, this.groupId, this.userId, action).then(res => {
        this.workspace = res.data.workspace
        this.$message.success(action === 'start' ? '开发环境正在启动' : '开发环境已停止')
        if (action === 'start') this.startPolling()
      }).finally(() => { this.operating = false })
    },
    openWorkspace () {
      const target = window.open('about:blank', '_blank')
      if (target) target.opener = null
      this.opening = true
      workspaceAccess(this.orgId, this.groupId, this.userId).then(res => {
        if (target) target.location.replace(res.data.access_url)
        else this.$alert(`请允许浏览器打开新窗口，然后访问：${res.data.access_url}`, '无法自动打开 Web IDE')
      }).catch(() => { if (target) target.close() }).finally(() => { this.opening = false })
    },
    openTerminal () { this.$refs.terminal.open({ id: `workspace-${this.workspace.id}`, name: this.workspace.title }) },
    createTerminalTicket () { return workspaceTerminal(this.orgId, this.groupId, this.userId) },
    deleteWorkspace () {
      this.$confirm('删除开发环境会删除其 Swarm Service、Secret 和持久化数据卷，尚未提交到外部 Git 的文件无法恢复。', '删除开发环境', { type: 'warning' })
        .then(() => {
          this.deleting = true
          return workspaceDelete(this.orgId, this.groupId, this.userId)
        })
        .then(() => { this.workspace = {}; this.stopPolling(); this.$message.success('开发环境已删除') })
        .finally(() => { this.deleting = false })
    },
    startPolling () {
      if (!this.timer) this.timer = window.setInterval(() => this.loadWorkspace(), 3000)
    },
    stopPolling () { if (this.timer) window.clearInterval(this.timer); this.timer = null }
  }
}
</script>

<style lang="scss" scoped>
.workspace-page { padding: 20px; }
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-head h2 { margin: 0 0 6px; font-size: 20px; }
.subtitle, .option-warning { color: #909399; font-size: 12px; }
.auth-hint { margin-left: 8px; color: #909399; font-size: 12px; }
.option-warning { float: right; margin-left: 24px; color: #e6a23c; }
.workspace-card { margin-top: 16px; }
.card-title { font-weight: 600; }
.workspace-form { max-width: 760px; padding-top: 12px; }
.profile { margin-top: 4px; }
.repo-notice, .actions { margin-top: 20px; }
code { word-break: break-all; }
</style>
