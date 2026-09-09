<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <div class="project-main">
      <easy-title title="Git 构建触发器" margin-set="0 20" />
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          Git Push/Tag 会按规则触发确定 Commit 的镜像构建；可选在镜像推送成功后自动更新已有实例。
        </template>
        Webhook URL：<code>{{ webhook || '加载中...' }}</code>
        <el-button v-if="webhook" v-clipboard:copy="webhook" v-clipboard:success="copied" type="text" size="mini">复制</el-button>
      </el-alert>
      <el-alert
        class="secret-status"
        :type="secretConfigured ? 'success' : 'warning'"
        :closable="false"
        show-icon
        :title="secretConfigured ? 'Webhook 签名保护已启用' : 'Webhook 尚未设置 Secret，所有构建事件都会被后端拒绝'"
      />
      <div class="toolbar">
        <el-button v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role)" type="primary" size="small" @click="openCreate">新建触发器</el-button>
        <el-button v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role)" size="small" @click="rotateSecret">轮换 Webhook Secret</el-button>
      </div>
      <el-table v-loading="loading" :data="hooks" fit>
        <el-table-column label="流水线" min-width="200">
          <template #default="{ row }">{{ row.pipeline ? row.pipeline.title : `#${row.pipeline_id}` }}</template>
        </el-table-column>
        <el-table-column label="触发范围" min-width="200">
          <template #default="{ row }">
            <el-tag v-if="row.branch === ':tag'" size="small">所有 Tag Push</el-tag>
            <el-tag v-else-if="row.branch" size="small">分支 {{ row.branch }}</el-tag>
            <el-tag v-else size="small">所有分支 Push</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }"><el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '启用' : '禁用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="自动部署" min-width="190">
          <template #default="{ row }">
            <template v-if="row.auto_deploy">
              <el-tag size="small" type="success">已启用</el-tag>
              <span class="target-summary">{{ targetSummary(row.auto_deploy_target) }}</span>
            </template>
            <span v-else class="muted">未启用</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170" align="center">
          <template #default="{ row }">{{ row.created_at | formatDate }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210" align="center">
          <template #default="{ row }">
            <template v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role)">
              <el-link type="primary" @click="toggle(row)">{{ row.status ? '禁用' : '启用' }}</el-link>
              <el-divider direction="vertical" />
              <el-link type="primary" @click="edit(row)">编辑</el-link>
              <el-divider direction="vertical" />
              <el-link type="danger" @click="remove(row)">删除</el-link>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog :title="form.id ? '编辑触发器' : '新建触发器'" :visible.sync="visible" width="520px" @closed="reset">
      <el-form ref="hookForm" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="流水线" prop="pipeline_id">
          <el-select v-model="form.pipeline_id" style="width: 100%" placeholder="请选择 BuildKit 流水线">
            <el-option v-for="item in pipelines" :key="item.id" :label="item.title" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="触发类型">
          <el-radio-group v-model="form.trigger_type" @change="triggerTypeChanged">
            <el-radio label="all">所有分支</el-radio>
            <el-radio label="branch">指定分支</el-radio>
            <el-radio label="tag">所有 Tag</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.trigger_type === 'branch'" label="分支" prop="branch">
          <el-input v-model.trim="form.branch" maxlength="255" placeholder="例如 main" />
        </el-form-item>
        <el-form-item label="立即启用"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" /></el-form-item>
        <el-form-item label="自动部署">
          <el-switch v-model="form.auto_deploy" :active-value="1" :inactive-value="0" />
          <span class="form-tip">构建和镜像推送成功后创建 update-image 发布任务</span>
        </el-form-item>
        <el-form-item v-if="form.auto_deploy" label="目标实例" prop="auto_deploy_targets">
          <el-select v-model="form.auto_deploy_targets" multiple filterable style="width: 100%" placeholder="可选择一个或多个已有实例">
            <el-option v-for="runtime in runtimes" :key="runtime.id" :label="runtimeLabel(runtime)" :value="runtime.id" />
          </el-select>
          <div v-if="!runtimes.length" class="form-tip">当前项目尚无可更新的运行实例，请先手动发布一次。</div>
        </el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="visible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></span>
    </el-dialog>

    <el-dialog title="新的 Webhook Secret" :visible.sync="secretVisible" width="620px" :close-on-click-modal="false" @closed="generatedSecret = ''">
      <el-alert type="warning" :closable="false" show-icon title="Secret 只在本次显示。关闭后无法再次查看，只能重新轮换。" />
      <el-input class="secret-value" :value="generatedSecret" readonly>
        <el-button slot="append" v-clipboard:copy="generatedSecret" v-clipboard:success="copied">复制</el-button>
      </el-input>
      <p class="secret-help">请将它填写到 Gitea/GitHub Webhook 的 Secret，或 GitLab Webhook 的 Secret token。轮换后旧 Secret 立即失效。</p>
      <span slot="footer"><el-button type="primary" @click="secretVisible = false">我已保存</el-button></span>
    </el-dialog>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import { formatDate } from '@/utils/filters'
import { routeBreadcrumb } from '@/utils/helpers'
import { projectRuntimes } from '@/api/project'
import {
  pipelineHookCreate, pipelineHookDelete, pipelineHookDisable, pipelineHookEnable,
  pipelineHooks, pipelineHookSecretRotate, pipelineHookUpdate, pipelineSimple
} from '@/api/pipeline'

