<template>
  <div class="project-container swarm-config-create" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />

    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-document card-header-icon"></i>
        <span>{{ isClone ? '克隆 Config' : '新增 Config' }}</span>
      </div>
      <el-alert
        v-if="isClone"
        type="info"
        :closable="false"
        class="clone-tip"
        title="已复制源 Config 的内容，修改后点击「保存」将生成一份全新的 Config" />
      <el-form label-width="90px" size="small" class="create-form">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="如 nginx.conf" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="18"
            class="content-editor mono"
            placeholder="Config 文件内容" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" icon="el-icon-check" @click="save">保存</el-button>
          <el-button icon="el-icon-close" @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { clusterSwarmConfig, clusterSwarmConfigCreate } from '@/api/cluster'
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'SwarmConfigCreate',
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
    sourceId () {
      return this.$route.query.clone || ''
    },
    isClone () {
      return !!this.sourceId
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: 'Configs', to: { name: 'ClusterSwarmConfigs', params: { clusterId: this.clusterId } } },
        { title: this.isClone ? '克隆 Config' : '新增 Config', to: '' }
      ]
    }
  },
  created () {
    if (this.isClone) {
      this.loadSource()
    }
  },
  methods: {
    loadSource () {
      this.loading = true
      clusterSwarmConfig(this.orgId, this.clusterId, this.sourceId).then(res => {
        const cfg = res.data.config || {}
        this.form.name = (cfg.name || '') + '.copy'
        this.form.content = cfg.content || ''
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载源 Config 失败')
      }).finally(() => { this.loading = false })
    },
    save () {
      if (!this.form.name.trim()) return this.$message.warning('请输入 Config 名称')
      if (!this.form.content) return this.$message.warning('请输入 Config 内容')
      this.saving = true
      clusterSwarmConfigCreate(this.orgId, this.clusterId, this.form.name.trim(), this.form.content).then(() => {
        this.$message.success(this.isClone ? 'Config 已克隆' : 'Config 已创建')
        this.goBack()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '保存失败')
      }).finally(() => { this.saving = false })
    },
    goBack () {
      this.$router.push({ name: 'ClusterSwarmConfigs', params: { clusterId: this.clusterId } })
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
  .card-header-icon { margin-right: 8px; color: #409eff; font-size: 16px; }
}
.create-form { max-width: 880px; }
.content-editor {
  font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
}
.clone-tip { margin-top: 8px; margin-bottom: 8px; }

.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }
</style>
