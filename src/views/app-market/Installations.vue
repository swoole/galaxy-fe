<template>
  <div class="app-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" />

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card" :class="{ active: filterStatus === null }" @click="filterStatus = null">
        <span class="stat-num">{{ installations.length }}</span>
        <span class="stat-label">全部</span>
      </div>
      <div class="stat-card stat-running" :class="{ active: filterStatus === 'running' }" @click="filterStatus = 'running'">
        <span class="stat-num">{{ countByStatus('running') }}</span>
        <span class="stat-label"><span class="stat-dot run"></span>运行中</span>
      </div>
      <div class="stat-card stat-failed" :class="{ active: filterStatus === 'failed' }" @click="filterStatus = 'failed'">
        <span class="stat-num">{{ countByStatus('failed') }}</span>
        <span class="stat-label"><span class="stat-dot fail"></span>失败</span>
      </div>
      <div class="stat-card stat-pending" :class="{ active: filterStatus === 'pending' }" @click="filterStatus = 'pending'">
        <span class="stat-num">{{ countByStatus('pending') }}</span>
        <span class="stat-label">等待中</span>
      </div>
      <div class="stat-card stat-installing" :class="{ active: filterStatus === 'installing' }" @click="filterStatus = 'installing'">
        <span class="stat-num">{{ countByStatus('installing') }}</span>
        <span class="stat-label">安装中</span>
      </div>
    </div>

    <div class="content-card">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="search"
            placeholder="搜索应用名称、工作负载或模板..."
            prefix-icon="el-icon-search"
            clearable
            size="small"
            class="search-input" />
        </div>
        <div class="toolbar-right">
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>

      <el-table
        :data="filteredInstallations"
        stripe
        empty-text="暂无安装记录"
        :header-cell-style="headerCellStyle"
        row-key="id"
        style="width: 100%">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-content">
              <div class="expand-cols">
                <div class="expand-col" v-if="row.resource_config">
                  <div class="expand-section-title">资源配置</div>
                  <el-descriptions :column="2" size="small" border>
                    <el-descriptions-item label="CPU 预留">{{ row.resource_config.reserve_cpu || 0 }} 核</el-descriptions-item>
                    <el-descriptions-item label="CPU 限制">{{ row.resource_config.limit_cpu || '-' }} 核</el-descriptions-item>
                    <el-descriptions-item label="内存预留">{{ row.resource_config.reserve_memory || 0 }} MB</el-descriptions-item>
                    <el-descriptions-item label="内存限制">{{ row.resource_config.limit_memory || '-' }} MB</el-descriptions-item>
                  </el-descriptions>
                </div>

                <div class="expand-col" v-if="row.network_config">
                  <div class="expand-section-title">网络配置</div>
                  <el-descriptions :column="2" size="small" border>
                    <el-descriptions-item label="模式">{{ row.network_config.mode }}</el-descriptions-item>
                    <el-descriptions-item label="目标网络">{{ (row.network_config.targets || []).join(', ') || '-' }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>

              <div class="expand-section" v-if="row.port_mappings && row.port_mappings.length">
                <div class="expand-section-title">端口映射</div>
                <el-table :data="row.port_mappings" size="small" border>
                  <el-table-column label="发布端口" prop="published" width="100" />
                  <el-table-column label="目标端口" prop="target" width="100" />
                  <el-table-column label="协议" prop="protocol" width="80" />
                  <el-table-column label="模式" prop="mode" width="80" />
                </el-table>
              </div>

              <div class="expand-section" v-if="row.volume_mappings && row.volume_mappings.length">
                <div class="expand-section-title">挂载</div>
                <el-table :data="row.volume_mappings" size="small" border>
                  <el-table-column label="类型" prop="type" width="80" />
                  <el-table-column label="源" prop="source" min-width="180" />
                  <el-table-column label="目标" prop="target" min-width="180" />
                  <el-table-column label="只读" width="60">
                    <template #default="{ row: m }">{{ m.read_only ? '是' : '否' }}</template>
                  </el-table-column>
                </el-table>
              </div>

              <div class="expand-section" v-if="row.config_values && Object.keys(row.config_values).length">
                <div class="expand-section-title">配置参数</div>
                <el-descriptions :column="3" size="small" border>
                  <el-descriptions-item
                    v-for="(value, key) in row.config_values"
                    :key="key"
                    :label="schemaLabel(row.config_schema, key)">
                    {{ displayValue(row.config_schema, key, value) }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>

              <div class="expand-section" v-if="row.error">
                <div class="expand-section-title">错误信息</div>
                <el-alert type="error" :title="row.error" :closable="false" show-icon />
              </div>

              <div class="expand-footer">
                <span>Job ID</span>
                <code class="job-id">{{ row.uuid }}</code>
                <span v-if="row.updated_at && row.created_at" class="expand-duration">
                  耗时 {{ duration(row.created_at, row.updated_at) }}
                </span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="应用名称" min-width="160">
          <template #default="{ row }">
            <div class="app-info">
              <span class="app-title">{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="模板" min-width="120">
          <template #default="{ row }">
            <router-link
              v-if="row.tpl_id"
              :to="{ name: 'AppMarketProfile', params: { tplId: row.tpl_id } }"
              class="link">
              {{ row.tpl_title }}
            </router-link>
            <span v-else>{{ row.tpl_title }}</span>
          </template>
        </el-table-column>

        <el-table-column label="集群" min-width="100">
          <template #default="{ row }">
            <router-link
              :to="clusterRoute(row)"
              class="link">
              {{ row.cluster_title }}
            </router-link>
          </template>
        </el-table-column>

        <el-table-column label="工作负载" min-width="130">
          <template #default="{ row }">
            <router-link
              v-if="row.status !== 'failed' && (row.docker_service_id || row.orchestrator === 'kubernetes')"
              :to="workloadRoute(row)"
              class="link">
              {{ row.service_name || row.resource_name }}
            </router-link>
            <span v-else class="cell-sub">{{ row.service_name || row.resource_name || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <span class="status-badge" :class="'status-' + row.status">
              <span class="status-dot"></span>
              {{ statusText(row.status) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="资源" width="120">
          <template #default="{ row }">
            <template v-if="row.resource_config">
              <span class="cell-metric">{{ row.resource_config.limit_cpu || 0 }}C / {{ row.resource_config.limit_memory || 0 }}M</span>
            </template>
            <span v-else class="cell-sub">-</span>
          </template>
        </el-table-column>

        <el-table-column label="安装时间" width="170">
          <template #default="{ row }">
            <div class="time-cell">
              <span class="time-rel">{{ relativeTime(row.created_at) }}</span>
              <span class="time-abs">{{ formatDate(row.created_at) }}</span>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="filteredInstallations.length === 0 && !loading" class="empty-state">
        <i class="el-icon-document-checked empty-icon"></i>
        <p class="empty-text">暂无匹配的安装记录</p>
      </div>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import { routeBreadcrumb, shortId, formatDateTime } from '@/utils/helpers'
import { appMarketKubernetesInstallations, appMarketSwarmInstallations } from '@/api/app'

const MINUTE = 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

export default {
  name: 'AppMarketInstallations',
  components: { Breadcrumb },
  data () {
    return {
      loading: false,
      installations: [],
      filterStatus: null,
      search: '',
      headerCellStyle: {
        background: '#fafbfc',
        color: '#606266',
        fontWeight: 600,
        fontSize: '12px',
        borderBottom: '1px solid #e4e7ed'
      }
    }
  },
  computed: {
    orgId () {
      return this.$store.getters.orgId
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: '应用市场', to: '/appmarket' },
        { title: '安装记录', to: '' }
      ]
    },
    filteredInstallations () {
      let list = this.installations
      if (this.filterStatus) {
        list = list.filter(i => i.status === this.filterStatus)
      }
      if (this.search) {
        const kw = this.search.toLowerCase()
        list = list.filter(i =>
          (i.title || '').toLowerCase().includes(kw) ||
          (i.service_name || '').toLowerCase().includes(kw) ||
          (i.resource_name || '').toLowerCase().includes(kw) ||
          (i.tpl_title || '').toLowerCase().includes(kw))
      }
      return list
    }
  },
  created () {
    this.load()
  },
  methods: {
    load () {
      this.loading = true
      Promise.all([
        appMarketSwarmInstallations(this.orgId),
        appMarketKubernetesInstallations(this.orgId)
      ]).then(([swarm, kubernetes]) => {
        const swarmRows = (swarm.data.installations || []).map(row => ({
          ...row,
          orchestrator: 'docker_swarm'
        }))
        this.installations = [
          ...swarmRows,
          ...(kubernetes.data.installations || [])
        ].sort((a, b) => Number(b.created_at) - Number(a.created_at))
      }).finally(() => { this.loading = false })
    },
    countByStatus (status) {
      return this.installations.filter(i => i.status === status).length
    },
    clusterRoute (row) {
      return {
        name: row.orchestrator === 'kubernetes' ? 'ClusterK8sOverview' : 'ClusterSwarmOverview',
        params: { clusterId: row.cluster_id }
      }
    },
    workloadRoute (row) {
      if (row.orchestrator === 'kubernetes') {
        return {
          name: 'ClusterK8sDeployments',
          params: { clusterId: row.cluster_id },
          query: { namespace: row.namespace || 'cattle-system' }
        }
      }
      return {
        name: 'ClusterSwarmServiceDetail',
        params: { clusterId: row.cluster_id, serviceId: row.docker_service_id }
      }
    },
    statusText (status) {
      const map = { running: '运行中', failed: '失败', pending: '等待中', installing: '安装中' }
      return map[status] || status
    },
    relativeTime (ts) {
      if (!ts) return ''
      const now = Math.floor(Date.now() / 1000)
      const diff = now - Number(ts)
      if (diff < MINUTE) return '刚刚'
      if (diff < HOUR) return Math.floor(diff / MINUTE) + '分钟前'
      if (diff < DAY) return Math.floor(diff / HOUR) + '小时前'
      return Math.floor(diff / DAY) + '天前'
    },
    duration (start, end) {
      const diff = Math.abs(Number(end) - Number(start))
      if (diff < MINUTE) return diff + '秒'
      if (diff < HOUR) return Math.floor(diff / MINUTE) + '分' + (diff % MINUTE) + '秒'
      return Math.floor(diff / HOUR) + '小时' + Math.floor((diff % HOUR) / MINUTE) + '分'
    },
    schemaLabel (schema, key) {
      if (schema && schema[key]) return schema[key].label || key
      return key
    },
    displayValue (schema, key, value) {
      const field = schema && schema[key]
      if (field && field.type === 'secret') return '******'
      if (field && field.type === 'boolean') return value ? '是' : '否'
      return value
    },
    shortId (value, length = 12) {
      return shortId(value, length)
    },
    formatDate (value) {
      return formatDateTime(Number(value) * 1000)
    }
  }
}
</script>

<style lang="scss" scoped>
// ---- 统计卡片 ----
.stats-row {
  display: flex; gap: 16px; margin: 20px 20px 0;
}
.stat-card {
  flex: 1;
  background: #fff; border-radius: 6px; padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  cursor: pointer; transition: box-shadow .2s, transform .2s;
  border-left: 3px solid transparent;
  display: flex; flex-direction: column; gap: 4px;
  &:hover { box-shadow: 0 2px 12px rgba(0,0,0,.1); transform: translateY(-1px); }
  &.active { border-left-color: #409eff; box-shadow: 0 2px 12px rgba(64,158,255,.2); }
}
.stat-num { font-size: 28px; font-weight: 700; color: #303133; font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }
.stat-label { font-size: 13px; color: #909399; display: flex; align-items: center; gap: 6px; }
.stat-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; }
.stat-dot.run { background: #67c23a; }
.stat-dot.fail { background: #f56c6c; }
.stat-running .stat-num { color: #67c23a; }
.stat-failed .stat-num { color: #f56c6c; }
.stat-pending .stat-num { color: #909399; }
.stat-installing .stat-num { color: #e6a23c; }

// ---- 内容卡片 ----
.content-card {
  margin: 16px 20px 20px;
  background: #fff; border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  padding: 20px;
}

// ---- 工具栏 ----
.toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.search-input { width: 320px; }

// ---- 表格 ----
::v-deep .el-table {
  th { padding: 10px 0; font-size: 12px; letter-spacing: .3px; }
  td { padding: 12px 0; font-size: 13px; }
  .el-table__expanded-cell { padding: 20px 24px 16px; background: #f8f9fb; border-top: 1px solid #ebeef5; }
  &::before { display: none; }
  .el-table__row--striped td { background: #fafbfc; }
}
.link {
  color: #409eff; cursor: pointer;
  &:hover { text-decoration: underline; }
}

// ---- 应用信息 ----
.app-info {
  display: flex; flex-direction: column; gap: 2px;
  .app-title { color: #303133; font-weight: 500; }
  .app-service { color: #909399; font-size: 12px; font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }
}

// ---- 状态徽章 ----
.status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; padding: 3px 10px; border-radius: 12px;
  font-weight: 500;
  .status-dot { width: 6px; height: 6px; border-radius: 50%; }
}
.status-running { background: #f0f9eb; color: #67c23a; .status-dot { background: #67c23a; } }
.status-failed { background: #fef0f0; color: #f56c6c; .status-dot { background: #f56c6c; } }
.status-pending { background: #f4f4f5; color: #909399; .status-dot { background: #909399; } }
.status-installing { background: #fdf6ec; color: #e6a23c; .status-dot { background: #e6a23c; } }

// ---- 时间 ----
.time-cell {
  display: flex; flex-direction: column; gap: 1px;
  .time-rel { font-size: 13px; color: #303133; }
  .time-abs { font-size: 12px; color: #909399; }
}

// ---- 展开内容 ----
.expand-content {
  .expand-cols { display: flex; gap: 24px; flex-wrap: wrap; }
  .expand-col { flex: 1; min-width: 280px; margin-bottom: 16px; }
  .expand-section { margin-bottom: 16px; }
  .expand-section-title { font-size: 12px; font-weight: 600; color: #909399; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .5px; }
  .expand-footer {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; color: #909399; margin-top: 16px; padding-top: 12px;
    border-top: 1px solid #e4e7ed;
  }
  .expand-duration { margin-left: auto; }
}
.job-id {
  font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
  font-size: 12px; color: #606266; background: #ebeef5;
  padding: 2px 8px; border-radius: 4px;
}

// ---- 其他 ----
.cell-sub { color: #909399; font-size: 12px; }
.cell-metric { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; font-size: 13px; color: #303133; }
.empty-state { text-align: center; padding: 48px 0; color: #c0c4cc;
  .empty-icon { font-size: 48px; }
  .empty-text { margin-top: 12px; font-size: 14px; }
}
</style>
