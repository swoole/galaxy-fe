<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <div class="project-main" v-loading="loading">
      <div class="header">
        <easy-title title="BuildKit 流水线" margin-set="0 20" />
        <router-link
          v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role)"
          :to="{ name: 'ProjectPipelineEdit', params: { groupId, projectId, pipelineId } }">
          <el-button type="primary" size="small">编辑</el-button>
        </router-link>
      </div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="名称">{{ profile.title }}</el-descriptions-item>
        <el-descriptions-item label="执行器">{{ profile.runner_kind }}</el-descriptions-item>
        <el-descriptions-item label="Schema">{{ profile.schema_version }}</el-descriptions-item>
        <el-descriptions-item label="构建集群">{{ clusterName }}</el-descriptions-item>
        <el-descriptions-item label="版本">{{ profile.version }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ (profile.updated_at || profile.created_at) | formatDate }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ profile.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
      <easy-title title="执行定义" margin-set="24 16" />
      <yaml-editor v-model="profile.yml" readonly class="pipeline-yaml" />

      <div class="secret-header">
        <easy-title title="构建 Secrets" margin-set="24 16" />
        <span class="secret-tip">只显示名称和状态，值不会从后端返回。</span>
      </div>
      <el-empty v-if="!secrets.length" description="当前 Pipeline 未在 build.secrets 中声明 Secret" :image-size="72" />
      <el-table v-else :data="secrets" border size="small">
        <el-table-column prop="name" label="名称" min-width="220"><template #default="{ row }"><code>{{ row.name }}</code></template></el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }"><el-tag :type="row.configured ? 'success' : 'danger'" size="small">{{ row.configured ? '已配置' : '缺失' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="最后更新" min-width="180"><template #default="{ row }">{{ row.updated_at ? formatDate(row.updated_at) : '-' }}</template></el-table-column>
        <el-table-column v-if="canManage" label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-link type="primary" @click="openSecret(row)">{{ row.configured ? '轮换' : '配置' }}</el-link>
            <template v-if="row.configured"><el-divider direction="vertical" /><el-link type="danger" @click="removeSecret(row)">删除</el-link></template>
          </template>
        </el-table-column>
      </el-table>
      <el-alert
        v-if="secrets.some(item => !item.configured)"
        class="secret-warning"
        type="warning"
        :closable="false"
        show-icon
        title="缺少构建 Secret 时不能创建 Build；请先配置全部声明项。" />
    </div>

    <el-dialog title="配置构建 Secret" :visible.sync="secretVisible" width="520px" :close-on-click-modal="false" @closed="secretValue = ''">
      <el-form label-width="100px" @submit.native.prevent="saveSecret">
        <el-form-item label="名称"><el-input :value="secretName" disabled /></el-form-item>
        <el-form-item label="Secret 值" required>
          <el-input v-model="secretValue" type="textarea" :rows="6" maxlength="1048576" placeholder="值仅在本次提交中发送，保存后不可查看" />
        </el-form-item>
      </el-form>
      <el-alert type="info" :closable="false" show-icon title="Build 创建时会冻结加密副本，Runner 只在 tmpfs 中使用，构建结束后立即删除副本。" />
      <span slot="footer"><el-button @click="secretVisible = false">取消</el-button><el-button type="primary" :loading="secretSaving" @click="saveSecret">保存并轮换</el-button></span>
    </el-dialog>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import YamlEditor from '@/components/YamlEditor'
import { pipelineOptions, pipelineProfile, pipelineSecrets, pipelineSecretPut, pipelineSecretDelete } from '@/api/pipeline'
import { formatDate } from '@/utils/filters'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'PipelineProfile',
  components: { Breadcrumb, EasyTitle, YamlEditor },
  filters: { formatDate },
  props: {
    project: { type: Object, default: () => ({}) },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return {
      loading: false,
      profile: { yml: '' },
      clusters: [],
      secrets: [],
      secretVisible: false,
      secretSaving: false,
      secretName: '',
      secretValue: ''
    }
  },
  computed: {
    pipelineId () {
      return Number(this.$route.params.pipelineId)
    },
    breadcrumb () {
      return [...routeBreadcrumb(this), { title: '构建', to: '' }, { title: '流水线详情', to: '' }]
    },
    clusterName () {
      const cluster = this.clusters.find(item => Number(item.id) === Number(this.profile.cluster_id))
      return cluster ? cluster.title : `#${this.profile.cluster_id || '-'}`
    },
    canManage () {
      return this.$p('project.no_viewer', this.project.org_role, this.project.group_role, this.project.role)
    }
  },
  created () {
    this.loading = true
    Promise.all([
      pipelineProfile(this.orgId, this.groupId, this.projectId, this.pipelineId),
      pipelineOptions(this.orgId, this.groupId, this.projectId),
      pipelineSecrets(this.orgId, this.groupId, this.projectId, this.pipelineId)
    ]).then(([profile, options, secrets]) => {
      this.profile = profile.data.pipeline
      this.clusters = options.data.clusters || []
      this.secrets = secrets.data.secrets || []
    }).finally(() => { this.loading = false })
  },
  methods: {
    formatDate,
    openSecret (row) {
      this.secretName = row.name
      this.secretValue = ''
      this.secretVisible = true
    },
    saveSecret () {
      if (!this.secretValue) {
        this.$message.error('Secret 值不能为空')
        return
      }
      this.secretSaving = true
      pipelineSecretPut(this.orgId, this.groupId, this.projectId, this.pipelineId, this.secretName, this.secretValue).then(res => {
        this.secrets = res.data.secrets || []
        this.secretValue = ''
        this.secretVisible = false
        this.$message.success('构建 Secret 已保存')
      }).finally(() => { this.secretSaving = false })
    },
    removeSecret (row) {
      this.$confirm(`删除构建 Secret「${row.name}」后，新 Build 将无法执行，确认继续？`, '删除构建 Secret', { type: 'warning' }).then(() => {
        return pipelineSecretDelete(this.orgId, this.groupId, this.projectId, this.pipelineId, row.name)
      }).then(res => {
        this.secrets = res.data.secrets || []
        this.$message.success('构建 Secret 已删除')
      }).catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
.header { display: flex; align-items: center; justify-content: space-between; }
.pipeline-yaml { min-height: 460px; line-height: 20px; }
.secret-header { display: flex; align-items: baseline; }
.secret-tip { margin-left: 12px; color: #909399; font-size: 12px; }
.secret-warning { margin-top: 14px; }
</style>
