<template>
  <div class="project-container network-containers" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />

    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-connection card-header-icon"></i>
        <span>网络容器：{{ networkName || networkId }}</span>
        <span class="card-count">{{ containers.length }}</span>
        <div class="card-header-actions">
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>

      <el-table
        :data="containers"
        border
        stripe
        empty-text="该网络暂无关联容器"
        :header-cell-style="headerCellStyle">
        <el-table-column label="容器名称" min-width="220">
          <template #default="{ row }">
            <router-link
              :to="{ name: 'ClusterSwarmContainerDetail', params: { clusterId: clusterId, containerId: row.id } }"
              class="container-link">
              {{ row.name }}
            </router-link>
            <div class="cell-id mono">{{ shortId(row.id) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="IPv4 地址" min-width="170">
          <template #default="{ row }">
            <span class="addr-code">{{ row.ipv4 || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="IPv6 地址" min-width="200">
          <template #default="{ row }">
            <span class="addr-code">{{ row.ipv6 || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="MAC 地址" min-width="170">
          <template #default="{ row }">
            <span class="addr-code">{{ row.mac || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-popconfirm
              title="确定将该容器从此网络断开？"
              @confirm="disconnect(row)">
              <el-button
                slot="reference"
                type="text"
                size="small"
                icon="el-icon-unlink"
                class="text-danger">退出网络</el-button>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { clusterSwarmNetworkContainers, clusterSwarmNetworkDisconnect } from '@/api/cluster'
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'SwarmNetworkContainers',
  components: { Breadcrumb },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  },
  data () {
    return {
      loading: false,
      containers: [],
      headerCellStyle: {
        background: '#f8f9fb',
        color: '#303133',
        fontWeight: 600,
        fontSize: '13px'
      }
    }
  },
  computed: {
    networkId () {
      return this.$route.params.networkId
    },
    networkName () {
      return this.$route.query.networkName || ''
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  created () {
    this.load()
  },
  methods: {
    load () {
      if (!this.networkId) return
      this.loading = true
      clusterSwarmNetworkContainers(this.orgId, this.clusterId, this.networkId).then(res => {
        this.containers = res.data.containers || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '加载容器列表失败')
      }).finally(() => { this.loading = false })
    },
    async disconnect (row) {
      try {
        await clusterSwarmNetworkDisconnect(this.orgId, this.clusterId, this.networkId, row.id)
        this.$message.success('容器已退出网络')
        this.load()
      } catch (err) {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '退出网络失败')
      }
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
  .card-count { margin-left: 8px; color: #909399; font-size: 13px; font-weight: 400; &::before { content: '('; } &::after { content: ')'; } }
  .card-header-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
}

::v-deep .el-table {
  th { padding: 11px 0; font-size: 13px; letter-spacing: .3px; }
  td { padding: 10px 0; font-size: 13px; }
  .el-table__empty-text { font-size: 14px; color: #909399; }
}
::v-deep .el-table__body tr:hover > td { background: #f5f7fa; }

.container-link { font-weight: 600; color: #409eff; font-size: 13px; text-decoration: none; }
.container-link:hover { text-decoration: underline; }
.cell-id { margin-top: 3px; color: #909399; font-size: 12px; }

.addr-code {
  font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
  font-size: 12px; color: #606266;
}

.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }
.text-danger { color: #f56c6c; }
</style>
