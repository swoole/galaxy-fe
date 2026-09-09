<template>
  <div class="project-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <div class="project-main">
      <div class="heading">
        <easy-title :title="'Pod 详情 · ' + (pod.metadata ? pod.metadata.name : '')" margin-set="0" />
        <div class="heading-actions">
          <el-button size="small" icon="el-icon-monitor" :disabled="!containers.length" @click="openTerminal">
            终端
          </el-button>
          <el-button size="small" icon="el-icon-back" @click="goBack">返回</el-button>
        </div>
      </div>
      <el-alert
        v-if="error"
        type="error"
        :closable="false"
        show-icon
        :title="error"
        class="section" />
      <template v-if="loaded">
        <el-tabs v-model="activeTab" class="section" @tab-click="onTabClick">
          <el-tab-pane label="概览" name="overview">
            <div class="block section">
              <easy-title :level="'h4'">基本信息</easy-title>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="名称">{{ pod.metadata.name }}</el-descriptions-item>
                <el-descriptions-item label="命名空间">{{ pod.metadata.namespace }}</el-descriptions-item>
                <el-descriptions-item label="节点">{{ pod.spec.nodeName || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Pod IP">{{ pod.status.podIP || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Host IP">{{ pod.status.hostIP || '-' }}</el-descriptions-item>
                <el-descriptions-item label="状态">{{ pod.status.phase }}</el-descriptions-item>
                <el-descriptions-item label="创建时间">{{ pod.metadata.creationTimestamp }}</el-descriptions-item>
                <el-descriptions-item label="ServiceAccount">{{ pod.spec.serviceAccountName || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>
            <div class="block section">
              <easy-title :level="'h4'">标签</easy-title>
              <template v-if="labelList.length">
                <el-tag v-for="(v, k) in labelList" :key="k" size="small" type="info" class="label-tag">{{ k }}={{ v }}</el-tag>
              </template>
              <span v-else class="cell-sub">-</span>
            </div>
            <div class="block section">
              <easy-title :level="'h4'">容器状态</easy-title>
              <el-table :data="containerStatuses" border size="small" empty-text="无容器">
                <el-table-column label="名称" prop="name" min-width="200" />
                <el-table-column label="镜像" prop="image" min-width="300" />
                <el-table-column label="就绪" width="90" align="center">
                  <template #default="{ row }"><el-tag size="small" :type="row.ready ? 'success' : 'danger'">{{ row.ready ? 'Ready' : 'NotReady' }}</el-tag></template>
                </el-table-column>
                <el-table-column label="重启次数" prop="restartCount" width="100" align="center" />
                <el-table-column label="状态" min-width="200">
                  <template #default="{ row }">
                    <span v-if="row.waiting" class="cell-sub">{{ row.waiting.reason }}：{{ row.waiting.message }}</span>
                    <span v-else-if="row.running" class="text-success">Running ({{ row.running.startedAt }})</span>
                    <span v-else-if="row.terminated" class="cell-sub">Terminated ({{ row.terminated.reason }})</span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>
          <el-tab-pane label="容器" name="containers">
            <k8s-container-list
              :pod="pod"
              :org-id="orgId"
              :cluster-id="clusterId"
              @view-logs="openContainerLogs"
              @open-terminal="openContainerTerminal" />
          </el-tab-pane>
          <el-tab-pane label="日志" name="logs">
            <div class="log-panel">
              <div class="log-heading">
                <div>
                  <div class="log-title">容器日志</div>
                  <div class="log-context">{{ podNamespace }} / {{ podName }}</div>
                </div>
                <span class="log-summary">最近 {{ tailLines }} 行</span>
              </div>
              <div class="log-toolbar">
                <el-form :inline="true" size="small" class="log-filter-form" @submit.native.prevent>
                  <el-form-item label="容器">
                    <el-select
                      v-model="logContainer"
                      placeholder="请选择容器"
                      class="log-container"
                      :disabled="!containers.length"
                      @change="loadLogs">
                      <el-option v-for="container in containers" :key="container" :label="container" :value="container" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="显示行数">
                    <el-radio-group v-model="tailLines" @change="loadLogs">
                      <el-radio-button :label="100">100</el-radio-button>
                      <el-radio-button :label="500">500</el-radio-button>
                      <el-radio-button :label="1000">1000</el-radio-button>
                      <el-radio-button :label="2000">2000</el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                </el-form>
                <el-button
                  size="small"
                  type="primary"
                  icon="el-icon-refresh"
                  :loading="logsLoading"
                  :disabled="!logContainer"
                  @click="loadLogs">
                  刷新日志
                </el-button>
              </div>
              <div v-loading="logsLoading" class="log-body">
                <pre v-if="logs" class="log-pre" v-text="logs" />
                <div v-else class="log-empty">
                  {{ logContainer ? '暂无日志输出' : '该 Pod 没有可读取日志的容器' }}
                </div>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="事件" name="events">
            <div class="block">
              <easy-title :level="'h4'">事件</easy-title>
              <el-table v-loading="eventsLoading" :data="events" border size="small" empty-text="无事件">
                <el-table-column label="类型" prop="type" width="100" align="center">
                  <template #default="{ row }"><el-tag size="small" :type="row.type === 'Warning' ? 'warning' : 'info'">{{ row.type }}</el-tag></template>
                </el-table-column>
                <el-table-column label="原因" prop="reason" min-width="160" />
                <el-table-column label="消息" prop="message" min-width="300" show-overflow-tooltip />
                <el-table-column label="来源" min-width="180">
                  <template #default="{ row }">{{ row.source_component || '-' }}<span v-if="row.source_host"> / {{ row.source_host }}</span></template>
                </el-table-column>
                <el-table-column label="时间" prop="last_timestamp" width="190" />
              </el-table>
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </div>
    <k8s-terminal ref="terminal" :org-id="orgId" :cluster-id="clusterId" />
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import K8sTerminal from './K8sTerminal'
import K8sContainerList from './components/K8sContainerList'
import { kubernetesClusterPodDetail, kubernetesClusterPodLogs, kubernetesClusterObjectEvents } from '@/api/kubernetes'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'K8sPodDetail',
  components: { Breadcrumb, EasyTitle, K8sTerminal, K8sContainerList },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  },
  data () {
    return {
      loading: false,
      loaded: false,
      error: '',
      pod: { metadata: {}, spec: {}, status: {} },
      activeTab: 'overview',
      logContainer: '',
      tailLines: 200,
      logs: '',
      logsLoading: false,
      eventsLoading: false,
      events: []
    }
  },
  computed: {
    podName () { return this.$route.query.name || '' },
    podNamespace () { return this.$route.query.namespace || '' },
    containers () {
      return (this.pod.spec.containers || []).map(c => c.name)
    },
    labelList () {
      return this.pod.metadata.labels || {}
    },
    containerStatuses () {
      return (this.pod.status.containerStatuses || []).map(cs => {
        const state = cs.state || {}
        const waiting = state.waiting ? { reason: state.waiting.reason, message: state.waiting.message || '' } : null
        const running = state.running ? { startedAt: state.running.startedAt } : null
        const terminated = state.terminated ? { reason: state.terminated.reason } : null
        return {
          name: cs.name,
          image: cs.image,
          ready: !!cs.ready,
          restartCount: cs.restartCount || 0,
          waiting,
          running,
          terminated
        }
      })
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: 'Pods', to: { name: 'ClusterK8sPods', params: { clusterId: this.clusterId } } },
        { title: this.podName, to: '' }
      ]
    }
  },
  created () {
    if (this.$route.query.tab === 'logs') {
      this.activeTab = 'logs'
    }
    this.load()
  },
  methods: {
    load () {
      this.loading = true
      this.error = ''
      kubernetesClusterPodDetail(this.orgId, this.clusterId, this.podNamespace, this.podName).then(res => {
        this.pod = res.data.pod || { metadata: {}, spec: {}, status: {} }
        this.loaded = true
        if (this.containers.length) {
          this.logContainer = this.containers[0]
          if (this.activeTab === 'logs') this.$nextTick(this.loadLogs)
        }
      }).catch(err => {
        this.error = err.response?.data?.msg || err.message || '无法加载 Pod'
      }).finally(() => { this.loading = false })
    },
    loadLogs () {
      if (!this.logContainer) return
      this.logsLoading = true
      kubernetesClusterPodLogs(this.orgId, this.clusterId, this.podNamespace, this.podName, {
        container: this.logContainer,
        tail_lines: this.tailLines
      }).then(res => {
        this.logs = res.data.logs || ''
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '加载日志失败')
      }).finally(() => { this.logsLoading = false })
    },
    goBack () {
      this.$router.push({ name: 'ClusterK8sPods', params: { clusterId: this.clusterId } })
    },
    openTerminal () {
      if (!this.containers.length) return
      this.$refs.terminal.open({
        namespace: this.podNamespace,
        name: this.podName,
        containers: this.containers
      })
    },
    openContainerLogs (containerName) {
      this.logContainer = containerName
      this.activeTab = 'logs'
      this.loadLogs()
    },
    openContainerTerminal (containerName) {
      this.$refs.terminal.open({
        namespace: this.podNamespace,
        name: this.podName,
        containers: [containerName]
      })
    },
    onTabClick (tab) {
      if (tab.name === 'logs' && !this.logs) this.loadLogs()
      if (tab.name === 'events' && !this.events.length) this.loadEvents()
    },
    loadEvents () {
      this.eventsLoading = true
      kubernetesClusterObjectEvents(this.orgId, this.clusterId, 'Pod', this.podName).then(res => {
        this.events = res.data.events || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '加载事件失败')
      }).finally(() => { this.eventsLoading = false })
    }
  }
}
</script>

