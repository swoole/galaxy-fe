<template>
  <div class="project-container swarm-config-detail" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />

    <el-card v-if="detail" shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-document card-header-icon"></i> {{ detail.name }}
        <div class="card-header-actions">
          <el-button size="small" icon="el-icon-document-copy" :disabled="!detail.content" @click="copyContent">复制内容</el-button>
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
          <el-button size="small" icon="el-icon-back" @click="goBack">返回</el-button>
        </div>
      </div>

      <el-descriptions :column="2" border size="small" class="meta-descriptions">
        <el-descriptions-item label="ID" :span="2">
          <span class="mono">{{ detail.id }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="名称">{{ detail.name }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(detail.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDate(detail.updated_at) }}</el-descriptions-item>
        <el-descriptions-item label="标签" :span="2">
          <template v-if="detail.labels && Object.keys(detail.labels).length">
            <el-tag v-for="(v, k) in detail.labels" :key="k" size="small" type="info" class="label-tag">{{ k }}={{ v }}</el-tag>
          </template>
          <span v-else class="cell-sub">-</span>
        </el-descriptions-item>
      </el-descriptions>

      <div class="content-title">内容</div>
      <pre v-if="detail.content" class="config-content mono">{{ detail.content }}</pre>
      <div v-else class="cell-sub">（空内容）</div>
    </el-card>
  </div>
</template>

<script>
import { clusterSwarmConfig } from '@/api/cluster'
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'SwarmConfigDetail',
  components: { Breadcrumb },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  },
  data () {
    return {
      loading: false,
      detail: null
    }
  },
  computed: {
    configId () {
      return this.$route.params.configId
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: 'Configs', to: { name: 'ClusterSwarmConfigs', params: { clusterId: this.clusterId } } },
        { title: this.detail ? this.detail.name : this.shortId(this.configId), to: '' }
      ]
    }
  },
  created () {
    this.load()
  },
  methods: {
    load () {
      this.loading = true
      clusterSwarmConfig(this.orgId, this.clusterId, this.configId).then(res => {
        this.detail = res.data.config
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载 Config 详情失败')
      }).finally(() => { this.loading = false })
    },
    goBack () {
      this.$router.push({ name: 'ClusterSwarmConfigs', params: { clusterId: this.clusterId } })
    },
    copyContent () {
      if (!this.detail || !this.detail.content) return
      const text = this.detail.content
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.$message.success('内容已复制到剪贴板')
        }).catch(() => {
          this.fallbackCopy(text)
        })
      } else {
        this.fallbackCopy(text)
      }
    },
    fallbackCopy (text) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        this.$message.success('内容已复制到剪贴板')
      } catch (e) {
        this.$message.error('复制失败，请手动选择')
      }
      document.body.removeChild(textarea)
    },
    formatDate (value) {
      if (!value) return '-'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
    },
    shortId (value, length = 12) {
      if (!value) return '-'
      return String(value).slice(0, length)
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
  .card-header-actions { margin-left: auto; }
}
.meta-descriptions { margin-bottom: 16px; }
.content-title { font-size: 14px; font-weight: 600; color: #303133; margin: 4px 0 8px; }
.config-content {
  margin: 0;
  padding: 14px 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 520px;
  overflow: auto;
}
.cell-sub { color: #909399; font-size: 13px; }
.label-tag { margin: 0 4px 4px 0; }

.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }
</style>
