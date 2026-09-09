<template>
  <div class="project-container swarm-secret-create" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />

    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-key card-header-icon"></i>
        <span>新增 Secret</span>
      </div>

      <el-form label-width="90px" size="small" class="create-form">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="如 db_password" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="18"
            class="content-editor mono"
            placeholder="Secret 内容（将安全保存，创建后不可查看）" />
        </el-form-item>
        <el-alert
          type="warning"
          :closable="false"
          class="secret-tip"
          title="出于安全考虑，Secret 创建后将无法再次查看其内容，请妥善保存" />
        <el-form-item>
          <el-button type="primary" :loading="saving" icon="el-icon-check" @click="save">保存</el-button>
          <el-button icon="el-icon-close" @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { clusterSwarmSecretCreate } from '@/api/cluster'
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'SwarmSecretCreate',
  components: { Breadcrumb },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  },
  data () {
    return {
      loading: false,
      saving: false,
      form: { name: '', content: '' }
    }
  },
  computed: {
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: 'Secrets', to: { name: 'ClusterSwarmSecrets', params: { clusterId: this.clusterId } } },
        { title: '新增 Secret', to: '' }
      ]
    }
  },
  methods: {
    save () {
      if (!this.form.name.trim()) return this.$message.warning('请输入 Secret 名称')
      if (!this.form.content) return this.$message.warning('请输入 Secret 内容')
      this.saving = true
      clusterSwarmSecretCreate(this.orgId, this.clusterId, this.form.name.trim(), this.form.content).then(() => {
        this.$message.success('Secret 已创建')
        this.goBack()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '保存失败')
      }).finally(() => { this.saving = false })
    },
    goBack () {
      this.$router.push({ name: 'ClusterSwarmSecrets', params: { clusterId: this.clusterId } })
    }
  }
}
</script>

<style lang="scss" scoped>
.content-card {
  border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06);
  ::v-deep .el-card__header { padding: 14px 20px; border-bottom: 1px solid #ebeef5; background: #fafbfc; }
  ::v-deep .el-card__body { padding: 20px; }
}
.card-header {
  display: flex; align-items: center;
  font-size: 15px; font-weight: 600; color: #303133;
  .card-header-icon { margin-right: 8px; color: #e6a23c; font-size: 16px; }
}
.create-form { max-width: 880px; }
.content-editor {
  font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
}
.secret-tip { margin-top: 8px; }

.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }
</style>
