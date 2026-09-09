<template>
  <div class="project-container image-detail-page" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <div class="project-main">
      <el-card shadow="never" class="detail-card hero-card">
        <div class="hero-main">
          <el-button class="back-button" icon="el-icon-back" circle size="small" @click="goBack" />
          <div class="image-mark"><svg-icon icon-class="package" /></div>
          <div class="hero-copy">
            <div class="eyebrow">镜像制品 #{{ artifact.id || '-' }}</div>
            <h2>{{ imageRepository }}</h2>
            <el-tag v-if="imageTag" size="small" effect="plain">{{ imageTag }}</el-tag>
            <technology-badges v-if="artifact.template" class="hero-badges" :template="artifact.template" />
          </div>
          <div class="hero-actions">
            <el-button v-if="build.id" size="small" icon="el-icon-document" @click="showBuildLog">构建日志</el-button>
            <artifact-release-actions
              v-if="artifact.id && $p('project.no_viewer', project.org_role, project.group_role, project.role)"
              :artifact="artifact"
              :org-id="orgId"
              :group-id="groupId"
              :project-id="projectId" />
            <el-button v-else size="small" icon="el-icon-upload2" @click="goDeploy">查看部署</el-button>
          </div>
        </div>
        <div class="reference-box">
          <span class="reference-label">完整地址</span>
          <image-reference
            :value="artifact.reference"
            :digest="artifact.digest || ''"
            :size="artifact.size || 0"
            :created-at="artifact.created_at || 0"
            :strip-digest="false" />
          <el-button
            v-if="artifact.reference"
            v-clipboard:copy="artifact.reference"
            v-clipboard:success="copied"
            type="text"
            size="mini">复制</el-button>
        </div>
      </el-card>

      <el-row :gutter="14" class="metric-row">
        <el-col :xs="12" :sm="6">
          <div class="metric-card"><span>构建任务</span><strong>#{{ build.id || '-' }}</strong></div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="metric-card"><span>镜像尺寸</span><strong>{{ formatBytes(artifact.size) }}</strong></div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="metric-card"><span>目标平台</span><strong>{{ platformsLabel }}</strong></div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="metric-card"><span>部署记录</span><strong>{{ releaseTotal }}</strong></div>
        </el-col>
      </el-row>

      <el-row :gutter="18">
        <el-col :xs="24" :lg="15">
          <el-card shadow="never" class="detail-card">
            <div slot="header" class="section-title"><span>镜像信息</span><small>OCI 制品的不可变身份</small></div>
            <el-descriptions :column="1" border size="medium" label-class-name="description-label">
              <el-descriptions-item label="Artifact ID"><span class="compact-id">#{{ artifact.id }}</span></el-descriptions-item>
              <el-descriptions-item label="类型">{{ artifact.type || 'container-image' }}</el-descriptions-item>
              <el-descriptions-item label="Digest">
                <div class="copy-line">
                  <code>{{ artifact.digest || '-' }}</code>
                  <el-button
                    v-if="artifact.digest"
                    v-clipboard:copy="artifact.digest"
                    v-clipboard:success="copied"
                    type="text"
                    size="mini">复制</el-button>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="目标平台">{{ platformsLabel }}</el-descriptions-item>
              <el-descriptions-item label="供应链证明">
                <el-tag v-if="attestations.sbom" size="mini" type="success">SBOM</el-tag>
                <el-tag v-if="attestations.provenance" size="mini" type="success">Provenance</el-tag>
                <span v-if="!attestations.sbom && !attestations.provenance" class="muted">未生成</span>
              </el-descriptions-item>
              <el-descriptions-item label="生成时间">{{ artifact.created_at | formatDate }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <el-col :xs="24" :lg="9">
          <el-card shadow="never" class="detail-card build-card">
            <div slot="header" class="section-title"><span>来源构建</span><small>可追溯的源码版本</small></div>
            <div class="build-head">
              <div><span>任务</span><strong>#{{ build.id || '-' }}</strong></div>
              <el-tag :type="buildStatus.type" size="small">{{ buildStatus.label }}</el-tag>
            </div>
            <dl class="build-facts">
              <div><dt>流水线</dt><dd>{{ build.pipeline ? build.pipeline.title : '-' }}</dd></div>
              <div><dt>分支</dt><dd>{{ build.branch || '-' }}</dd></div>
              <div><dt>Commit</dt><dd><code :title="build.commit_id">{{ shortValue(build.commit_id, 14) }}</code></dd></div>
              <div><dt>耗时</dt><dd>{{ duration(build) }}</dd></div>
              <div><dt>备注</dt><dd>{{ build.remark || '-' }}</dd></div>
              <div><dt>构建时间</dt><dd>{{ build.created_at | formatDate }}</dd></div>
            </dl>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="detail-card release-card">
        <div slot="header" class="section-title section-title-row">
          <div><span>部署记录</span><small>使用此镜像创建的最近 100 条发布</small></div>
          <el-button type="text" @click="goDeploy">查看全部部署</el-button>
        </div>
        <el-table :data="releases" empty-text="该镜像尚未部署" fit>
          <el-table-column label="发布" width="90"><template #default="{ row }"><span class="compact-id">#{{ row.id }}</span></template></el-table-column>
          <el-table-column label="目标" min-width="220">
            <template #default="{ row }">
              <div>{{ row.desired_spec && row.desired_spec.service_name ? row.desired_spec.service_name : '-' }}</div>
              <div class="cell-sub">{{ row.env ? row.env.title : `环境 #${row.env_id}` }} · {{ row.cluster ? row.cluster.title : `集群 #${row.cluster_id}` }}</div>
            </template>
          </el-table-column>
          <el-table-column label="副本" width="100" align="center">
            <template #default="{ row }">{{ row.runtime ? `${row.runtime.running_count}/${row.runtime.desired_count}` : '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }"><el-tag :type="releaseStatus(row.status).type" size="small">{{ releaseStatus(row.status).label }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
          <el-table-column label="发布时间" width="170"><template #default="{ row }">{{ row.created_at | formatDate }}</template></el-table-column>
        </el-table>
      </el-card>
    </div>

    <build-log ref="buildLog" :org-id="orgId" />
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import BuildLog from '@/views/project/components/BuildLog'
import ArtifactReleaseActions from '@/views/project/components/ArtifactReleaseActions'
import TechnologyBadges from '../components/TechnologyBadges.vue'
import { buildArtifactProfile } from '@/api/project'
import { STATUSES } from '@/consts/pipeline'
import { formatDate } from '@/utils/filters'
import { routeBreadcrumb } from '@/utils/helpers'

const RELEASE_STATUSES = {
  pending: { label: '等待中', type: 'info' },
  deploying: { label: '部署中', type: 'warning' },
  succeeded: { label: '已成功', type: 'success' },
  failed: { label: '失败', type: 'danger' },
  'rolled-back': { label: '已回滚', type: 'info' }
}

export default {
  name: 'ProjectImageDetail',
  components: { ArtifactReleaseActions, Breadcrumb, BuildLog, TechnologyBadges },
  filters: { formatDate },
  props: {
    project: { type: Object, default: () => ({}) },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return { loading: false, artifact: {}, build: {}, releases: [], releaseTotal: 0 }
  },
  computed: {
    artifactId () { return Number(this.$route.params.artifactId || 0) },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: '构建', to: '' },
        { title: '产物列表', to: { name: 'ProjectArtifacts', params: { groupId: this.groupId, projectId: this.projectId } } },
        { title: '镜像详情', to: '' }
      ]
    },
    imageRepository () {
      const reference = String(this.artifact.reference || '')
      const withoutDigest = reference.split('@')[0]
      const slash = withoutDigest.lastIndexOf('/')
      const colon = withoutDigest.lastIndexOf(':')
      return colon > slash ? withoutDigest.slice(0, colon) : withoutDigest || '镜像详情'
    },
    imageTag () {
      const reference = String(this.artifact.reference || '')
      const withoutDigest = reference.split('@')[0]
      const slash = withoutDigest.lastIndexOf('/')
      const colon = withoutDigest.lastIndexOf(':')
      return colon > slash ? withoutDigest.slice(colon + 1) : 'latest'
    },
    metadata () { return this.artifact.metadata || {} },
    platformsLabel () { return (this.metadata.platforms || ['-']).join(', ') },
    attestations () { return this.metadata.attestations || {} },
    buildStatus () {
      const status = STATUSES[Number(this.build.status)] || { label: '未知', type: 'info' }
      return { ...status, type: status.type === 'error' ? 'danger' : status.type }
    }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      return buildArtifactProfile(this.orgId, this.groupId, this.projectId, this.artifactId).then(res => {
        this.artifact = res.data.artifact || {}
        this.build = res.data.build || {}
        this.releases = res.data.releases || []
        this.releaseTotal = Number(res.data.release_total || 0)
      }).finally(() => { this.loading = false })
    },
    copied () { this.$message.success('已复制') },
    goBack () { this.$router.push({ name: 'ProjectArtifacts', params: { groupId: this.groupId, projectId: this.projectId } }) },
    goDeploy () { this.$router.push({ name: 'ProjectDeploy', params: { groupId: this.groupId, projectId: this.projectId }, query: { artifact: this.artifact.id } }) },
    showBuildLog () { this.$refs.buildLog.show(this.groupId, this.projectId, this.build.id) },
    releaseStatus (status) { return RELEASE_STATUSES[status] || { label: status || '未知', type: 'info' } },
    shortValue (value, length = 12) {
      const text = String(value || '')
      return text.length > length ? `${text.slice(0, length)}…` : text || '-'
    },
    duration (build) {
      if (!build.start_at) return '-'
      const end = build.end_at || Math.floor(Date.now() / 1000)
      const seconds = Math.max(0, end - build.start_at)
      if (seconds < 60) return `${seconds}s`
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    },
    formatBytes (value) {
      const bytes = Number(value || 0)
      if (!bytes) return '-'
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
      return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
    }
  }
}
</script>