<style lang="scss" scoped>
.heading { display: flex; align-items: center; justify-content: space-between; }
.heading-actions { display: flex; align-items: center; gap: 10px; }
.section { margin-top: 16px; }
.block { margin-top: 16px; }
.log-panel { margin-top: 16px; overflow: hidden; border: 1px solid #e4e7ed; border-radius: 6px; background: #fff; }
.log-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; border-bottom: 1px solid #ebeef5; }
.log-title { color: #303133; font-size: 15px; font-weight: 600; }
.log-context { margin-top: 4px; color: #909399; font-size: 12px; }
.log-summary { flex: 0 0 auto; color: #909399; font-size: 12px; }
.log-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 16px; background: #f7f8fa; }
.log-filter-form { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 18px; min-width: 0; }
.log-filter-form ::v-deep .el-form-item { display: flex; align-items: center; margin: 0; }
.log-filter-form ::v-deep .el-form-item__label { flex: 0 0 auto; padding-right: 8px; color: #606266; line-height: 32px; }
.log-filter-form ::v-deep .el-form-item__content { flex: 0 0 auto; line-height: 32px; }
.log-container { width: 220px; }
.log-body { min-height: 360px; max-height: 620px; overflow: auto; background: #1e1e1e; }
.log-pre { min-height: 360px; margin: 0; padding: 16px; color: #d4d4d4; font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; font-size: 12px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 4; }
.log-empty { display: flex; align-items: center; justify-content: center; min-height: 360px; padding: 24px; color: #909399; font-size: 13px; }
.label-tag { margin: 0 6px 6px 0; }
.cell-sub { color: #909399; }
.text-success { color: #67c23a; }
@media (max-width: 1100px) {
  .log-toolbar { align-items: flex-start; flex-direction: column; }
  .log-filter-form { align-items: flex-start; flex-direction: column; width: 100%; }
  .log-filter-form ::v-deep .el-form-item { width: 100%; }
}
</style>
