<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <div class="project-main" v-loading="loading">
      <section :class="['status-hero', `status-${readinessType}`]">
        <div class="status-icon"><i :class="readinessIcon"></i></div>
        <div class="status-copy">
          <div class="eyebrow">项目状态</div>
          <h2>{{ readinessMessage }}</h2>
          <div class="status-meta">
            最近活动 {{ lastActivity }} · {{ overview.member.count }} 位成员
          </div>
        </div>
        <el-tag :type="readinessTagType" effect="dark">{{ readinessLabel }}</el-tag>
      </section>

      <easy-title title="关键链路" margin-set="28 16" />
      <div class="primary-grid">
        <router-link v-loading="sourceLoading" :to="sourceRoute" class="feature-card source-card">
          <div class="feature-icon"><i :class="project.develop ? 'el-icon-connection' : 'el-icon-box'"></i></div>
          <div class="feature-body">
            <span class="feature-label">{{ project.develop ? 'Git 提交次数' : '镜像来源' }}</span>
            <strong v-if="project.develop">
              {{ commitCount }} <em v-if="overview.source.commit_count_available">次</em>
            </strong>
            <strong v-else>{{ sourceStatus }}</strong>
            <small>{{ sourceFooter }}</small>
          </div>
          <i class="el-icon-arrow-right feature-arrow"></i>
        </router-link>

        <router-link :to="r('build/artifacts')" class="feature-card delivery-card">
          <div class="feature-icon"><i class="el-icon-cpu"></i></div>
          <div class="feature-body">
            <span class="feature-label">构建与制品</span>
            <strong>{{ overview.artifact.total }} <em>个制品</em></strong>
            <small>构建 {{ overview.build.total }} · 成功 {{ overview.build.succeeded }} · 失败 {{ overview.build.failed }}</small>
          </div>
          <i class="el-icon-arrow-right feature-arrow"></i>
        </router-link>

        <router-link :to="r('instance')" class="feature-card runtime-card">
          <div class="feature-icon"><i class="el-icon-s-platform"></i></div>
          <div class="feature-body">
            <span class="feature-label">运行状态</span>
            <strong>{{ overview.runtime.services }} <em>个实例</em></strong>
            <small>副本 {{ overview.runtime.running_replicas }}/{{ overview.runtime.desired_replicas }} · 异常 {{ overview.runtime.unhealthy }}</small>
          </div>
          <i class="el-icon-arrow-right feature-arrow"></i>
        </router-link>
      </div>

      <div class="quick-strip">
        <router-link v-if="project.develop" :to="r('pipeline')" class="quick-item">
          <i class="el-icon-share"></i><span>有效流水线</span><strong>{{ overview.pipeline.active }}</strong>
          <small>归档 {{ overview.pipeline.archived }}</small>
        </router-link>
        <router-link :to="r('routes')" class="quick-item">
          <i class="el-icon-guide"></i><span>启用路由</span><strong>{{ overview.route.enabled }}/{{ overview.route.total }}</strong>
          <small>HTTPS {{ overview.route.tls }}</small>
        </router-link>
        <router-link :to="r('deploy')" class="quick-item">
          <i class="el-icon-upload2"></i><span>累计发布</span><strong>{{ overview.release.total }}</strong>
          <small>执行中 {{ overview.release.deploying }}</small>
        </router-link>
        <router-link :to="r('member')" class="quick-item">
          <i class="el-icon-user"></i><span>项目成员</span><strong>{{ overview.member.count }}</strong>
          <small>协作成员</small>
        </router-link>
      </div>

      <easy-title title="最近 30 天交付" margin-set="30 16" />
      <div class="delivery-grid">
        <router-link :to="r('build')" class="delivery-panel build-panel">
          <div class="panel-copy">
            <div class="panel-heading">
              <div><i class="el-icon-set-up"></i><span>构建</span></div>
              <strong>{{ delivery.builds.total }}<small> 次</small></strong>
            </div>
            <div class="panel-caption">最近 30 天共成功构建 {{ delivery.builds.succeeded }} 次</div>
            <div class="panel-link">查看构建记录 <i class="el-icon-arrow-right"></i></div>
          </div>
          <el-progress
            type="circle"
            :percentage="percentage(delivery.builds.success_rate)"
            :width="106"
            :stroke-width="8"
            :format="progressFormat"
            color="#409eff" />
        </router-link>
        <router-link :to="r('deploy')" class="delivery-panel release-panel">
          <div class="panel-copy">
            <div class="panel-heading">
              <div><i class="el-icon-position"></i><span>发布</span></div>
              <strong>{{ delivery.releases.total }}<small> 次</small></strong>
            </div>
            <div class="panel-caption">
              部署 {{ delivery.releases.deploys }} 次 · 回滚 {{ delivery.releases.rollbacks }} 次
            </div>
            <div class="panel-link">查看发布记录 <i class="el-icon-arrow-right"></i></div>
          </div>
          <el-progress
            type="circle"
            :percentage="percentage(delivery.releases.success_rate)"
            :width="106"
            :stroke-width="8"
            :format="progressFormat"
            color="#67c23a" />
        </router-link>
      </div>

      <easy-title title="Web 网关 · 最近 24 小时" margin-set="30 16" />
      <div v-loading="webLoading" class="web-monitoring">
        <el-alert
          v-if="!webLoading && !web.available"
          :title="web.metric_note || '暂无可用的 Web 网关请求指标'"
          type="warning"
          :closable="false"
          show-icon />
        <template v-else-if="!webLoading">
          <div class="web-grid">
            <metric-card title="请求总量" :value="integer(webSummary.requests)" :footer="`当前 RPS ${number(webSummary.rps)}`" :to="r('monitoring')" />
            <metric-card title="成功率" :value="`${number(webSummary.success_rate)}%`" :footer="`4xx ${integer(webSummary.client_errors)} / 5xx ${integer(webSummary.server_errors)}`" :to="r('monitoring')" compact />
            <metric-card title="平均响应时间" :value="durationMs(webSummary.avg_seconds)" footer="全部 Web 路由加权平均" :to="r('monitoring')" compact />
            <metric-card title="P95 / P99" :value="`${durationMs(webSummary.p95_seconds)} / ${durationMs(webSummary.p99_seconds)}`" footer="跨集群取最大值" :to="r('monitoring')" compact />
            <metric-card title="请求流量" :value="bytes(webSummary.request_bytes)" footer="请求 Body 累计" :to="r('monitoring')" compact />
            <metric-card title="响应流量" :value="bytes(webSummary.response_bytes)" footer="响应 Body 累计" :to="r('monitoring')" compact />
          </div>
          <div class="web-slo-heading">
            <strong>Web SLO</strong>
            <el-tag :type="webSloTagType" size="small">{{ webSloStatusText }}</el-tag>
            <span>目标可在监控页面的告警设置中调整</span>
          </div>
          <div class="web-slo-grid">
            <metric-card title="可用性" :value="sloValue(webSlo.availability, '%')" :footer="`目标 ≥ ${number(webSloObjectives.availability_target)}% · ${sloCheckText('availability')}`" :to="r('monitoring')" compact />
            <metric-card title="请求成功率" :value="sloValue(webSlo.success_rate, '%')" :footer="`目标 ≥ ${number(webSloObjectives.success_rate_target)}% · ${sloCheckText('success_rate')}`" :to="r('monitoring')" compact />
            <metric-card
              title="P95 响应时间"
              :value="sloValue(webSlo.p95_ms, ' ms')"
              :footer="`目标 ≤ ${integer(webSloObjectives.p95_ms_max)} ms · ${sloCheckText('p95')}`"
              :to="r('monitoring')"
              :type="p95LatencyType"
              compact />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import MetricCard from '@/views/project/components/MetricCard'
