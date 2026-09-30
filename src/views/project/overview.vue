<template>
  <div class="project-container project-overview">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <div class="overview-content">
      <div class="overview-toolbar">
        <h2 class="overview-title">概览</h2>
        <div v-if="canOperate" class="toolbar-actions">
          <router-link v-if="isSource" :to="{ path: r('build'), query: { action: 'build' } }"><el-button size="small" icon="el-icon-video-play">发起构建</el-button></router-link>
          <router-link :to="{ path: r('deploy'), query: { action: 'create' } }"><el-button size="small" type="primary" icon="el-icon-upload2">新建部署</el-button></router-link>
        </div>
      </div>
      <div id="delivery-view">
        <el-alert v-if="overviewError" title="项目状态加载失败" type="error" :closable="false" show-icon>
          <el-button type="text" @click="load">重新加载</el-button>
        </el-alert>
        <section v-if="overviewLoaded && !overviewError" :class="['status-banner', `status-${readinessType}`]">
          <i :class="readinessIcon"></i>
          <div class="status-copy"><strong>{{ readinessLabel }}</strong><span>{{ readinessMessage }}</span></div>
          <router-link v-if="canOperate || readinessType === 'success'" :to="nextAction.to" class="inline-link">{{ nextAction.label }} <i class="el-icon-arrow-right"></i></router-link>
        </section>
        <section v-loading="loading" class="overview-panel chain-panel">
          <div class="section-heading"><h3>交付链路</h3><div class="project-meta">
            <router-link :to="r('member')">{{ overviewLoaded && !overviewError ? `${overview.member.count} 位成员` : '项目成员' }}</router-link>
            <span>最近活动 {{ overviewLoaded && !overviewError ? lastActivity : '—' }}</span>
          </div></div>
          <div class="delivery-chain">
            <router-link v-for="(stage, index) in stages" :key="stage.title" :to="stage.to" :class="['chain-stage', stage.state]">
              <div class="stage-heading"><span class="stage-number">{{ index + 1 }}</span><span>{{ stage.title }}</span><i :class="stage.icon"></i></div>
              <strong>{{ overviewLoaded && !overviewError ? stage.value : '—' }}</strong>
              <small>{{ overviewLoaded && !overviewError ? stage.note : '等待加载' }}</small>
              <i v-if="index < stages.length - 1" class="el-icon-arrow-right chain-arrow"></i>
            </router-link>
          </div>
          <div class="chain-support">
            <router-link :to="r('configuration')"><i class="el-icon-set-up"></i> 配置中心 <span>为部署提供环境变量与密钥</span></router-link>
            <router-link :to="r('routes')"><i class="el-icon-guide"></i> 访问路由 <span>{{ overviewLoaded && !overviewError ? `${overview.route.enabled} 条已启用` : '—' }}</span></router-link>
          </div>
        </section>
        <recent-deliveries
          :org-id="orgId"
          :group-id="groupId"
          :project-id="projectId"
          :is-source="isSource"
          :delivery="delivery"
          :summary-available="overviewLoaded && !overviewError"
          @settled="load" />
        <section class="overview-panel monitoring-panel" v-loading="webLoading">
          <div class="section-heading"><h3>运行摘要 <small>最近 24 小时</small></h3><router-link :to="r('monitoring')" class="inline-link">完整监控与告警 <i class="el-icon-arrow-right"></i></router-link></div>
          <div v-if="web.available" class="monitoring-summary">
            <div><span>Web 请求</span><strong>{{ integer(webSummary.requests) }}</strong><small>{{ number(webSummary.rps) }} RPS</small></div>
            <div><span>请求成功率</span><strong>{{ number(webSummary.success_rate) }}%</strong><small>5xx {{ integer(webSummary.server_errors) }}</small></div>
            <div><span>P95 响应时间</span><strong>{{ durationMs(webSummary.p95_seconds) }}</strong><small>目标 ≤ {{ integer(webSloObjectives.p95_ms_max) }} ms</small></div>
            <div><span>Web SLO</span><el-tag :type="webSloTagType" size="small">{{ webSloStatusText }}</el-tag><small>可用性 {{ sloValue(webSlo.availability, '%') }}</small></div>
          </div>
          <div v-else-if="!webLoading" class="monitoring-empty">{{ web.metric_note || '暂无 Web 请求指标，配置访问路由后可在此查看运行情况。' }}</div>
          <div v-if="web.partial" class="monitoring-empty">部分集群指标暂不可用，当前摘要仅包含已获取的数据。</div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import RecentDeliveries from '@/views/project/components/RecentDeliveries'
