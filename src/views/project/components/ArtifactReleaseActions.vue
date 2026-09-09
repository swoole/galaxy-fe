<template>
  <span class="artifact-release-actions">
    <template v-if="mode === 'link'">
      <el-link type="primary" @click="createInstance">创建实例</el-link>
      <el-divider direction="vertical" />
      <el-link type="primary" @click="openUpdate">更新版本</el-link>
    </template>
    <template v-else>
      <el-button :size="size" icon="el-icon-plus" @click="createInstance">创建新实例</el-button>
      <el-button :size="size" type="primary" icon="el-icon-refresh" @click="openUpdate">更新已有实例</el-button>
    </template>

    <el-dialog
      title="更新已有实例版本"
      :visible.sync="visible"
      append-to-body
      width="620px"
      :close-on-click-modal="false"
      @closed="reset">
      <el-alert
        title="仅替换所选实例的镜像制品；资源、网络、端口、存储、配置与 Secret 均沿用当前发布版本。"
        type="info"
        :closable="false"
        show-icon />
      <div class="target-artifact">
        <span>目标镜像</span>
        <strong>#{{ artifact.id }}</strong>
        <image-reference
          :value="artifact.reference"
          :digest="artifact.digest || ''"
          :size="artifact.size || 0"
          :created-at="artifact.created_at || 0" />
      </div>
      <el-form ref="updateForm" :model="form" :rules="rules" label-width="95px" class="update-form">
        <el-form-item label="已有实例" prop="runtime_id">
          <el-select v-model="form.runtime_id" filterable style="width: 100%" placeholder="请选择需要更新的 Service" :loading="loading">
            <el-option
              v-for="runtime in runtimes"
              :key="runtime.id"
              :label="runtimeLabel(runtime)"
              :value="runtime.id"
              :disabled="usesTargetArtifact(runtime)">
              <div class="runtime-option">
                <span><strong>{{ runtime.name }}</strong> · {{ runtime.env ? runtime.env.title : `环境 #${runtime.env_id}` }}</span>
                <small>{{ runtime.cluster ? runtime.cluster.title : `集群 #${runtime.cluster_id}` }} · {{ currentTag(runtime) }}</small>
              </div>
            </el-option>
          </el-select>
          <div v-if="!loading && !runtimes.length" class="empty-tip">当前项目还没有可更新的运行实例，请先创建新实例。</div>
        </el-form-item>
        <el-form-item label="更新说明" prop="remark">
          <el-input
            v-model.trim="form.remark"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="说明本次镜像版本更新内容" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!runtimes.length" @click="submit">开始更新</el-button>
      </span>
    </el-dialog>
  </span>
</template>

<script>
import { projectRuntimes, releaseArtifactUpdate } from '@/api/project'

export default {
  name: 'ArtifactReleaseActions',
  props: {
    artifact: { type: Object, required: true },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true },
    mode: { type: String, default: 'button' },
    size: { type: String, default: 'small' }
  },
  data () {
    return {
      visible: false,
      loading: false,
      submitting: false,
      runtimes: [],
      form: { runtime_id: null, remark: '' },
      rules: {
        runtime_id: [{ required: true, message: '请选择需要更新的实例', trigger: 'change' }],
        remark: [{ required: true, message: '请输入更新说明', trigger: 'blur' }]
      }
    }
  },
  methods: {
    createInstance () {
      this.$router.push({
        name: 'ProjectDeploy',
        params: { groupId: this.groupId, projectId: this.projectId },
        query: { artifact: this.artifact.id, action: 'create' }
      })
    },
    openUpdate () {
      this.visible = true
      this.loading = true
      projectRuntimes(this.orgId, this.groupId, this.projectId).then(res => {
        this.runtimes = (res.data.runtimes || []).filter(runtime => Boolean(runtime.runtime_ref))
        const available = this.runtimes.find(runtime => !this.usesTargetArtifact(runtime))
        this.form.runtime_id = available ? available.id : null
        this.form.remark = `更新镜像至 ${this.shortImageTag(this.artifact.reference)}`
      }).finally(() => { this.loading = false })
    },
    submit () {
      this.$refs.updateForm.validate(valid => {
        if (!valid) return
        const runtime = this.runtimes.find(item => Number(item.id) === Number(this.form.runtime_id))
        this.$confirm(
          `确定将 ${runtime ? runtime.name : '所选实例'} 更新到镜像 ${this.shortImageTag(this.artifact.reference)}？`,
          '确认更新镜像版本',
          { type: 'warning' }
        ).then(() => {
          this.submitting = true
          releaseArtifactUpdate(
            this.orgId,
            this.groupId,
            this.projectId,
            this.form.runtime_id,
            this.artifact.id,
            this.form.remark
          ).then(res => {
            const release = res.data.release || {}
            this.$message.success(release.id ? `版本更新任务 #${release.id} 已提交` : '版本更新任务已提交')
            this.visible = false
            this.$emit('submitted', release)
            this.$router.push({ name: 'ProjectDeploy', params: { groupId: this.groupId, projectId: this.projectId } })
          }).finally(() => { this.submitting = false })
        }).catch(() => {})
      })
    },
    reset () {
      this.form = { runtime_id: null, remark: '' }
      this.runtimes = []
      if (this.$refs.updateForm) this.$refs.updateForm.clearValidate()
    },
    usesTargetArtifact (runtime) {
      return Number(runtime.release && runtime.release.artifact_id) === Number(this.artifact.id)
    },
    currentTag (runtime) {
      return runtime.release && runtime.release.artifact
        ? this.shortImageTag(runtime.release.artifact.reference)
        : '当前镜像未知'
    },
    runtimeLabel (runtime) {
      const env = runtime.env ? runtime.env.title : `环境 #${runtime.env_id}`
      return `${runtime.name} · ${env} · ${this.currentTag(runtime)}`
    },
    imageRepository (reference) {
      const value = String(reference || '').split('@')[0]
      const slash = value.lastIndexOf('/')
      const colon = value.lastIndexOf(':')
      return colon > slash ? value.slice(0, colon) : value
    },
    shortImageTag (reference) {
      const value = String(reference || '').split('@')[0]
      const slash = value.lastIndexOf('/')
      const colon = value.lastIndexOf(':')
      const tag = colon > slash ? value.slice(colon + 1) : 'latest'
      return tag.length > 16 ? `${tag.slice(0, 13)}…` : tag
    }
  }
}
</script>

<style lang="scss" scoped>
.artifact-release-actions { display: inline-flex; align-items: center; }
.target-artifact { display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 5px 10px; margin: 16px 0 20px; padding: 13px 14px; border-radius: 7px; background: #f6f8fb; }
.target-artifact span { grid-row: span 2; align-self: center; color: #909399; font-size: 12px; }
.target-artifact strong { color: #303133; font-family: SFMono-Regular, Consolas, monospace; font-size: 13px; }
.target-artifact small { overflow: hidden; color: #909399; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.update-form { margin-top: 4px; }
.runtime-option { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.runtime-option span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.runtime-option small { flex: none; color: #909399; }
.empty-tip { margin-top: 7px; color: #e6a23c; font-size: 12px; line-height: 1.5; }
</style>
