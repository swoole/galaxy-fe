<template>
  <div class="project-container artifact-list-page">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <el-card shadow="never" class="artifact-card">
      <div slot="header" class="page-header">
        <div>
          <h3>产物列表</h3>
          <p>集中管理项目构建生成或从 Registry 登记的 OCI 镜像</p>
        </div>
        <el-button
          v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role)"
          type="primary"
          size="small"
          icon="el-icon-plus"
          @click="openImport">登记已有镜像</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" fit empty-text="暂无镜像产物">
        <el-table-column label="镜像" min-width="280">
          <template #default="{ row }">
            <image-reference
              :max-width="480"
              :value="row.reference"
              :digest="row.digest || ''"
              :size="row.size || 0"
              :created-at="row.created_at || 0"
              clickable
              @click="showImage(row)" />
            <div class="cell-sub mono" :title="row.digest">{{ shortDigest(row.digest) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="尺寸" width="115">
          <template #default="{ row }">{{ formatBytes(row.size) }}</template>
        </el-table-column>
        <el-table-column label="操作系统" width="120">
          <template #default="{ row }">{{ platformPart(row, 0) }}</template>
        </el-table-column>
        <el-table-column label="CPU 架构" width="130">
          <template #default="{ row }">
            <span>{{ platformPart(row, 1) }}</span>
            <el-tooltip v-if="platformCount(row) > 1" :content="platforms(row).join('、')">
              <el-tag size="mini" type="info">+{{ platformCount(row) - 1 }}</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="登记时间" width="165">
          <template #default="{ row }">{{ row.created_at | formatDate }}</template>
        </el-table-column>
        <el-table-column label="操作" width="250" align="right" fixed="right">
          <template #default="{ row }">
            <el-link type="primary" @click="showImage(row)">详情</el-link>
            <template v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role)">
              <el-divider direction="vertical" />
              <artifact-release-actions
                :artifact="row"
                :org-id="orgId"
                :group-id="groupId"
                :project-id="projectId"
                mode="link" />
            </template>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" :total="total" :page.sync="page" :limit.sync="pageSize" @pagination="load" />
    </el-card>

    <el-dialog title="登记已有 OCI 镜像" :visible.sync="importVisible" width="620px" @closed="resetImportForm">
      <el-alert title="平台会读取 Registry Manifest 验证镜像存在并记录不可变 Digest；不会拉取或重新推送镜像。" type="info" :closable="false" show-icon />
      <el-form ref="importForm" :model="importForm" :rules="importRules" label-width="105px" class="import-form">
        <el-form-item label="Registry" prop="registry_id">
          <el-select v-model="importForm.registry_id" style="width: 100%" placeholder="请选择 Registry" @change="registryChanged">
            <el-option v-for="item in registries" :key="item.id" :label="`${item.address || 'Docker Hub'}/${item.namespace || ''}`" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="镜像名称" prop="image_name">
          <el-input v-model.trim="importForm.image_name" placeholder="只填写镜像名，例如 swoole-aot" @change="imageNameChanged" />
          <div class="form-tip">无需填写 Registry 或 namespace。</div>
        </el-form-item>
        <el-form-item label="Tag" prop="tag">
          <el-input v-model.trim="importForm.tag" placeholder="根据最近版本自动建议，也可手工修改" />
          <div class="form-tip">优先将同名镜像最近的数字版本递增一位；无法推导时使用 latest。</div>
          <div class="form-tip">完整镜像地址：<code>{{ importImageReference || '-' }}</code></div>
        </el-form-item>
        <el-form-item label="备注" prop="remark"><el-input v-model.trim="importForm.remark" maxlength="500" show-word-limit placeholder="镜像来源和用途" /></el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="importVisible = false">取消</el-button><el-button type="primary" :loading="importing" @click="submitImport">验证并登记</el-button></span>
    </el-dialog>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import ArtifactReleaseActions from '@/views/project/components/ArtifactReleaseActions'
import Pagination from '@/components/Pagination'
import { buildArtifactImport, buildArtifacts, projectRegistries } from '@/api/project'
import { formatDate } from '@/utils/filters'
import { routeBreadcrumb } from '@/utils/helpers'
import { nextOciImageTag, ociImageReference, projectArtifactRepository } from '@/utils/ociImage'

const emptyImport = () => ({ registry_id: null, image_name: '', tag: '', remark: '' })

export default {
  name: 'ProjectArtifacts',
  components: { ArtifactReleaseActions, Breadcrumb, Pagination },
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
      recentArtifactReferences: [],
      registries: [],
      loading: false,
      importing: false,
      importVisible: false,
      page: 1,
      pageSize: 20,
      total: 0,
      importForm: emptyImport(),
      importRules: {
        registry_id: [{ required: true, message: '请选择 Registry', trigger: 'change' }],
        image_name: [
          { required: true, message: '请输入镜像名称', trigger: 'blur' },
          {
            pattern: /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
            message: '镜像名称不能包含 Registry 或 namespace，只能使用小写字母、数字及 . _ -',
            trigger: 'blur'
          }
        ],
        tag: [{ required: true, message: '请输入镜像 Tag', trigger: 'blur' }],
        remark: [{ required: true, message: '请输入登记备注', trigger: 'blur' }]
      }
    }
  },
  computed: {
    breadcrumb () { return [...routeBreadcrumb(this), { title: '构建', to: '' }, { title: '产物列表', to: '' }] },
    selectedRegistry () {
      return this.registries.find(item => String(item.id) === String(this.importForm.registry_id)) || null
    },
    importRepository () {
      const registry = this.selectedRegistry
      return registry ? projectArtifactRepository(registry.namespace, this.importForm.image_name) : ''
    },
    importImageReference () {
      const registry = this.selectedRegistry
      if (!registry) return ''
      return ociImageReference(registry.address, this.importRepository, this.importForm.tag)
    }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      return buildArtifacts(this.orgId, this.groupId, this.projectId, this.page, this.pageSize).then(res => {
        this.rows = res.data.data || []
        if (Number(res.data.page || this.page) === 1) {
          this.recentArtifactReferences = this.rows.map(item => item.reference).filter(Boolean)
          if (this.importVisible && (!this.importForm.tag || this.importForm.tag === 'latest')) {
            this.importForm.tag = this.suggestedImportTag()
          }
        }
        this.total = Number(res.data.total || 0)
        this.page = Number(res.data.page || 1)
        this.pageSize = Number(res.data.pagesize || this.pageSize)
      }).finally(() => { this.loading = false })
    },
    openImport () {
      const ready = this.registries.length ? Promise.resolve() : projectRegistries(this.orgId, this.groupId, this.projectId, true).then(res => { this.registries = res.data.registries || [] })
      ready.then(() => {
        if (!this.importForm.registry_id && this.registries.length) {
          this.importForm.registry_id = this.registries[0].id
          this.registryChanged(this.importForm.registry_id)
        }
        this.importVisible = true
      })
    },
    registryChanged (id) {
      const registry = this.registries.find(item => String(item.id) === String(id))
      if (registry) {
        this.importForm.image_name = projectArtifactRepository('', this.project.image_name)
        this.importForm.tag = this.suggestedImportTag()
      }
    },
    imageNameChanged () {
      if (!this.importForm.tag || this.importForm.tag === 'latest') {
        this.importForm.tag = this.suggestedImportTag()
      }
    },
    suggestedImportTag () {
      return nextOciImageTag(this.recentArtifactReferences, this.importRepository)
    },
    submitImport () {
      this.$refs.importForm.validate(valid => {
        if (!valid) return
        if (!this.selectedRegistry) return this.$message.warning('请选择 Registry')
        this.importing = true
        const { image_name: imageName, ...payload } = this.importForm
        payload.repository = projectArtifactRepository(this.selectedRegistry.namespace, imageName)
        buildArtifactImport(this.orgId, this.groupId, this.projectId, payload).then(() => {
          this.$message.success('已有镜像已验证并登记为可发布制品')
          this.importVisible = false
          this.page = 1
          this.load()
        }).finally(() => { this.importing = false })
      })
    },
    resetImportForm () {
      this.importForm = emptyImport()
      if (this.$refs.importForm) this.$refs.importForm.clearValidate()
    },
    showImage (artifact) { this.$router.push({ name: 'ProjectImageDetail', params: { groupId: this.groupId, projectId: this.projectId, artifactId: artifact.id } }) },
    imageName (reference) { return String(reference || '-').split('/').pop() },
    shortDigest (digest) { return digest ? `${digest.slice(0, 19)}…${digest.slice(-8)}` : '-' },
    platforms (row) { return Array.isArray(row.metadata && row.metadata.platforms) ? row.metadata.platforms : [] },
    platformCount (row) { return this.platforms(row).length },
    platformPart (row, index) { const first = this.platforms(row)[0]; return first ? (first.split('/')[index] || '-') : '-' },
    formatBytes (bytes) {
      const value = Number(bytes || 0)
      if (!value) return '-'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
      return `${(value / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`
    }
  }
}
</script>

<style lang="scss" scoped>
.artifact-card { border-radius: 10px; margin: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-header h3 { margin: 0 0 6px; color: #263445; font-size: 18px; }
.page-header p { margin: 0; color: #909399; font-size: 13px; }
.summary-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 12px 16px; border-radius: 8px; background: #f7f9fc; color: #606266; }
.summary-bar strong { color: #409eff; font-size: 20px; }
.summary-tip { margin-left: auto; color: #a2a7b0; font-size: 12px; }
.image-reference { max-width: 100%; font-weight: 600; }
.cell-sub { margin-top: 5px; color: #909399; font-size: 12px; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.import-form { margin-top: 20px; }
.form-tip { margin-top: 6px; color: #909399; font-size: 12px; line-height: 20px; }
@media (max-width: 1100px) { .summary-tip { display: none; } }
</style>