import { projectHttpMonitoringSummary, projectOverview } from '@/api/project'
import { formatTimeDiffNow, routeBreadcrumb } from '@/utils/helpers'

const emptyOverview = () => ({
  source: {
    mode: 'repository',
    configured: false,
    connection_status: 'unknown',
    default_branch: '',
    checked_at: 0,
    image_name: '',
    registry_count: 0,
    commit_count: null,
    commit_count_available: false,
    commit_count_error: ''
  },
  pipeline: { total: 0, active: 0, archived: 0 },
  artifact: { total: 0, deployed: 0 },
  build: { total: 0, running: 0, succeeded: 0, failed: 0 },
  release: { total: 0, deploying: 0, succeeded: 0, failed: 0 },
  runtime: { services: 0, desired_replicas: 0, running_replicas: 0, unhealthy: 0 },
  route: { total: 0, enabled: 0, tls: 0 },
  member: { count: 0 },
  delivery_30d: {
    builds: { total: 0, succeeded: 0, success_rate: 0 },
    releases: { total: 0, succeeded: 0, deploys: 0, rollbacks: 0, success_rate: 0 }
  },
  web_24h: {
    available: false,
    partial: false,
    summary: {},
    slo: { status: 'no_data', checks: {}, objectives: {} },
    metric_note: ''
  },
  last_activity_at: 0
})

