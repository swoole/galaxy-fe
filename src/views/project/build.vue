<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <el-card shadow="never" class="build-card">
        <div slot="header" class="page-header">
          <div>
            <h3>镜像制品与构建</h3>
            <p>从确定的代码版本生成可追溯、可部署的 OCI 镜像</p>
          </div>
          <div v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role)" class="header-actions">
            <el-button v-if="project.develop" type="primary" size="small" icon="el-icon-plus" @click="openBuild">新建构建</el-button>
          </div>
        </div>

        <div class="filter-bar">
          <div class="filters">
            <el-select v-model="filters.pipeline_id" clearable size="small" placeholder="全部流水线" @change="search">
            <el-option v-for="item in pipelines" :key="item.id" :label="item.title" :value="item.id" />
            </el-select>
            <el-select v-model="filters.status" clearable size="small" placeholder="全部状态" @change="search">
            <el-option v-for="(item, status) in statuses" :key="status" :label="item.label" :value="Number(status)" />
            </el-select>
          </div>
          <span class="result-count">共 {{ total }} 个构建任务</span>
        </div>

        <el-table v-loading="loading" :data="rows" fit class="build-table" empty-text="暂无构建任务">
        <el-table-column label="任务" width="92">
          <template #default="{ row }">
            <el-link class="task-id" type="primary" :underline="false" @click="showLog(row)">#{{ row.id }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="代码版本" min-width="180">
          <template #default="{ row }">
            <div class="version-name">{{ row.executor === 'external-image' ? '已有镜像' : row.branch }}</div>
            <div class="cell-sub mono">{{ shortRevision(row.source_revision || row.commit_id) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="流水线" min-width="145">
          <template #default="{ row }">
            {{ row.executor === 'external-image' ? 'Registry 导入' : (row.pipeline ? row.pipeline.title : `#${row.pipeline_id}`) }}
            <el-tag v-if="row.pipeline && row.pipeline.archived_at" size="mini" type="info">已归档</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="镜像产物" min-width="230">
          <template #default="{ row }">
            <template v-if="row.artifacts && row.artifacts.length">
              <image-reference
                :value="row.artifacts[0].reference"
                :digest="row.artifacts[0].digest || ''"
                :size="row.artifacts[0].size || 0"
                :created-at="row.artifacts[0].created_at || 0"
                clickable
                compact
                @click="showImage(row.artifacts[0])" />
              <span v-if="row.artifacts.length > 1" class="artifact-more">+{{ row.artifacts.length - 1 }}</span>
              <div v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role)" class="artifact-actions">
                <artifact-release-actions
                  :artifact="row.artifacts[0]"
                  :org-id="orgId"
                  :group-id="groupId"
                  :project-id="projectId"
                  mode="link" />
              </div>
            </template>
            <span v-else class="cell-sub">尚未生成</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="190" show-overflow-tooltip />
        <el-table-column label="状态" width="105" align="center">
          <template #default="{ row }">
            <el-tag :type="tagType(statusOf(row.status).type)" size="small">{{ statusOf(row.status).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100" align="center">
          <template #default="{ row }">{{ duration(row) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="158">
          <template #default="{ row }"><span class="date-text">{{ row.created_at | formatDate }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="205" align="right" fixed="right">
          <template #default="{ row }">
            <el-link v-if="row.artifacts && row.artifacts.length" type="primary" @click="showImage(row.artifacts[0])">镜像详情</el-link>
            <el-divider v-if="row.artifacts && row.artifacts.length" direction="vertical" />
            <el-link type="primary" @click="showLog(row)">日志</el-link>
            <template v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role)">
              <el-divider direction="vertical" />
              <el-link v-if="isActive(row.status)" type="danger" @click="cancel(row)">取消</el-link>
              <el-link v-else-if="row.executor !== 'external-image' && row.pipeline && !row.pipeline.archived_at" type="primary" @click="rebuild(row)">重新构建</el-link>
              <span v-else-if="row.executor !== 'external-image'" class="secondary">流水线已归档</span>
            </template>
          </template>
        </el-table-column>
        </el-table>
        <pagination
          v-show="total > 0"
          :total="total"
          :page.sync="page"
          :limit.sync="pageSize"
          @pagination="load" />
      </el-card>

    <el-dialog title="新建镜像构建" :visible.sync="buildVisible" width="620px" @closed="resetBuildForm">
      <el-alert
        title="构建会锁定一个确定的 Git Commit，并通过所选流水线将镜像推送至仓库。"
        type="info"
        :closable="false"
        show-icon />
      <el-form ref="buildForm" :model="buildForm" :rules="buildRules" label-width="90px" class="build-form">
        <el-form-item label="流水线" prop="pipeline_id">
          <el-select v-model="buildForm.pipeline_id" placeholder="请选择 BuildKit 流水线" style="width: 100%">
            <el-option v-for="item in pipelines" :key="item.id" :label="item.title" :value="item.id" />
          </el-select>
        </el-form-item>
        <template v-if="referenceMode === 'provider'">
        <el-form-item label="版本来源">
          <el-radio-group v-model="buildForm.revision_type" @change="providerRevisionTypeChanged">
            <el-radio-button label="commit">分支 Commit</el-radio-button>
            <el-radio-button label="tag">Git Tag</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="buildForm.revision_type === 'commit'" label="Git 分支" prop="branch">
          <div class="reference-select">
            <el-select v-model="buildForm.branch" :loading="branchesLoading" filterable placeholder="请选择分支" @change="selectBranch">
              <el-option v-for="item in branches" :key="branchValue(item)" :label="branchLabel(item)" :value="branchValue(item)" />
            </el-select>
            <el-button icon="el-icon-refresh" :loading="branchesLoading" title="通过 Git Provider API 刷新" @click="loadReferences(true)" />
          </div>
        </el-form-item>
        <el-form-item v-if="buildForm.revision_type === 'commit'" label="Git Commit" prop="commit_id">
          <div class="reference-select">
            <el-select
              v-model="buildForm.commit_id"
              :loading="commitsLoading"
              filterable
              placeholder="请选择确定版本"
              @change="selectCommit">
              <el-option
                v-for="item in commits"
                :key="commitValue(item)"
                :label="commitLabel(item)"
                :value="commitValue(item)" />
            </el-select>
            <el-button icon="el-icon-refresh" :disabled="!buildForm.branch" :loading="commitsLoading" title="从远程仓库刷新提交" @click="loadCommits(true)" />
          </div>
        </el-form-item>
        <el-form-item v-else label="Git Tag" prop="branch">
          <div class="reference-select">
            <el-select v-model="buildForm.branch" :loading="branchesLoading" filterable placeholder="请选择 Tag" @change="selectTag">
              <el-option v-for="item in tags" :key="branchValue(item)" :label="branchLabel(item)" :value="branchValue(item)" />
            </el-select>
            <el-button icon="el-icon-refresh" :loading="branchesLoading" title="通过 Git Provider API 刷新" @click="loadReferences(true)" />
          </div>
          <div v-if="buildForm.branch" class="reference-hint">构建时会将该 Tag 冻结为实际 Commit SHA，后续重新构建不会受 Tag 移动影响。</div>
        </el-form-item>
        </template>
        <template v-else>
          <el-alert class="manual-reference-tip" type="info" :closable="false" title="当前用户未配置匹配此仓库的 Git Provider Token；Galaxy 不会访问仓库，请手工填写版本。" />
          <el-form-item label="版本类型">
            <el-radio-group v-model="buildForm.revision_type" @change="manualRevisionTypeChanged">
              <el-radio-button label="commit">Commit SHA</el-radio-button>
              <el-radio-button label="tag">Git Tag</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="buildForm.revision_type === 'commit'" label="Commit SHA" prop="commit_id">
            <el-input v-model.trim="buildForm.commit_id" placeholder="请输入 7-64 位 Git Commit SHA" />
          </el-form-item>
          <el-form-item v-else label="Git Tag" prop="branch">
            <el-input v-model.trim="buildForm.branch" placeholder="例如 v1.2.0" />
          </el-form-item>
        </template>
        <el-form-item label="备注" prop="remark">
          <el-input v-model.trim="buildForm.remark" maxlength="500" show-word-limit placeholder="本次构建说明" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="buildVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitBuild">开始构建</el-button>
      </span>
    </el-dialog>

    <build-log ref="buildLog" :org-id="orgId" @finish="load" />
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import BuildLog from '@/views/project/components/BuildLog'
import ArtifactReleaseActions from '@/views/project/components/ArtifactReleaseActions'
import Pagination from '@/components/Pagination'
import { buildCancel, buildCreate, buildRebuild, builds, gitBranches, gitCommits, gitTags } from '@/api/project'
import { pipelineSimple } from '@/api/pipeline'
import { STATUSES, STATUS_PENDING, STATUS_RUNNING } from '@/consts/pipeline'
import { formatDate } from '@/utils/filters'
import { routeBreadcrumb } from '@/utils/helpers'

const emptyBuild = () => ({ pipeline_id: null, branch: 'manual', commit_id: '', revision_type: 'commit', remark: '' })
export default {
  name: 'ProjectBuild',
  components: { ArtifactReleaseActions, Breadcrumb, BuildLog, Pagination },
  filters: { formatDate },
  props: {
    project: { type: Object, default: () => ({}) },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return {
      rows: [],
      pipelines: [],
      branches: [],
      tags: [],
      commits: [],
      referenceMode: 'manual',
      statuses: STATUSES,
      filters: { pipeline_id: null, status: null },
      page: 1,
      pageSize: 20,
      total: 0,
      loading: false,
      buildVisible: false,
      submitting: false,
      branchesLoading: false,
      commitsLoading: false,
      refreshTimer: null,
      buildForm: emptyBuild(),
      buildRules: {
        pipeline_id: [{ required: true, message: '请选择流水线', trigger: 'change' }],
        branch: [{ required: true, message: '请选择 Git 分支', trigger: 'change' }],
        commit_id: [{ required: true, message: '请选择 Git Commit', trigger: 'change' }],
        remark: [{ required: true, message: '请输入构建备注', trigger: 'blur' }]
      }
    }
  },
  computed: {
    breadcrumb () {
      return [...routeBreadcrumb(this), { title: '构建', to: '' }, { title: '构建记录', to: '' }]
    }
  },
  created () {
    const pipelineId = Number(this.$route.query.pipeline_id || 0)
    this.filters.pipeline_id = pipelineId || null
    this.loadPipelines()
    this.load()
  },
  beforeDestroy () {
    this.clearRefresh()
  },
  methods: {
    loadPipelines () {
      return pipelineSimple(this.orgId, this.groupId, this.projectId).then(res => {
        this.pipelines = res.data.pipelines || res.data.data || []
      })
    },
    load () {
      this.loading = true
      this.clearRefresh()
      return builds(this.orgId, this.groupId, this.projectId, this.filters.pipeline_id, this.filters.status, null, this.page, this.pageSize).then(res => {
        this.rows = res.data.data || []
        this.total = Number(res.data.total || 0)
        this.page = Number(res.data.page || 1)
        this.pageSize = Number(res.data.pagesize || this.pageSize)
        if (this.rows.some(row => this.isActive(row.status))) {
          this.refreshTimer = setTimeout(this.load, 5000)
        }
      }).finally(() => { this.loading = false })
    },
    search () {
      this.page = 1
      this.load()
    },
    openBuild () {
      Promise.all([
        this.pipelines.length ? Promise.resolve() : this.loadPipelines(),
        this.loadReferences(false)
      ]).then(() => {
        this.buildForm.pipeline_id = this.filters.pipeline_id || (this.pipelines[0] && this.pipelines[0].id) || null
        this.buildVisible = true
      })
    },
    loadReferences (refresh = false) {
      this.branchesLoading = true
      return Promise.all([
        gitBranches(this.orgId, this.groupId, this.projectId, refresh),
        gitTags(this.orgId, this.groupId, this.projectId, refresh)
      ]).then(([branchRes, tagRes]) => {
        this.referenceMode = branchRes.data.mode || 'manual'
        if (this.referenceMode === 'provider' && this.buildForm.branch === 'manual') this.buildForm.branch = ''
        if (this.referenceMode === 'manual' && this.buildForm.revision_type === 'commit') this.buildForm.branch = 'manual'
        this.branches = branchRes.data.branches || []
        this.tags = tagRes.data.tags || []
        const activeReferences = this.buildForm.revision_type === 'tag' ? this.tags : this.branches
        if (refresh && this.buildForm.branch && !activeReferences.some(item => this.branchValue(item) === this.buildForm.branch)) {
          this.buildForm.branch = ''
          this.buildForm.commit_id = ''
          this.commits = []
        }
      }).finally(() => { this.branchesLoading = false })
    },
    providerRevisionTypeChanged (type) {
      this.buildForm.branch = ''
      this.buildForm.commit_id = ''
      this.commits = []
      if (this.$refs.buildForm) this.$refs.buildForm.clearValidate(['branch', 'commit_id'])
    },
    selectBranch () {
      this.buildForm.commit_id = ''
      this.commits = []
      this.loadCommits(false)
    },
    selectTag (value) {
      this.buildForm.commit_id = value
      if (!this.buildForm.remark) this.buildForm.remark = `构建 Tag ${value}`
    },
    manualRevisionTypeChanged (type) {
      this.buildForm.branch = type === 'commit' ? 'manual' : ''
      this.buildForm.commit_id = ''
    },
    loadCommits (refresh = false) {
      this.buildForm.commit_id = ''
      this.commits = []
      if (!this.buildForm.branch) return
      this.commitsLoading = true
      gitCommits(this.orgId, this.groupId, this.projectId, this.buildForm.branch, refresh).then(res => {
        this.commits = res.data.commits || []
        if (this.commits.length) {
          this.buildForm.commit_id = this.commitValue(this.commits[0])
          this.selectCommit(this.buildForm.commit_id)
        }
      }).finally(() => { this.commitsLoading = false })
    },
    selectCommit (value) {
      const commit = this.commits.find(item => this.commitValue(item) === value)
      if (commit && !this.buildForm.remark) this.buildForm.remark = commit.message || commit.title || `构建 ${value.slice(0, 12)}`
    },
    submitBuild () {
      if (this.buildForm.revision_type === 'tag') this.buildForm.commit_id = this.buildForm.branch
      if (this.referenceMode === 'manual' && this.buildForm.revision_type === 'commit') this.buildForm.branch = 'manual'
      this.$refs.buildForm.validate(valid => {
        if (!valid) return
        this.submitting = true
        const form = this.buildForm
        buildCreate(this.orgId, this.groupId, this.projectId, form.pipeline_id, form.branch, form.commit_id, form.remark, 0, form.revision_type).then(res => {
          const build = res.data.build
          this.$message.success(build && build.id ? `构建任务 #${build.id} 已提交` : '构建任务已提交')
          this.buildVisible = false
          this.load()
          if (build && build.id) this.$nextTick(() => this.$refs.buildLog.show(this.groupId, this.projectId, build.id))
        }).finally(() => { this.submitting = false })
      })
    },
    resetBuildForm () {
      this.buildForm = emptyBuild()
      this.commits = []
      if (this.$refs.buildForm) this.$refs.buildForm.clearValidate()
    },
    showLog (row) {
      this.$refs.buildLog.show(this.groupId, this.projectId, row.id)
    },
    showImage (artifact) {
      this.$router.push({
        name: 'ProjectImageDetail',
        params: { groupId: this.groupId, projectId: this.projectId, artifactId: artifact.id }
      })
    },
    rebuild (row) {
      this.$confirm(`使用 ${row.commit_id} 重新执行构建？`, '重新构建', { type: 'warning' }).then(() => {
        buildRebuild(this.orgId, this.groupId, this.projectId, row.id).then(res => {
          const build = res.data.build
          this.$message.success(build && build.id ? `重新构建任务 #${build.id} 已提交` : '重新构建任务已提交')
          this.load()
          if (build) this.$refs.buildLog.show(this.groupId, this.projectId, build.id)
        })
      })
    },
    cancel (row) {
      this.$confirm(`确定取消构建 #${row.id}？`, '取消构建', { type: 'warning' }).then(() => {
        buildCancel(this.orgId, this.groupId, this.projectId, row.id).then(() => {
          this.$message.success('已发送取消请求')
          this.load()
        })
      })
    },
    statusOf (status) {
      return STATUSES[Number(status)] || { label: '未知', type: 'info' }
    },
    tagType (type) {
      return type === 'error' ? 'danger' : type
    },
    isActive (status) {
      return [STATUS_PENDING, STATUS_RUNNING].includes(Number(status))
    },
    duration (row) {
      if (!row.start_at) return '-'
      const end = row.end_at || Math.floor(Date.now() / 1000)
      const seconds = Math.max(0, end - row.start_at)
      if (seconds < 60) return `${seconds}s`
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    },
    branchValue (item) {
      return typeof item === 'string' ? item : item.name || item.branch || item.value
    },
    branchLabel (item) {
      if (typeof item === 'string') return item
      return item.name || item.branch || item.value
    },
    commitValue (item) {
      return item.hash || item.id || item.sha || ''
    },
    commitLabel (item) {
      const hash = this.commitValue(item)
      return `${hash.slice(0, 12)}  ${item.message || item.title || ''}`
    },
    shortRevision (value) {
      return value ? String(value).slice(0, 12) : '-'
    },
    shortImageTag (reference) {
      const value = String(reference || '').split('@')[0]
      const slash = value.lastIndexOf('/')
      const colon = value.lastIndexOf(':')
      const tag = colon > slash ? value.slice(colon + 1) : 'latest'
      return tag.length > 16 ? `${tag.slice(0, 13)}…` : tag
    },
    clearRefresh () {
      if (this.refreshTimer) clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }
}
</script>

<style lang="scss" scoped>
.project-main { padding-bottom: 28px; }
.build-card { overflow: hidden; border: 1px solid #e9edf3; border-radius: 10px; margin: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-header h3 { margin: 0; color: #263445; font-size: 17px; font-weight: 600; }
.page-header p { margin: 6px 0 0; color: #909399; font-size: 12px; }
.header-actions { display: flex; gap: 8px; }
.filter-bar { display: flex; align-items: center; justify-content: space-between; margin: -2px 0 12px; padding: 10px 12px; border-radius: 7px; background: #f7f9fc; }
.filters { display: flex; gap: 10px; }
.filters .el-select { width: 165px; }
.result-count { color: #909399; font-size: 12px; }
.task-id { font-family: SFMono-Regular, Consolas, monospace; font-size: 12px; font-weight: 600; }
.version-name { overflow: hidden; color: #303133; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.cell-sub { margin-top: 4px; color: #9aa1ac; font-size: 11px; }
.mono { font-family: SFMono-Regular, Consolas, monospace; }
.image-tag { max-width: 150px; overflow: hidden; font-family: SFMono-Regular, Consolas, monospace; font-size: 12px; text-overflow: ellipsis; vertical-align: middle; white-space: nowrap; }
.artifact-more { margin-left: 7px; color: #909399; font-size: 11px; }
.artifact-actions { margin-top: 6px; font-size: 12px; }
.date-text { color: #606266; font-size: 12px; }
.secondary { display: block; margin-top: 4px; color: #909399; font-size: 12px; }
.build-form { margin-top: 20px; }
.reference-select { display: flex; gap: 8px; }
.reference-select .el-select { flex: 1; }
.manual-reference-tip { margin-bottom: 18px; }
.reference-hint { margin-top: 7px; color: #909399; font-size: 12px; line-height: 1.5; }
::v-deep .build-card > .el-card__header { padding: 17px 20px; border-bottom-color: #edf0f4; }
::v-deep .build-card > .el-card__body { padding: 16px 20px 4px; }
::v-deep .build-table th { color: #737b88; font-size: 12px; font-weight: 500; background: #fff; }
::v-deep .build-table td { padding: 13px 0; }
::v-deep .build-table::before { display: none; }
@media (max-width: 900px) {
  .page-header, .filter-bar { align-items: flex-start; flex-direction: column; gap: 12px; }
  .filters { width: 100%; }
  .filters .el-select { flex: 1; width: auto; }
}
</style>
