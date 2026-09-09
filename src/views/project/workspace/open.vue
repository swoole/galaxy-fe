<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />

    <div class="project-main" v-loading="loading">
      <el-alert
        title="选择一个 Web IDE Workspace。首次打开时会自动 Clone 项目仓库，后续直接打开已映射的项目目录。"
        type="info"
        :closable="false"
        show-icon
        class="intro" />

      <easy-title title="项目仓库" margin-set="0 20" />
      <el-descriptions :column="1" border size="small" class="repository">
        <el-descriptions-item label="项目">{{ project.title || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Clone 地址"><code>{{ repository.clone_url || '-' }}</code></el-descriptions-item>
        <el-descriptions-item label="默认分支">{{ repository.default_branch || 'main' }}</el-descriptions-item>
        <el-descriptions-item label="Workspace 路径"><code>{{ profile.default_workdir || '-' }}</code></el-descriptions-item>
      </el-descriptions>

      <easy-title title="选择 Workspace" margin-set="24 20" />
      <el-empty v-if="!loading && !webIdeWorkspaces.length" description="当前项目组没有可用的 Web IDE Workspace">
        <el-button type="primary" size="small" @click="goWorkspace">创建 Workspace</el-button>
      </el-empty>
      <el-form v-else label-width="130px" class="open-form" @submit.native.prevent>
        <el-form-item label="Workspace">
          <el-select v-model="workspaceId" placeholder="请选择 Workspace" filterable class="field">
            <el-option
              v-for="workspace in webIdeWorkspaces"
              :key="workspace.id"
              :label="workspaceLabel(workspace)"
              :value="workspace.id"
              :disabled="workspace.status !== 'running'" />
          </el-select>
        </el-form-item>
        <el-form-item label="Git 分支">
          <el-input
            v-model.trim="branch"
            maxlength="255"
            class="field"
            placeholder="main"
            :disabled="selectedMapping && selectedMapping.status === 'ready'" />
        </el-form-item>
        <el-form-item v-if="selectedMapping" label="当前映射">
          <el-tag size="small" :type="mappingTagType">{{ mappingStatus }}</el-tag>
          <span class="mapping-path"><code>{{ selectedMapping.workdir }}</code></span>
          <div v-if="selectedMapping.last_commit" class="mapping-detail">
            Commit <code>{{ selectedMapping.last_commit.slice(0, 12) }}</code>
          </div>
          <div v-if="selectedMapping.error" class="mapping-error">{{ selectedMapping.error }}</div>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="opening"
            :disabled="!selectedWorkspace || selectedWorkspace.status !== 'running'"
            @click="openWorkspace">
            {{ selectedMapping && selectedMapping.status === 'ready' ? '打开 Web IDE' : 'Clone 并打开 Web IDE' }}
          </el-button>
          <span class="hint">打开后 Web IDE 将自动定位到项目目录</span>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import { routeBreadcrumb } from '@/utils/helpers'
import { workspaceProjectOpen, workspaceProjectProfile } from '@/api/workspace'

export default {
  name: 'ProjectWorkspaceOpen',
  components: { Breadcrumb, EasyTitle },
  props: {
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return {
      loading: false,
      opening: false,
      profile: {},
      project: {},
      repository: {},
      workspaces: [],
      workspaceId: null,
      branch: ''
    }
  },
  computed: {
    breadcrumb () {
      return [...routeBreadcrumb(this), { title: '代码', to: '' }, { title: this.$route.meta.title, to: '' }]
    },
    webIdeWorkspaces () {
      return this.workspaces.filter(workspace => workspace.mode === 'web-ide')
    },
    selectedWorkspace () {
      return this.webIdeWorkspaces.find(workspace => Number(workspace.id) === Number(this.workspaceId)) || null
    },
    selectedMapping () {
      return this.selectedWorkspace ? this.selectedWorkspace.repository_mapping : null
    },
    mappingStatus () {
      return ({ pending: '待 Clone', cloning: 'Clone 中', ready: '已就绪', error: '失败' })[this.selectedMapping.status] || this.selectedMapping.status
    },
    mappingTagType () {
      return ({ pending: 'info', cloning: 'warning', ready: 'success', error: 'danger' })[this.selectedMapping.status] || 'info'
    }
  },
  created () {
    this.loadProfile()
  },
  watch: {
    workspaceId () {
      this.branch = (this.selectedMapping && this.selectedMapping.branch) || this.repository.default_branch || 'main'
    }
  },
  methods: {
    loadProfile () {
      this.loading = true
      workspaceProjectProfile(this.orgId, this.groupId, this.projectId).then(res => {
        this.profile = res.data || {}
        this.project = this.profile.project || {}
        this.repository = this.profile.repository || {}
        this.workspaces = this.profile.workspaces || []
        this.branch = this.repository.default_branch || 'main'
        const preferred = this.webIdeWorkspaces.find(workspace => workspace.status === 'running') || this.webIdeWorkspaces[0]
        this.workspaceId = preferred ? preferred.id : null
      }).finally(() => { this.loading = false })
    },
    workspaceLabel (workspace) {
      const state = workspace.status === 'running' ? '运行中' : '不可用'
      return `${workspace.title} · ${state}`
    },
    openWorkspace () {
      if (!this.selectedWorkspace) return
      const ideWindow = window.open('about:blank', '_blank')
      this.opening = true
      workspaceProjectOpen(this.orgId, this.groupId, this.projectId, this.workspaceId, this.branch).then(res => {
        const result = res.data || {}
        this.selectedWorkspace.repository_mapping = result.mapping || null
        if (ideWindow) {
          ideWindow.location.replace(result.access_url)
        } else {
          window.location.href = result.access_url
        }
        this.$message.success(result.cloned ? '仓库 Clone 完成，正在打开 Web IDE' : '正在打开已映射的项目目录')
      }).catch(() => {
        if (ideWindow) ideWindow.close()
        this.loadProfile()
      }).finally(() => { this.opening = false })
    },
    goWorkspace () {
      this.$router.push({ name: 'DevEnv' })
    }
  }
}
</script>

<style lang="scss" scoped>
.intro { margin-bottom: 20px; }
.repository { max-width: 900px; }
.open-form { max-width: 760px; }
.field { width: 460px; }
.mapping-path, .hint { margin-left: 12px; color: #909399; font-size: 12px; }
.mapping-detail { margin-top: 6px; color: #606266; }
.mapping-error { margin-top: 6px; color: #f56c6c; white-space: pre-wrap; }
</style>
