<template>
  <div class="project-container swarm-services" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />

    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-s-grid card-header-icon"></i> Services 列表
        <span class="card-count">{{ services.length }}</span>
        <div class="card-header-actions">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索 Service 名称..."
            clearable
            prefix-icon="el-icon-search"
            size="small"
            style="width: 240px; margin-right: 8px" />
          <el-button
            size="small"
            type="warning"
            icon="el-icon-delete"
            :loading="pruning"
            :disabled="selectedServiceIds.length === 0"
            @click="pruneSelected">
            清理 ({{ selectedServiceIds.length }})
          </el-button>
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>

      <el-row :gutter="16" class="stat-mini-grid">
        <el-col :xs="8" :sm="6" :lg="4">
          <div class="stat-mini-card" :class="{ active: modeFilter === null }" @click="modeFilter = null">
            <div class="stat-mini-value">{{ services.length }}</div>
            <div class="stat-mini-label">全部</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="4">
          <div class="stat-mini-card healthy" :class="{ active: modeFilter === 'healthy' }" @click="modeFilter = 'healthy'">
            <div class="stat-mini-value">{{ healthyCount }}</div>
            <div class="stat-mini-label"><span class="dot"></span>健康</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="4">
          <div class="stat-mini-card degraded" :class="{ active: modeFilter === 'degraded' }" @click="modeFilter = 'degraded'">
            <div class="stat-mini-value">{{ degradedCount }}</div>
            <div class="stat-mini-label"><span class="dot"></span>降级</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="4">
          <div class="stat-mini-card info" :class="{ active: modeFilter === 'global' }" @click="modeFilter = 'global'">
            <div class="stat-mini-value">{{ globalCount }}</div>
            <div class="stat-mini-label">Global</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="4">
          <div class="stat-mini-card">
            <div class="stat-mini-value">{{ cpuReserved.toFixed(1) }}</div>
            <div class="stat-mini-label">CPU 预留</div>
          </div>
        </el-col>
        <el-col :xs="8" :sm="6" :lg="4">
          <div class="stat-mini-card">
            <div class="stat-mini-value">{{ formatBytes(memoryReserved) }}</div>
            <div class="stat-mini-label">内存预留</div>
          </div>
        </el-col>
      </el-row>

      <el-table
        ref="servicesTable"
        :data="filteredServices"
        border
        stripe
        empty-text="暂无 Service"
        :header-cell-style="headerCellStyle"
        @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="42" fixed="left" />
        <el-table-column label="名称" min-width="180">
          <template #default="{ row }">
            <router-link
              :to="{ name: 'ClusterSwarmServiceDetail', params: { clusterId, serviceId: row.id } }"
              class="cell-name cell-name-link">
              {{ row.name }}
            </router-link>
            <div class="cell-id mono">{{ shortId(row.id) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="镜像" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <image-reference
              :value="row.image"
              :org-id="orgId"
              :cluster-id="clusterId"
              compact />
          </template>
        </el-table-column>
        <el-table-column label="模式" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.mode === 'global' ? 'primary' : 'info'">{{ row.mode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="副本" width="150" align="center">
          <template #default="{ row }">
            <span class="replica-cell">
              <el-tag size="small" :type="row.running_tasks === row.desired_tasks ? 'success' : 'danger'">
                {{ row.running_tasks }} / {{ row.desired_tasks }}
              </el-tag>
              <el-tag
                v-if="row.failed_tasks"
                size="mini"
                type="danger"
                class="tasks-failed-inline"
                style="cursor: pointer"
                @click="$router.push({ name: 'ClusterSwarmServiceDetail', params: { clusterId, serviceId: row.id }, query: { tab: 'failed' } })">
                失败 {{ row.failed_tasks }}
              </el-tag>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="CPU" width="120" align="right">
          <template #default="{ row }">
            <span v-if="row.cpu_limit" class="cell-metric">{{ row.cpu_limit.toFixed(2) }}</span>
            <span v-else-if="row.cpu_reserved" class="cell-metric">{{ row.cpu_reserved.toFixed(2) }}</span>
            <span v-else class="cell-sub">-</span>
          </template>
        </el-table-column>
        <el-table-column label="内存" width="150" align="right">
          <template #default="{ row }">
            <span v-if="row.memory_limit" class="cell-metric">{{ formatBytes(row.memory_limit) }}</span>
            <span v-else-if="row.memory_reserved" class="cell-metric">{{ formatBytes(row.memory_reserved) }}</span>
            <span v-else class="cell-sub">-</span>
          </template>
        </el-table-column>
        <el-table-column label="端口" min-width="220">
          <template #default="{ row }">
            <template v-if="row.ports && row.ports.length">
              <div v-for="port in row.ports" :key="port" class="service-port-row">
                <el-tag size="small" type="info">{{ port }}</el-tag>
              </div>
            </template>
            <span v-else class="cell-sub">-</span>
          </template>
        </el-table-column>
        <el-table-column label="更新状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.update_state && row.update_state !== 'completed'" size="small" type="warning">{{ row.update_state }}</el-tag>
            <span v-else class="cell-sub">-</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="175">
          <template #default="{ row }">
            <span class="cell-date">{{ formatDate(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right" align="center">
          <template #default="{ row }">
            <router-link
              :to="{ name: 'ClusterSwarmServiceDetail', params: { clusterId, serviceId: row.id } }"
              class="action-detail-link">
              详情
            </router-link>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

  </div>
</template>

<script>
import { clusterSwarmServices, clusterSwarmServicePrune } from '@/api/cluster'
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import { routeBreadcrumb, shortId, formatDateTime, imageTag } from '@/utils/helpers'

export default {
  name: 'SwarmServices',
  components: { Breadcrumb },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  },
  data () {
    return {
      loading: false,
      pruning: false,
      services: [],
      selectedServiceIds: [],
      searchKeyword: '',
      modeFilter: null,
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
    healthyCount () {
      return this.services.filter(s => s.desired_tasks === s.running_tasks).length
    },
    degradedCount () {
      return this.services.filter(s => s.desired_tasks !== s.running_tasks).length
    },
    globalCount () {
      return this.services.filter(s => s.mode === 'global').length
    },
    cpuReserved () {
      return this.services.reduce((sum, s) => sum + (s.cpu_reserved_total || 0), 0)
    },
    memoryReserved () {
      return this.services.reduce((sum, s) => sum + (s.memory_reserved_total || 0), 0)
    },
    filteredServices () {
      let list = this.services
      if (this.modeFilter === 'healthy') list = list.filter(s => s.desired_tasks === s.running_tasks)
      if (this.modeFilter === 'degraded') list = list.filter(s => s.desired_tasks !== s.running_tasks)
      if (this.modeFilter === 'global') list = list.filter(s => s.mode === 'global')
      if (this.searchKeyword) {
        const kw = this.searchKeyword.toLowerCase()
        list = list.filter(s => s.name.toLowerCase().includes(kw))
      }
      return list
    }
  },
  created () {
    this.load()
  },
  methods: {
    imageTag,
    load () {
      this.loading = true
      clusterSwarmServices(this.orgId, this.clusterId).then(res => {
        this.services = res.data.services || []
      }).finally(() => { this.loading = false })
    },
    shortId (value, length = 12) {
      return shortId(value, length)
    },
    formatDate (value) {
      return formatDateTime(value)
    },
    handleSelectionChange (selection) {
      this.selectedServiceIds = selection.map(s => s.id)
    },
    pruneSelected () {
      if (this.selectedServiceIds.length === 0) return
      const names = this.services
        .filter(s => this.selectedServiceIds.includes(s.id))
        .map(s => s.name)
        .slice(0, 5)
        .join(', ')
      const suffix = this.selectedServiceIds.length > 5 ? ` 等 ${this.selectedServiceIds.length} 个 Service` : ''
      this.$confirm(
        `将对以下 Service 执行 Prune 操作，清理已退出的无效容器：\n\n${names}${suffix}\n\n运行中的容器不会被删除，确认继续？`,
        'Prune 确认',
        { confirmButtonText: '确认 Prune', cancelButtonText: '取消', type: 'warning', confirmButtonClass: 'el-button--warning' }
      ).then(() => {
        this.pruning = true
        clusterSwarmServicePrune(this.orgId, this.clusterId, this.selectedServiceIds).then(res => {
          const data = res.data || {}
          const failed = data.failed || []
          const prunedCount = data.pruned_count || 0
          if (failed.length > 0) {
            const errMsgs = failed.map(f => {
              const svc = this.services.find(s => s.id === f.service_id)
              const cid = f.container_id ? ` [${f.container_id.slice(0, 12)}]` : ''
              return `${svc ? svc.name : f.service_id}${cid}: ${f.error}`
            }).join('\n')
            this.$message.warning(`Prune 完成：清理 ${prunedCount} 个容器，${failed.length} 个失败\n${errMsgs}`)
          } else {
            this.$message.success(`Prune 完成：清理了 ${prunedCount} 个已退出容器`)
          }
          this.selectedServiceIds = []
          this.$refs.servicesTable.clearSelection()
          this.load()
        }).catch(() => {
          this.$message.error('Prune 请求失败')
        }).finally(() => { this.pruning = false })
      }).catch(() => {})
    },
    formatBytes (value) {
      let bytes = Number(value) || 0
      if (bytes <= 0) return '0 B'
      const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
      const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
      bytes /= Math.pow(1024, index)
      return `${bytes.toFixed(index === 0 ? 0 : 2)} ${units[index]}`
    }
  }
}
</script>

<style lang="scss" scoped>
.stat-mini-grid {
  margin: 16px 0;
}
.stat-mini-card {
  background: #fff; border-radius: 6px; padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); border-left: 3px solid #e4e7ed;
  cursor: pointer; transition: box-shadow .2s, transform .15s;
  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,.10); }
  &.healthy { border-left-color: #67c23a; }
  &.degraded { border-left-color: #e6a23c; }
  &.info { border-left-color: #409eff; }
  &.active { box-shadow: 0 2px 8px rgba(0,0,0,.15); transform: translateY(-1px); }
  .stat-mini-value { font-size: 26px; font-weight: 700; color: #303133; line-height: 1.2; }
  .stat-mini-label {
    margin-top: 6px; font-size: 13px; color: #909399;
    .dot {
      display: inline-block; width: 7px; height: 7px;
      border-radius: 50%; margin-right: 5px; vertical-align: middle;
    }
  }
  &.healthy .stat-mini-label .dot { background: #67c23a; }
  &.degraded .stat-mini-label .dot { background: #e6a23c; }
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
  .card-header-actions { margin-left: auto; display: flex; align-items: center; }
}

::v-deep .el-table {
  margin-top: 0;
  th { padding: 11px 0; font-size: 13px; letter-spacing: .3px; }
  td { padding: 10px 0; font-size: 13px; }
  .el-table__empty-text { font-size: 14px; color: #909399; }
}
::v-deep .el-table__body tr:hover > td { background: #f5f7fa; }

.cell-name { font-weight: 600; color: #303133; font-size: 13px; }
.cell-name-link { cursor: pointer; color: #409eff; &:hover { text-decoration: underline; } }
.cell-image { color: #606266; font-size: 13px; }
.cell-id { margin-top: 3px; color: #909399; font-size: 12px; }
.cell-sub { color: #909399; font-size: 12px; }
.cell-date { color: #606266; font-size: 13px; }
.cell-metric { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; font-size: 13px; font-weight: 500; color: #303133; }
.tasks-failed-inline { margin-left: 6px; }
.service-port-row { margin-bottom: 2px; }

.action-detail-link {
  font-size: 13px; color: #409eff; cursor: pointer;
  &:hover { text-decoration: underline; }
}

</style>