import { projectHttpMonitoringSummary, projectOverview, projectOverviewSource } from '@/api/project'
import { formatTimeDiffNow, routeBreadcrumb } from '@/utils/helpers'
import { latencyTypeFromMilliseconds } from '@/utils/metricStatus'

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
  components: { Breadcrumb, EasyTitle, MetricCard },
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
      sourceLoading: false,
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
    p95LatencyType () {
      return latencyTypeFromMilliseconds(this.webSlo.p95_ms)
    },
    webSloStatusText () {
      return this.webSlo.status === 'met' ? '全部达标' : this.webSlo.status === 'breached' ? '存在未达标项' : '暂无数据'
    },
    sourceRoute () { return this.project.develop ? this.r('gitrepo/profile') : this.r('build/artifacts') },
    lastActivity () { return this.overview.last_activity_at ? `${formatTimeDiffNow(this.overview.last_activity_at)}前` : '暂无' },
    readinessLabel () {
      return ({ success: '运行正常', warning: '需要配置', error: '存在异常' })[this.readinessType]
    },
    readinessTagType () { return this.readinessType === 'error' ? 'danger' : this.readinessType },
    readinessIcon () {
      return ({ success: 'el-icon-success', warning: 'el-icon-warning', error: 'el-icon-error' })[this.readinessType]
    },
    sourceStatus () {
      if (!this.project.develop) return this.overview.source.configured ? 'Registry 已关联' : '未配置'
      return ({ reachable: '可访问', error: '异常', unknown: '未检查', missing: '未配置' })[this.overview.source.connection_status] || '未知'
    },
    commitCount () {
      return this.overview.source.commit_count_available ? Number(this.overview.source.commit_count || 0) : '-'
    },
    sourceFooter () {
      if (this.project.develop && this.sourceLoading) return '正在读取 Git Vendor API…'
      return this.project.develop
        ? (this.overview.source.commit_count_available
            ? 'Git Vendor API · 默认分支'
            : (this.overview.source.configured ? 'Git Vendor API 暂不可用' : '尚未配置 Git 仓库'))
        : `${this.overview.source.image_name || '-'} · ${this.overview.source.registry_count} 个 Registry`
    },
    readinessMessage () {
      if (this.project.develop && !this.overview.source.configured) return '尚未配置 Git 仓库，无法进入开发和构建阶段。'
      if (this.project.develop && this.overview.source.connection_status === 'error') return 'Git 仓库最近一次检查失败，请先修复仓库地址或凭据。'
      if (this.project.develop && !this.overview.pipeline.active) return '尚未创建有效流水线，代码暂时无法构建为镜像。'
      if (!this.project.develop && !this.overview.source.configured && !this.overview.artifact.total) return '尚未关联镜像 Registry，无法校验并登记可部署的 OCI 镜像。'
      if (!this.project.develop && !this.overview.source.configured) return '已有历史镜像制品仍可部署，但当前未关联 Registry，无法校验并导入新的镜像版本。'
      if (!this.overview.artifact.total) return this.project.develop ? '尚无镜像制品，请选择确定的 Git Commit 发起构建。' : '尚未登记可部署的 OCI 镜像。'
      if (!this.overview.runtime.services) return '镜像制品已就绪，下一步可以创建首次 Swarm 发布。'
      if (this.overview.runtime.unhealthy) return `有 ${this.overview.runtime.unhealthy} 个运行实例异常，请进入实例或集群 Service 页面处理。`
      return '项目开发、构建和运行链路已建立。'
    },
    readinessType () {
      if (this.overview.runtime.unhealthy || this.overview.source.connection_status === 'error') return 'error'
      if (!this.overview.source.configured || (this.project.develop && !this.overview.pipeline.active) || !this.overview.artifact.total || !this.overview.runtime.services) return 'warning'
      return 'success'
    }
  },
  created () { this.load() },
  methods: {
    r (suffix) { return `/project/${this.groupId}/${this.projectId}/${suffix}` },
    number (value) { return Number(value || 0).toFixed(2).replace(/\.00$/, '') },
    integer (value) { return Math.round(Number(value || 0)).toLocaleString() },
    percentage (value) { return Math.max(0, Math.min(100, Number(value || 0))) },
    progressFormat (value) { return `${this.number(value)}%` },
    durationMs (seconds) {
      const ms = Number(seconds || 0) * 1000
      return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(ms < 10 ? 2 : 1)} ms`
    },
    bytes (value) {
      let size = Number(value || 0)
      const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
      let index = 0
      while (size >= 1024 && index < units.length - 1) {
        size /= 1024
        index++
      }
      return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
    },
    sloValue (value, suffix) {
      return value === null || value === undefined ? '-' : `${this.number(value)}${suffix}`
    },
    sloCheckText (key) {
      return ({ met: '达标', breached: '未达标', no_data: '无数据' })[(this.webSlo.checks || {})[key]] || '无数据'
    },
    load () {
      this.loading = true
      projectOverview(this.orgId, this.groupId, this.projectId)
        .then(res => {
          this.overview = Object.assign(emptyOverview(), res.data.overview || {})
          this.loadSource()
          this.loadWebMonitoring()
        })
        .finally(() => { this.loading = false })
    },
    loadSource () {
      if (!this.project.develop || !this.overview.source.configured) {
        this.sourceLoading = false
        return
      }
      this.sourceLoading = true
      projectOverviewSource(this.orgId, this.groupId, this.projectId)
        .then(res => {
          this.$set(this.overview, 'source', Object.assign({}, this.overview.source, res.data.source || {}))
        })
        .finally(() => { this.sourceLoading = false })
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
.status-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  border: 1px solid #d9ecff;
  border-radius: 10px;
  background: linear-gradient(135deg, #f4f9ff, #fff);
}
.status-hero.status-success { border-color: #d5f1df; background: linear-gradient(135deg, #f0f9eb, #fff); }
.status-hero.status-warning { border-color: #faecd8; background: linear-gradient(135deg, #fdf6ec, #fff); }
.status-hero.status-error { border-color: #fde2e2; background: linear-gradient(135deg, #fef0f0, #fff); }
.status-icon { display: grid; width: 46px; height: 46px; place-items: center; border-radius: 12px; background: #fff; color: #409eff; font-size: 25px; box-shadow: 0 4px 14px rgba(31, 45, 61, .08); }
.status-warning .status-icon { color: #e6a23c; }
.status-error .status-icon { color: #f56c6c; }
.status-success .status-icon { color: #67c23a; }
.status-copy { flex: 1; min-width: 0; }
.eyebrow { margin-bottom: 4px; color: #909399; font-size: 12px; letter-spacing: .08em; }
.status-copy h2 { margin: 0; color: #303133; font-size: 17px; font-weight: 600; line-height: 1.5; }
.status-meta { margin-top: 5px; color: #909399; font-size: 12px; }
.primary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.feature-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 116px;
  padding: 18px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  color: inherit;
  background: #fff;
  transition: transform .18s ease, box-shadow .18s ease;
}
.feature-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(31, 45, 61, .09); }
.feature-icon { display: grid; flex: 0 0 48px; height: 48px; place-items: center; border-radius: 12px; background: #ecf5ff; color: #409eff; font-size: 23px; }
.delivery-card .feature-icon { background: #f4f0ff; color: #7b61ff; }
.runtime-card .feature-icon { background: #f0f9eb; color: #67c23a; }
.feature-body { min-width: 0; }
.feature-body span, .feature-body small { display: block; }
.feature-label { margin-bottom: 8px; color: #909399; font-size: 13px; }
.feature-body strong { color: #303133; font-size: 23px; font-style: normal; }
.feature-body em { color: #606266; font-size: 13px; font-style: normal; font-weight: 400; }
.feature-body small { margin-top: 8px; overflow: hidden; color: #909399; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.feature-arrow { margin-left: auto; color: #c0c4cc; }
.quick-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 16px; overflow: hidden; border: 1px solid #ebeef5; border-radius: 10px; background: #fff; }
.quick-item { display: grid; grid-template-columns: 24px 1fr auto; align-items: center; gap: 5px 8px; padding: 15px 17px; color: #606266; border-right: 1px solid #ebeef5; }
.quick-item:last-child { border-right: 0; }
.quick-item > i { grid-row: 1 / 3; color: #409eff; font-size: 18px; }
.quick-item > span { font-size: 13px; }
.quick-item > strong { color: #303133; font-size: 19px; }
.quick-item > small { color: #a0a4aa; font-size: 11px; }
.delivery-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.web-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.web-monitoring { min-height: 88px; }
.web-slo-heading { display: flex; align-items: center; gap: 10px; margin: 20px 2px 10px; }
.web-slo-heading > span { color: #909399; font-size: 12px; }
.web-slo-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.delivery-panel { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 20px 24px; border: 1px solid #e4e7ed; border-radius: 10px; color: inherit; background: #fff; }
.delivery-panel:hover { border-color: #b3d8ff; }
.panel-copy { flex: 1; min-width: 0; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.panel-heading > div { display: flex; align-items: center; gap: 9px; color: #606266; font-weight: 600; }
.panel-heading i { color: #409eff; font-size: 20px; }
.release-panel .panel-heading i { color: #67c23a; }
.panel-heading > strong { color: #303133; font-size: 28px; }
.panel-heading small { color: #909399; font-size: 12px; font-weight: 400; }
.panel-caption { color: #909399; font-size: 13px; line-height: 1.6; }
.panel-link { margin-top: 15px; color: #409eff; font-size: 12px; }
.release-panel .panel-link { color: #67c23a; }
::v-deep .delivery-panel .el-progress__text { color: #303133; font-size: 17px !important; font-weight: 600; }
@media (max-width: 1100px) {
  .primary-grid { grid-template-columns: 1fr; }
  .web-grid { grid-template-columns: repeat(2, 1fr); }
  .quick-strip { grid-template-columns: repeat(2, 1fr); }
  .quick-item:nth-child(2) { border-right: 0; }
  .quick-item:nth-child(-n+2) { border-bottom: 1px solid #ebeef5; }
}
@media (max-width: 760px) {
  .status-hero { align-items: flex-start; }
  .delivery-grid, .quick-strip, .web-grid, .web-slo-grid { grid-template-columns: 1fr; }
  .quick-item { border-right: 0; border-bottom: 1px solid #ebeef5; }
}
</style>