export default {
  name: 'ProjectOverview',
  components: { Breadcrumb, RecentDeliveries },
  props: {
    project: { type: Object, default: null },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return {
      overview: emptyOverview(),
      loading: false,
      overviewLoaded: false,
      overviewError: false,
      webLoading: false
    }
  },
  computed: {
    breadcrumb () { return [...routeBreadcrumb(this), { title: this.$route.meta.title, to: '' }] },
    delivery () { return this.overview.delivery_30d || emptyOverview().delivery_30d },
    web () { return this.overview.web_24h || emptyOverview().web_24h },
    webSummary () { return this.web.summary || {} },
    webSlo () { return this.web.slo || emptyOverview().web_24h.slo },
    webSloObjectives () {
      return Object.assign({
        availability_target: 99.9,
        success_rate_target: 99,
        p95_ms_max: 500
      }, this.webSlo.objectives || {})
    },
    webSloTagType () {
      return this.webSlo.status === 'met' ? 'success' : this.webSlo.status === 'breached' ? 'danger' : 'info'
    },
    webSloStatusText () {
      return this.webSlo.status === 'met' ? '全部达标' : this.webSlo.status === 'breached' ? '存在未达标项' : '暂无数据'
    },
    isSource () { return Boolean(Number(this.project.develop)) },
    sourceRoute () { return this.isSource ? this.r('gitrepo/profile') : this.r('build/artifacts') },
    canOperate () { return this.$p('project.no_viewer', this.project.org_role, this.project.group_role, this.project.role) },
    stages () {
      const o = this.overview
      return [
        ...(this.isSource ? [{ title: '代码仓库', icon: 'el-icon-connection', to: this.sourceRoute, value: o.source.default_branch || 'Git 仓库', note: this.sourceStatus, state: o.source.connection_status === 'error' ? 'error' : o.source.configured ? 'ready' : 'pending' }] : []),
        ...(this.isSource ? [{ title: '构建', icon: 'el-icon-set-up', to: this.r('build'), value: `${o.pipeline.active} 条流水线`, note: o.build.running ? `${o.build.running} 个任务执行中` : '选择代码版本生成镜像', state: o.pipeline.active ? 'ready' : 'pending' }] : []),
        { title: '镜像制品', icon: 'el-icon-box', to: this.r('build/artifacts'), value: `${o.artifact.total} 个制品`, note: this.isSource ? '构建产物，可追溯至提交' : '导入已有镜像后发布', state: o.artifact.total ? 'ready' : 'pending' },
        { title: '部署', icon: 'el-icon-upload2', to: this.r('deploy'), value: `${o.release.total} 次发布`, note: o.release.deploying ? `${o.release.deploying} 个发布执行中` : '选择镜像与目标环境', state: o.release.total ? 'ready' : 'pending' },
        { title: '运行实例', icon: 'el-icon-monitor', to: this.r('instance'), value: `${o.runtime.services} 个实例`, note: `副本 ${o.runtime.running_replicas}/${o.runtime.desired_replicas}`, state: o.runtime.unhealthy ? 'error' : o.runtime.services ? 'ready' : 'pending' }
      ]
    },
    nextAction () {
      const o = this.overview
      if (o.runtime.unhealthy) return { label: '查看异常实例', to: this.r('instance') }
      if (this.isSource && (!o.source.configured || o.source.connection_status === 'error')) return { label: '查看代码仓库', to: this.sourceRoute }
      if (this.isSource && !o.pipeline.active) return { label: '配置流水线', to: this.r('pipeline') }
      if (!o.artifact.total) return { label: this.isSource ? '发起构建' : '导入镜像', to: this.isSource ? { path: this.r('build'), query: { action: 'build' } } : this.r('build/artifacts') }
      if (!o.runtime.services) return { label: '选择镜像部署', to: this.r('build/artifacts') }
      return { label: '查看运行监控', to: this.r('monitoring') }
    },
    lastActivity () { return this.overview.last_activity_at ? `${formatTimeDiffNow(this.overview.last_activity_at)}前` : '暂无' },
    readinessLabel () {
      return ({ success: '运行正常', warning: '需要配置', error: '存在异常' })[this.readinessType]
    },
    readinessIcon () {
      return ({ success: 'el-icon-success', warning: 'el-icon-warning', error: 'el-icon-error' })[this.readinessType]
    },
    sourceStatus () {
      if (!this.isSource) return this.overview.source.configured ? 'Registry 已关联' : '未配置'
      return ({ reachable: '可访问', error: '异常', unknown: '未检查', missing: '未配置' })[this.overview.source.connection_status] || '未知'
    },
    readinessMessage () {
      if (this.overview.runtime.unhealthy) return `有 ${this.overview.runtime.unhealthy} 个运行实例异常，请查看实例状态。`
      if (this.isSource && !this.overview.source.configured) return '尚未配置 Git 仓库，无法进入开发和构建阶段。'
      if (this.isSource && this.overview.source.connection_status === 'error') return 'Git 仓库最近一次检查失败，请先修复仓库地址或凭据。'
      if (this.isSource && !this.overview.pipeline.active) return '尚未创建有效流水线，代码暂时无法构建为镜像。'
      if (!this.isSource && !this.overview.source.configured && !this.overview.artifact.total) return '尚未关联镜像 Registry，无法校验并登记可部署的 OCI 镜像。'
      if (!this.isSource && !this.overview.source.configured) return '已有历史镜像制品仍可部署，但当前未关联 Registry，无法校验并导入新的镜像版本。'
      if (!this.overview.artifact.total) return this.isSource ? '尚无镜像制品，请选择确定的 Git Commit 发起构建。' : '尚未登记可部署的 OCI 镜像。'
      if (!this.overview.runtime.services) return '镜像制品已就绪，下一步可以选择目标环境进行首次部署。'
      return '交付链路已就绪，运行实例正常。'
    },
    readinessType () {
      if (this.overview.runtime.unhealthy || this.overview.source.connection_status === 'error') return 'error'
      if (!this.overview.source.configured || (this.isSource && !this.overview.pipeline.active) || !this.overview.artifact.total || !this.overview.runtime.services) return 'warning'
      return 'success'
    }
  },
  created () { this.load() },
  methods: {
    r (suffix) { return `/project/${this.groupId}/${this.projectId}/${suffix}` },
    number (value) { return Number(value || 0).toFixed(2).replace(/\.00$/, '') },
    integer (value) { return Math.round(Number(value || 0)).toLocaleString() },
    durationMs (seconds) {
      const ms = Number(seconds || 0) * 1000
      return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(ms < 10 ? 2 : 1)} ms`
    },
    sloValue (value, suffix) {
      return value === null || value === undefined ? '-' : `${this.number(value)}${suffix}`
    },
    load () {
      if (this.loading) return
      this.loading = true
      this.overviewError = false
      projectOverview(this.orgId, this.groupId, this.projectId)
        .then(res => {
          this.overview = Object.assign(emptyOverview(), res.data.overview || {})
          this.overviewLoaded = true
          this.loadWebMonitoring()
        })
        .catch(() => { this.overviewError = true })
        .finally(() => { this.loading = false })
    },
    loadWebMonitoring () {
      this.webLoading = true
      projectHttpMonitoringSummary(this.orgId, this.groupId, this.projectId, 24)
        .then(res => {
          this.$set(this.overview, 'web_24h', Object.assign(emptyOverview().web_24h, res.data || {}))
        })
        .catch(error => {
          const message = error && error.message ? error.message : 'Web 网关指标加载失败'
          this.$set(this.overview, 'web_24h', Object.assign(emptyOverview().web_24h, { metric_note: message }))
        })
        .finally(() => { this.webLoading = false })
    }
  }
}
</script>

<style lang="scss" scoped>
.overview-content { padding: 0 24px 28px; color: #303b4d; }
.overview-toolbar { display: flex; justify-content: space-between; align-items: center; min-height: 76px; gap: 12px; }
.overview-title { margin: 0; font-size: 17px; font-weight: 600; }
.toolbar-actions { display: flex; gap: 10px; }
.status-banner { display: flex; gap: 12px; align-items: center; border: 1px solid #e8edf3; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; background: #f8fafc; }
.status-banner > i { font-size: 21px; }
.status-success > i { color: #45a36e; }
.status-warning > i { color: #cc9635; }
.status-error > i { color: #e26363; }
.status-copy { display: flex; flex-wrap: wrap; gap: 10px; flex: 1; line-height: 1.6; }
.status-copy span { color: #6b7789; font-size: 13px; }
.inline-link { font-size: 13px; color: #2378cf; white-space: nowrap; }
.overview-panel { border: 1px solid #e7ecf2; border-radius: 10px; background: #fff; margin-bottom: 20px; overflow: hidden; }
.section-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 18px 20px; }
.project-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: #8893a3; }
.project-meta a:hover { color: #2378cf; }
.section-heading h3 { margin: 0; font-size: 15px; font-weight: 600; }
.section-heading > span, .section-heading small { color: #8893a3; font-size: 12px; font-weight: normal; margin-left: 8px; }
.delivery-chain { display: flex; padding: 0 20px 20px; gap: 24px; }
.chain-stage { position: relative; flex: 1; min-width: 0; padding: 16px; border: 1px solid #e7ecf2; border-radius: 8px; transition: border-color .15s, background .15s; }
.chain-stage:hover { border-color: #a9cff8; background: #f8fbff; }
.stage-heading { display: flex; align-items: center; gap: 7px; font-size: 13px; }
.stage-heading > i { margin-left: auto; color: #8a99ac; }
.stage-number { display: inline-flex; width: 20px; height: 20px; border-radius: 50%; align-items: center; justify-content: center; font-size: 11px; color: #8a99ac; background: #f1f4f8; }
.ready .stage-number { color: #38845f; background: #edf8f0; }
.error .stage-number { color: #d55b5b; background: #fdf0f0; }
.chain-stage strong { display: block; font-size: 18px; font-weight: 600; margin: 14px 0 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chain-stage small { display: block; color: #8793a3; font-size: 12px; line-height: 1.6; }
.chain-arrow { position: absolute; right: -21px; top: 50%; color: #b2bfce; }
.chain-support { display: flex; flex-wrap: wrap; gap: 24px; border-top: 1px solid #eef1f5; background: #fafbfd; padding: 12px 20px; font-size: 13px; }
.chain-support span { color: #8893a3; font-size: 12px; margin-left: 8px; }
.monitoring-summary { display: grid; grid-template-columns: repeat(4, 1fr); padding: 0 20px 20px; }
.monitoring-summary > div { padding: 4px 20px; border-right: 1px solid #eef1f5; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
.monitoring-summary > div:first-child { padding-left: 0; }
.monitoring-summary > div:last-child { border: 0; }
.monitoring-summary span, .monitoring-summary small { color: #8893a3; font-size: 12px; }
.monitoring-summary strong { font-size: 24px; font-weight: 600; }
.monitoring-empty { padding: 0 20px 20px; font-size: 13px; color: #8893a3; line-height: 1.7; }
@media (max-width: 1250px) { .delivery-chain { gap: 16px; } .chain-stage { padding: 12px; } .chain-stage strong { font-size: 16px; } .chain-arrow { right: -16px; } }
@media (max-width: 1000px) { .delivery-chain { flex-wrap: wrap; } .chain-stage { flex-basis: 25%; } .chain-arrow { display: none; } .monitoring-summary { grid-template-columns: repeat(2, 1fr); gap: 20px; } .overview-toolbar, .status-banner { flex-wrap: wrap; } }
</style>