const emptyForm = () => ({
  id: 0,
  pipeline_id: null,
  trigger_type: 'all',
  branch: '',
  status: 1,
  auto_deploy: 0,
  auto_deploy_targets: []
})

export default {
  name: 'ProjectGithook',
  components: { Breadcrumb, EasyTitle },
  filters: { formatDate },
  props: {
    project: { type: Object, default: () => ({}) },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return {
      hooks: [],
      pipelines: [],
      runtimes: [],
      webhook: '',
      secretConfigured: false,
      secretVisible: false,
      generatedSecret: '',
      loading: false,
      visible: false,
      saving: false,
      form: emptyForm(),
      rules: {
        pipeline_id: [{ required: true, message: '请选择流水线', trigger: 'change' }],
        branch: [{ required: true, message: '请输入分支名称', trigger: 'blur' }],
        auto_deploy_targets: [{ type: 'array', required: true, min: 1, message: '请选择自动部署目标', trigger: 'change' }]
      }
    }
  },
  computed: {
    breadcrumb () { return [...routeBreadcrumb(this), { title: '构建', to: '' }, { title: 'Git 触发器', to: '' }] }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      return Promise.all([
        pipelineHooks(this.orgId, this.groupId, this.projectId).then(res => {
          this.hooks = res.data.hooks || []
          this.webhook = res.data.webhook || ''
          this.secretConfigured = Boolean(res.data.webhook_secret_configured)
        }),
        pipelineSimple(this.orgId, this.groupId, this.projectId).then(res => { this.pipelines = res.data.pipelines || [] }),
        projectRuntimes(this.orgId, this.groupId, this.projectId).then(res => { this.runtimes = res.data.runtimes || [] })
      ]).finally(() => { this.loading = false })
    },
    openCreate () { this.visible = true },
    edit (row) {
      const type = row.branch === ':tag' ? 'tag' : row.branch ? 'branch' : 'all'
      this.form = {
        id: row.id,
        pipeline_id: row.pipeline_id,
        trigger_type: type,
        branch: type === 'branch' ? row.branch : '',
        status: row.status,
        auto_deploy: Number(row.auto_deploy || 0),
        auto_deploy_targets: String(row.auto_deploy_target || '').split(',').filter(Boolean).map(Number)
      }
      this.visible = true
    },
    triggerTypeChanged (type) { if (type !== 'branch') this.form.branch = '' },
    save () {
      this.$refs.hookForm.validate(valid => {
        if (!valid) return
        this.saving = true
        const branch = this.form.trigger_type === 'tag' ? ':tag' : this.form.branch
        const targets = this.form.auto_deploy ? this.form.auto_deploy_targets : []
        const request = this.form.id
          ? pipelineHookUpdate(this.orgId, this.groupId, this.projectId, this.form.id, this.form.pipeline_id, branch, this.form.status, this.form.auto_deploy, targets)
          : pipelineHookCreate(this.orgId, this.groupId, this.projectId, this.form.pipeline_id, branch, this.form.status, this.form.auto_deploy, targets)
        request.then(() => { this.$message.success('Git 触发器已保存'); this.visible = false; this.load() }).finally(() => { this.saving = false })
      })
    },
    runtimeLabel (runtime) {
      const env = runtime.env && runtime.env.title ? runtime.env.title : `环境 #${runtime.env_id}`
      const cluster = runtime.cluster && runtime.cluster.title ? runtime.cluster.title : `集群 #${runtime.cluster_id}`
      return `${runtime.name} · ${env} · ${cluster}`
    },
    targetSummary (value) {
      const ids = String(value || '').split(',').filter(Boolean).map(Number)
      const labels = ids.map(id => this.runtimes.find(runtime => Number(runtime.id) === id)).filter(Boolean).map(this.runtimeLabel)
      if (labels.length) return labels.join('、')
      return `${ids.length} 个目标`
    },
    toggle (row) {
      const request = row.status ? pipelineHookDisable : pipelineHookEnable
      request(this.orgId, this.groupId, this.projectId, row.id).then(() => this.load())
    },
    remove (row) {
      this.$confirm('确定删除该 Git 触发器？', '删除触发器', { type: 'warning' }).then(() => pipelineHookDelete(this.orgId, this.groupId, this.projectId, row.id)).then(() => { this.$message.success('已删除'); this.load() })
    },
    rotateSecret () {
      this.$confirm('轮换后远端仓库中保存的旧 Secret 会立即失效。确认继续？', '轮换 Webhook Secret', { type: 'warning' }).then(() => {
        return pipelineHookSecretRotate(this.orgId, this.groupId, this.projectId)
      }).then(res => {
        this.generatedSecret = res.data.secret
        this.secretConfigured = true
        this.secretVisible = true
      }).catch(() => {})
    },
    copied () { this.$message.success('Webhook URL 已复制') },
    reset () { this.form = emptyForm(); if (this.$refs.hookForm) this.$refs.hookForm.clearValidate() }
  }
}
</script>

<style lang="scss" scoped>
.toolbar { display: flex; gap: 10px; margin: 18px 0; }
.secret-status { margin-top: 12px; }
.secret-value { margin-top: 18px; }
.secret-help { color: #606266; line-height: 1.7; }
.target-summary { margin-left: 8px; color: #606266; font-size: 12px; }
.muted, .form-tip { color: #909399; font-size: 12px; }
.form-tip { margin-left: 10px; }
code { margin: 0 8px; word-break: break-all; }
</style>
