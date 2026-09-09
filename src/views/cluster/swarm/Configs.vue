<template>
  <div class="project-container swarm-configs" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />

    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-document card-header-icon"></i> Config 列表
        <span class="card-count">{{ configs.length }}</span>
        <div class="card-header-actions">
          <el-input
            v-model="searchKeyword"
            size="small"
            clearable
            placeholder="搜索 Config 名称"
            prefix-icon="el-icon-search"
            class="search-input" />
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
          <el-button size="small" type="primary" icon="el-icon-plus" @click="openCreate">新增 Config</el-button>
        </div>
      </div>

      <el-alert
        type="info"
        :closable="false"
        class="config-tip"
        title="Config 是 Swarm 集群级资源，由 Manager 控制面统一管理，可被任意节点上的 Service Task 挂载；它不属于某个单独节点。" />

      <el-table
        :data="filteredConfigs"
        border
        stripe
        empty-text="暂无 Config"
        :header-cell-style="headerCellStyle">
        <el-table-column label="名称" min-width="200">
          <template #default="{ row }">
            <a class="cell-link" @click="openDetail(row)">{{ row.name }}</a>
            <div class="cell-id mono">{{ shortId(row.id) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="160">
          <template #default="{ row }">
            <template v-if="row.labels && Object.keys(row.labels).length">
              <el-tag v-for="(v, k) in row.labels" :key="k" size="small" type="info" class="label-tag">{{ k }}={{ v }}</el-tag>
            </template>
            <span v-else class="cell-sub">-</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="175">
          <template #default="{ row }">
            <span class="cell-date">{{ formatDate(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.in_use" size="small" type="warning">使用中</el-tag>
            <el-tag v-else size="small" type="success">未使用</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center">
          <template #default="{ row }">
            <el-button type="text" size="small" icon="el-icon-view" @click="openDetail(row)">查看</el-button>
            <el-button type="text" size="small" icon="el-icon-copy-document" @click="openClone(row)">克隆</el-button>
            <el-tooltip
              style="margin-left: 5px"
              content="该 Config 仍被 Service 使用，无法删除"
              :disabled="!row.in_use"
              placement="left">
              <el-popconfirm
                title="确定删除该 Config？此操作不可恢复"
                :disabled="row.in_use"
                @confirm="removeConfig(row)">
                <el-button
                  slot="reference"
                  type="text"
                  size="small"
                  icon="el-icon-delete"
                  class="text-danger"
                  :disabled="row.in_use">删除</el-button>
              </el-popconfirm>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { clusterSwarmConfigs, clusterSwarmConfigDelete } from '@/api/cluster'
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'SwarmConfigs',
  components: { Breadcrumb },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  },
  data () {
    return {
      loading: false,
      configs: [],
      searchKeyword: '',
      headerCellStyle: {
        background: '#f8f9fb',
        color: '#303133',
        fontWeight: 600,
        fontSize: '13px'
      }
    }
  },
  computed: {
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: this.$route.meta.title, to: '' }
      ]
    },
    filteredConfigs () {
      const kw = this.searchKeyword.trim().toLowerCase()
      if (!kw) return this.configs
      return this.configs.filter(c => (c.name || '').toLowerCase().includes(kw))
    }
  },
  created () {
    this.load()
  },
  methods: {
    load () {
      this.loading = true
      clusterSwarmConfigs(this.orgId, this.clusterId).then(res => {
        this.configs = res.data.configs || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载 Config 列表失败')
      }).finally(() => { this.loading = false })
    },
    openDetail (row) {
      this.$router.push({ name: 'ClusterSwarmConfigDetail', params: { clusterId: this.clusterId, configId: row.id } })
    },
    openCreate () {
      this.$router.push({ name: 'ClusterSwarmConfigCreate', params: { clusterId: this.clusterId } })
    },
    openClone (row) {
      this.$router.push({
        name: 'ClusterSwarmConfigCreate',
        params: { clusterId: this.clusterId },
        query: { clone: row.id }
      })
    },
    removeConfig (row) {
      clusterSwarmConfigDelete(this.orgId, this.clusterId, row.id).then(() => {
        this.$message.success('Config 已删除')
        this.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '删除失败')
      })
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
  ::v-deep .el-card__body { padding: 0 20px 20px; }
}
.card-header {
  display: flex; align-items: center;
  font-size: 15px; font-weight: 600; color: #303133;
  .card-header-icon { margin-right: 8px; color: #409eff; font-size: 16px; }
  .card-count { margin-left: 8px; color: #909399; font-size: 13px; font-weight: 400; &::before { content: '('; } &::after { content: ')'; } }
  .card-header-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .search-input { width: 220px; }
}

::v-deep .el-table {
  margin-top: 0;
  th { padding: 11px 0; font-size: 13px; letter-spacing: .3px; }
  td { padding: 10px 0; font-size: 13px; }
  .el-table__empty-text { font-size: 14px; color: #909399; }
}
::v-deep .el-table__body tr:hover > td { background: #f5f7fa; }

.cell-link { color: #409eff; cursor: pointer; font-weight: 600; font-size: 13px; }
.cell-id { margin-top: 3px; color: #909399; font-size: 12px; }
.cell-sub { color: #909399; font-size: 13px; }
.cell-date { color: #606266; font-size: 13px; }
.label-tag { margin: 0 4px 4px 0; }

.config-tip { margin: 16px 0; }
.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }
</style>
