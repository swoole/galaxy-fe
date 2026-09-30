<template>
  <section class="recent-deliveries">
    <div class="activity-heading">
      <h3>近期交付</h3>
      <div v-if="summaryAvailable" class="delivery-summary">
        <span v-if="isSource">30 天构建 <strong>{{ delivery.builds.total }}</strong> 次 · 成功 {{ rate(delivery.builds) }}</span>
        <span>30 天部署 <strong>{{ delivery.releases.total }}</strong> 次 · 成功 {{ rate(delivery.releases) }}</span>
      </div>
    </div>
    <div class="activity-toolbar">
      <div role="tablist" aria-label="交付记录" class="activity-tabs">
        <button
          v-if="isSource"
          id="recent-build-tab"
          role="tab"
          aria-controls="recent-records"
          :aria-selected="active === 'build'"
          :class="{ active: active === 'build' }"
          @click="active = 'build'">构建记录</button>
        <button
          id="recent-release-tab"
          role="tab"
          aria-controls="recent-records"
          :aria-selected="active === 'release'"
          :class="{ active: active === 'release' }"
          @click="active = 'release'">部署记录</button>
      </div>
      <router-link :to="route(active === 'build' ? 'ProjectBuild' : 'ProjectDeploy')" class="text-link">查看全部 <i class="el-icon-arrow-right"></i></router-link>
    </div>
    <div id="recent-records" role="tabpanel" :aria-labelledby="active === 'build' ? 'recent-build-tab' : 'recent-release-tab'">
      <div v-if="errors[active]" class="load-error">记录加载失败 <el-button type="text" @click="load(active)">重试</el-button></div>
      <el-table v-else v-loading="loading[active]" :data="records[active]" :empty-text="active === 'build' ? '暂无构建记录，可从流水线发起首次构建' : '暂无部署记录，选择镜像制品开始部署'" class="activity-table">
        <el-table-column label="状态" width="104">
          <template #default="{ row }"><el-tag :type="status(row).type" size="mini" effect="plain">{{ status(row).label }}</el-tag></template>
        </el-table-column>
        <el-table-column :label="active === 'build' ? '构建 / 来源' : '部署 / 环境'" min-width="200">
          <template #default="{ row }">
            <el-link v-if="active === 'build'" :underline="false" type="primary" @click="$refs.buildLog.show(groupId, projectId, row.id)">#{{ row.id }}</el-link>
            <router-link v-else :to="route('ProjectDeploy', { release: row.id })" class="text-link">#{{ row.id }} {{ row.version }}</router-link>
            <div v-if="active === 'build'" class="record-note">
              <router-link v-if="row.pipeline" :to="pipelineRoute(row)">{{ row.pipeline.title }}</router-link>
              <span v-else>{{ row.executor === 'external-image' ? '镜像导入' : '流水线已移除' }}</span>
              <span> · {{ row.branch || '—' }} <code>{{ revision(row) }}</code></span>
            </div>
            <div v-else class="record-note">{{ row.env ? row.env.title : `环境 #${row.env_id}` }} · {{ (row.desired_spec || {}).instance_name || (row.desired_spec || {}).service_name || '—' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="镜像制品" min-width="210" show-overflow-tooltip>
          <template #default="{ row }">
            <router-link v-if="artifact(row)" :to="imageRoute(artifact(row))" class="text-link">{{ artifact(row).reference }}</router-link>
            <span v-else class="muted">{{ active === 'build' ? '尚无产物' : '制品已移除' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">{{ duration(row) }}</template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }"><span class="muted">{{ row.created_at | formatDate }}</span></template>
        </el-table-column>
        <el-table-column label="下一步" width="108" align="right">
          <template #default="{ row }">
            <router-link v-if="active === 'build' && artifact(row)" :to="imageRoute(artifact(row))" class="text-link">查看制品 <i class="el-icon-arrow-right"></i></router-link>
            <el-button v-else-if="active === 'build'" type="text" @click="$refs.buildLog.show(groupId, projectId, row.id)">查看日志</el-button>
            <router-link v-else :to="route('ProjectDeploy', { release: row.id })" class="text-link">部署详情 <i class="el-icon-arrow-right"></i></router-link>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <build-log ref="buildLog" :org-id="orgId" @finish="load('build')" />
  </section>
</template>

<script>
import { builds, releases } from '@/api/project'
import { STATUSES } from '@/consts/pipeline'
import { formatDate } from '@/utils/filters'
import BuildLog from '@/views/project/components/BuildLog'

const releaseStatuses = {
  pending: { label: '待执行', type: 'info' },
  deploying: { label: '部署中', type: 'warning' },
  succeeded: { label: '成功', type: 'success' },
  failed: { label: '失败', type: 'danger' },
  'rolled-back': { label: '已回滚', type: 'info' }
}

export default {
  name: 'RecentDeliveries',
  components: { BuildLog },
  filters: { formatDate },
  props: {
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true },
    isSource: { type: Boolean, default: true },
    delivery: { type: Object, required: true },
    summaryAvailable: { type: Boolean, default: false }
  },
  data () {
    return {
      active: this.isSource ? 'build' : 'release',
      records: { build: [], release: [] },
      loading: { build: false, release: false },
      errors: { build: false, release: false },
      timers: { build: null, release: null },
      disposed: false
    }
  },
  created () {
    if (this.isSource) this.load('build')
    this.load('release')
  },
  beforeDestroy () {
    this.disposed = true
    Object.values(this.timers).forEach(timer => clearTimeout(timer))
  },
  methods: {
    route (name, query = {}) { return { name, params: { groupId: this.groupId, projectId: this.projectId }, query } },
    imageRoute (artifact) { return { ...this.route('ProjectImageDetail'), params: { groupId: this.groupId, projectId: this.projectId, artifactId: artifact.id } } },
    pipelineRoute (row) { return { ...this.route('ProjectPipelineProfile'), params: { groupId: this.groupId, projectId: this.projectId, pipelineId: row.pipeline.id } } },
    artifact (row) { return this.active === 'build' ? (row.artifacts || [])[0] : row.artifact },
    revision (row) { return String(row.source_revision || row.commit_id || '').slice(0, 8) },
    rate (summary) { return Number(summary.total) ? `${Number(summary.success_rate || 0).toFixed(1).replace(/\.0$/, '')}%` : '—' },
    status (row) {
      const result = (this.active === 'build' ? STATUSES[Number(row.status)] : releaseStatuses[row.status]) || { label: '未知', type: 'info' }
      return { ...result, type: result.type === 'error' ? 'danger' : result.type }
    },
    duration (row) {
      const start = Number(this.active === 'build' ? row.start_at : row.started_at)
      const finish = Number(this.active === 'build' ? row.end_at : row.finished_at)
      if (!start) return '—'
      const running = this.active === 'build' ? Number(row.status) === 1 : row.status === 'deploying'
      if (!finish && !running) return '—'
      const seconds = Math.max(0, (finish || Math.floor(Date.now() / 1000)) - start)
      const value = seconds < 60 ? `${seconds} 秒` : `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
      return running ? `${value}…` : value
    },
    load (kind) {
      if (this.loading[kind] || this.disposed) return
      clearTimeout(this.timers[kind])
      this.loading[kind] = true
      this.errors[kind] = false
      const request = kind === 'build'
        ? builds(this.orgId, this.groupId, this.projectId, null, null, null, 1, 5)
        : releases(this.orgId, this.groupId, this.projectId, null, null, null, 1, 5)
      return request.then(res => {
        if (this.disposed) return
        const isActive = row => kind === 'build' ? [0, 1].includes(Number(row.status)) : ['pending', 'deploying'].includes(row.status)
        const previousActive = this.records[kind].filter(isActive).map(row => row.id)
        this.records[kind] = res.data.data || []
        if (previousActive.some(id => this.records[kind].some(row => row.id === id && !isActive(row)))) this.$emit('settled')
        const active = this.records[kind].some(isActive)
        if (active) this.timers[kind] = setTimeout(() => this.load(kind), 5000)
      }).catch(() => { this.errors[kind] = true }).finally(() => { this.loading[kind] = false })
    }
  }
}
</script>

<style lang="scss" scoped>
.recent-deliveries { background: #fff; border: 1px solid #e7ecf2; border-radius: 10px; margin-bottom: 20px; overflow: hidden; }
.activity-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; padding: 18px 20px 10px; }
.activity-heading h3 { margin: 0; font-size: 15px; font-weight: 600; }
.delivery-summary { display: flex; flex-wrap: wrap; gap: 18px; color: #8893a3; font-size: 12px; }
.delivery-summary strong { color: #56657a; font-weight: 500; }
.activity-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid #edf1f5; }
.activity-tabs { display: flex; gap: 24px; }
.activity-tabs button { padding: 14px 0; background: none; border: 0; border-bottom: 2px solid transparent; font: inherit; font-size: 13px; color: #8893a3; cursor: pointer; }
.activity-tabs button.active { color: #2378cf; border-bottom-color: #409eff; }
.text-link { font-size: 13px; color: #2378cf; }
.record-note { color: #8893a3; font-size: 12px; margin-top: 4px; }
.record-note a:hover { color: #2378cf; }
.muted { color: #8893a3; font-size: 12px; }
.load-error { padding: 25px 20px; color: #d55b5b; font-size: 13px; }
::v-deep .el-table th { background: #fafbfd; font-size: 12px; font-weight: 500; color: #7f8b9d; }
::v-deep .el-table td:first-child, ::v-deep .el-table th:first-child { padding-left: 10px; }
::v-deep .el-table td:last-child, ::v-deep .el-table th:last-child { padding-right: 10px; }
::v-deep .el-table::before { display: none; }
</style>