<style lang="scss" scoped>
.image-detail-page { background: #f5f7fa; min-height: 100%; }
.project-main { padding-bottom: 30px; }
.detail-card { border: 1px solid #e9edf3; border-radius: 10px; margin-bottom: 18px; }
.hero-card { overflow: hidden; }
.hero-main { display: flex; align-items: center; min-height: 70px; }
.back-button { margin-right: 14px; }
.image-mark { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background: #ecf5ff; color: #409eff; font-size: 24px; }
.hero-copy { min-width: 0; margin-left: 14px; }
.hero-copy h2 { display: inline-block; max-width: 720px; overflow: hidden; margin: 3px 10px 3px 0; color: #263445; font-size: 20px; text-overflow: ellipsis; vertical-align: middle; white-space: nowrap; }
.hero-badges { margin-top: 7px; }
.eyebrow { color: #909399; font-size: 12px; letter-spacing: .03em; }
.hero-actions { display: flex; gap: 8px; margin-left: auto; }
.reference-box { display: flex; align-items: center; gap: 10px; margin-top: 16px; padding: 10px 12px; border-radius: 7px; background: #f6f8fb; }
.reference-box code, .copy-line code { min-width: 0; overflow-wrap: anywhere; color: #475569; font-size: 12px; }
.reference-label { flex: none; color: #909399; font-size: 12px; }
.metric-row { margin-bottom: 4px; }
.metric-card { display: flex; flex-direction: column; min-height: 76px; padding: 14px 16px; border: 1px solid #e9edf3; border-radius: 9px; background: #fff; }
.metric-card span { color: #909399; font-size: 12px; }
.metric-card strong { margin-top: 9px; color: #303133; font-size: 17px; font-weight: 600; }
.section-title { display: flex; flex-direction: column; gap: 4px; }
.section-title span { color: #303133; font-size: 15px; font-weight: 600; }
.section-title small { color: #a0a6b0; font-size: 12px; font-weight: normal; }
.section-title-row { flex-direction: row; align-items: center; justify-content: space-between; }
.compact-id { color: #55657a; font-family: SFMono-Regular, Consolas, monospace; font-size: 12px; }
.copy-line { display: flex; align-items: center; gap: 8px; }
.muted, .cell-sub { color: #909399; font-size: 12px; }
.build-head { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1px solid #eef1f5; }
.build-head div { display: flex; flex-direction: column; gap: 4px; }
.build-head span { color: #909399; font-size: 12px; }
.build-head strong { color: #303133; font-size: 20px; }
.build-facts { margin: 8px 0 0; }
.build-facts div { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 10px; padding: 8px 0; }
.build-facts dt { color: #909399; font-size: 12px; }
.build-facts dd { overflow: hidden; margin: 0; color: #4b5563; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.release-card { margin-top: 0; }
::v-deep .description-label { width: 125px; color: #7b8492 !important; font-weight: normal !important; }
@media (max-width: 1200px) { .build-card { margin-top: 0; } }
@media (max-width: 768px) {
  .hero-main { align-items: flex-start; flex-wrap: wrap; }
  .hero-actions { width: 100%; margin: 14px 0 0 62px; }
  .metric-card { margin-bottom: 12px; }
}
</style>
