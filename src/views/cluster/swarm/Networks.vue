<template>
  <div class="project-container swarm-networks" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />

    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-connection card-header-icon"></i> 网络列表
        <span class="card-count">{{ networks.length }}</span>
        <div class="card-header-actions">
          <el-input
            v-model="searchKeyword"
            size="small"
            clearable
            placeholder="搜索网络名称"
            prefix-icon="el-icon-search"
            class="search-input" />
          <el-button size="small" icon="el-icon-plus" type="primary" @click="createNetwork">创建网络</el-button>
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>

      <el-alert
        class="network-scope-tip"
        type="info"
        :closable="false"
        show-icon
        title="这里只管理 Swarm 集群级 Overlay/Ingress 网络；bridge、host、none 及其他节点本地网络不会显示，也不会被 Galaxy 修改。" />

      <el-row :gutter="16" class="stat-mini-grid">
        <el-col :xs="8" :sm="6" :lg="4">
          <div class="stat-mini-card">
            <div class="stat-mini-value">{{ networks.length }}</div>
            <div class="stat-mini-label">网络总数</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="4">
          <div class="stat-mini-card info">
            <div class="stat-mini-value">{{ ingressCount }}</div>
            <div class="stat-mini-label">Ingress</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="4">
          <div class="stat-mini-card info">
            <div class="stat-mini-value">{{ overlayCount }}</div>
            <div class="stat-mini-label">Overlay</div>
          </div>
        </el-col>
      </el-row>

      <el-table
        :data="filteredNetworks"
        border
        stripe
        empty-text="暂无网络"
        :header-cell-style="headerCellStyle">
        <el-table-column label="名称" min-width="160">
          <template #default="{ row }">
            <div class="cell-name">{{ row.name }}</div>
            <div class="cell-id mono">{{ shortId(row.id) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="Driver" width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" type="info">{{ row.driver }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="子网">
          <template #default="{ row }">
            <template v-if="row.subnets && row.subnets.length">
              <el-tag size="small" type="info" v-for="subnet in row.subnets" :key="subnet" class="subnet-code">{{ subnet }}</el-tag>
            </template>
            <span v-else class="cell-sub">-</span>
          </template>
        </el-table-column>
        <el-table-column label="属性" width="190">
          <template #default="{ row }">
            <el-tag v-if="row.ingress" size="small" type="primary">Ingress</el-tag>
            <el-tag v-if="row.attachable" size="small" type="warning">Attachable</el-tag>
            <el-tag v-if="row.internal" size="small" type="danger">Internal</el-tag>
            <span v-if="!row.ingress && !row.attachable && !row.internal" class="cell-sub">-</span>
          </template>
        </el-table-column>
        <el-table-column label="关联容器" width="100" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.containers"
              type="text"
              class="container-count"
              @click="openContainers(row)">{{ row.containers }}</el-button>
            <span v-else class="cell-sub">0</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="175">
          <template #default="{ row }">
            <span class="cell-date">{{ formatDate(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-tooltip :content="deleteDisabledReason(row)" :disabled="canDelete(row)" placement="left">
              <span>
                <el-button
                  type="text"
                  size="small"
                  icon="el-icon-edit"
                  :disabled="isSystemNetwork(row)"
                  @click="openEdit(row)">编辑</el-button>
                <el-popconfirm
                  style="margin-left: 5px"
                  :title="row.ingress ? '该网络为 Ingress 网络，删除会影响集群路由网格，确定删除？' : '确定删除该网络？此操作不可恢复'"
                  :disabled="!canDelete(row)"
                  @confirm="deleteNetwork(row)">
                  <el-button
                    slot="reference"
                    type="text"
                    size="small"
                    icon="el-icon-delete"
                    class="text-danger"
                    :disabled="!canDelete(row)">删除</el-button>
                </el-popconfirm>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <network-dialog
      :visible.sync="dialogVisible"
      :network="editingNetwork"
      :orgId="orgId"
      :clusterId="clusterId"
      @saved="onNetworkSaved" />
  </div>
</template>

<script>
import { clusterSwarmNetworks, clusterSwarmNetworkCreate, clusterSwarmNetworkDelete } from '@/api/cluster'
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import NetworkDialog from './NetworkDialog.vue'
import { routeBreadcrumb } from '@/utils/helpers'

// Docker 内置保留网络，不允许删除/编辑
const RESERVED_NETWORKS = ['ingress']

export default {
  name: 'SwarmNetworks',
  components: { Breadcrumb, NetworkDialog },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  },
  data () {
    return {
      loading: false,
      networks: [],
      searchKeyword: '',
      dialogVisible: false,
      editingNetwork: null,
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
    ingressCount () {
      return this.networks.filter(n => n.ingress).length
    },
    overlayCount () {
      return this.networks.filter(n => n.driver === 'overlay').length
    },
    filteredNetworks () {
      const kw = this.searchKeyword.trim().toLowerCase()
      if (!kw) return this.networks
      return this.networks.filter(n => (n.name || '').toLowerCase().includes(kw))
    }
  },
  created () {
    this.load()
  },
  methods: {
    load () {
      this.loading = true
      clusterSwarmNetworks(this.orgId, this.clusterId).then(res => {
        this.networks = res.data.networks || []
      }).finally(() => { this.loading = false })
    },
    createNetwork () {
      this.$prompt('请输入新的 Overlay 网络名称', '创建网络', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/,
        inputErrorMessage: '字母/数字开头，可包含 _ . -，最长 63 字符'
      }).then(({ value }) => {
        return clusterSwarmNetworkCreate(this.orgId, this.clusterId, value.trim())
      }).then(res => {
        this.$message.success('网络 ' + res.data.network.name + ' 创建成功')
        this.load()
      }).catch(err => {
        if (err !== 'cancel' && err !== 'close') {
          this.$message.error(err.response?.data?.message || err.message || '创建失败')
        }
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
    },
    isSystemNetwork (row) {
      return RESERVED_NETWORKS.includes((row.name || '').toLowerCase())
    },
    canDelete (row) {
      return !this.isSystemNetwork(row) && !(row.containers > 0)
    },
    deleteDisabledReason (row) {
      if (this.isSystemNetwork(row)) {
        return `系统网络 "${row.name}" 为 Docker 内置网络，不允许删除`
      }
      if (row.containers > 0) {
        return `网络 "${row.name}" 仍关联 ${row.containers} 个容器，请先移除关联后再删除`
      }
      return ''
    },
    openEdit (row) {
      this.editingNetwork = row
      this.dialogVisible = true
    },
    async deleteNetwork (row) {
      try {
        await clusterSwarmNetworkDelete(this.orgId, this.clusterId, row.id)
        this.$message.success('网络已删除')
        this.load()
      } catch (err) {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '删除失败')
      }
    },
    onNetworkSaved () {
      this.dialogVisible = false
      this.load()
    },
    openContainers (row) {
      this.$router.push({
        name: 'ClusterSwarmNetworkContainers',
        params: { clusterId: this.clusterId, networkId: row.id },
        query: { networkName: row.name }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.stat-mini-grid {
  margin: 18px 0 16px;
}
.network-scope-tip {
  margin-top: 16px;
}
.stat-mini-card {
  background: #fff; border-radius: 6px; padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); border-left: 3px solid #e4e7ed;
  transition: box-shadow .2s;
  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,.10); }
  &.info { border-left-color: #409eff; }
  .stat-mini-value { font-size: 26px; font-weight: 700; color: #303133; line-height: 1.2; }
  .stat-mini-label { margin-top: 6px; font-size: 13px; color: #909399; }
}

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
  .card-header-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
  .search-input { width: 220px; }
}

::v-deep .el-table {
  margin-top: 0;
  th { padding: 11px 0; font-size: 13px; letter-spacing: .3px; }
  td { padding: 10px 0; font-size: 13px; }
  .el-table__empty-text { font-size: 14px; color: #909399; }
}
::v-deep .el-table__body tr:hover > td { background: #f5f7fa; }

.cell-name { font-weight: 600; color: #303133; font-size: 13px; }
.cell-id { margin-top: 3px; color: #909399; font-size: 12px; }
.cell-sub { color: #909399; font-size: 13px; }
.container-count {
  font-weight: 600; color: #409eff; font-size: 13px; padding: 0;
  &:hover { text-decoration: underline; }
}
.cell-date { color: #606266; font-size: 13px; }

.subnet-code {
  font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
}

.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }
</style>
