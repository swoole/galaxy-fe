<template>
  <div class="project-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <div class="project-main">
      <div class="heading">
        <easy-title :title="'Service 详情 · ' + (meta('name') || '')" margin-set="0" />
        <div class="heading-actions">
          <el-button size="small" icon="el-icon-edit" @click="openEdit">编辑</el-button>
          <el-popconfirm title="确定删除该 Service？" @confirm="remove">
            <el-button slot="reference" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
          </el-popconfirm>
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>
      <el-alert v-if="error" class="section" type="error" :closable="false" show-icon :title="error" />
      <template v-if="loaded">
        <el-tabs v-model="activeTab" class="section" @tab-click="onTabClick">
          <!-- 概览 -->
          <el-tab-pane label="概览" name="overview">
            <el-row :gutter="16">
              <el-col :xs="24" :lg="12">
                <easy-title :level="'h4'">基本信息</easy-title>
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item label="命名空间">{{ meta('namespace') }}</el-descriptions-item>
                  <el-descriptions-item label="类型">{{ specVal('type') || 'ClusterIP' }}</el-descriptions-item>
                  <el-descriptions-item label="ClusterIP">{{ specVal('clusterIP') || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="外部 IP">{{ externalIpsText }}</el-descriptions-item>
                  <el-descriptions-item label="会话亲和性">{{ specVal('sessionAffinity') || 'None' }}</el-descriptions-item>
                  <el-descriptions-item label="创建时间">{{ formatK8sDate(meta('creationTimestamp')) }}</el-descriptions-item>
                </el-descriptions>
              </el-col>
              <el-col :xs="24" :lg="12">
                <easy-title :level="'h4'">选择器</easy-title>
                <div v-if="selectorLabels.length" class="tag-wrap">
                  <el-tag v-for="(v, k) in selectorLabelsObj" :key="k" size="small" type="info" class="label-tag">{{ k }}={{ v }}</el-tag>
                </div>
                <span v-else class="cell-sub">无选择器（手动端点）</span>
              </el-col>
            </el-row>
            <div class="block">
              <easy-title :level="'h4'">
                端口
                <template #options>共 {{ ports.length }} 个</template>
              </easy-title>
              <el-table :data="ports" border size="small">
                <el-table-column label="名称" min-width="160">
                  <template #default="{ row }">{{ row.name || '-' }}</template>
                </el-table-column>
                <el-table-column label="协议" prop="protocol" width="100" align="center" />
                <el-table-column label="端口" prop="port" width="100" align="center" />
                <el-table-column label="目标端口" min-width="120">
                  <template #default="{ row }">{{ row.target_port != null && row.target_port !== '' ? row.target_port : '-' }}</template>
                </el-table-column>
                <el-table-column label="NodePort" width="120" align="center">
                  <template #default="{ row }">{{ row.node_port ? row.node_port : '-' }}</template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <!-- Pods -->
          <el-tab-pane label="Pods" name="pods">
            <el-table v-loading="podsLoading" :data="matchedPods" border size="small" empty-text="未找到匹配的 Pod">
              <el-table-column label="名称" min-width="280">
                <template #default="{ row }">
                  <router-link
                    :to="{ name: 'ClusterK8sPodDetail', params: { clusterId: clusterId }, query: { namespace: row.namespace, name: row.name } }"
                    class="link-name">{{ row.name }}</router-link>
                </template>
              </el-table-column>
              <el-table-column label="命名空间" prop="namespace" min-width="160" />
              <el-table-column label="状态" width="120" align="center">
                <template #default="{ row }"><el-tag size="small" :type="podPhaseType(row.phase)">{{ row.phase }}</el-tag></template>
              </el-table-column>
              <el-table-column label="就绪" width="90" align="center">
                <template #default="{ row }">{{ row.ready }}/{{ row.containers }}</template>
              </el-table-column>
              <el-table-column label="重启" prop="restarts" width="90" align="center" />
              <el-table-column label="节点" prop="node_name" min-width="180" />
              <el-table-column label="创建时间" prop="created_at" width="190" />
            </el-table>
          </el-tab-pane>

          <!-- 事件 -->
          <el-tab-pane label="事件" name="events">
            <easy-title :level="'h4'">
              事件
              <template #options>共 {{ events.length }} 条</template>
            </easy-title>
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
          </el-tab-pane>

          <!-- YAML -->
          <el-tab-pane label="YAML" name="yaml">
            <easy-title :level="'h4'">
              资源清单
              <template #options><el-button size="small" icon="el-icon-document-copy" @click="copyYaml">复制</el-button></template>
            </easy-title>
            <pre class="yaml-pre">{{ yaml }}</pre>
          </el-tab-pane>
        </el-tabs>
      </template>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import yaml from 'js-yaml'
import { routeBreadcrumb } from '@/utils/helpers'
import { formatK8sDate } from '@/utils/filters'
import {
  kubernetesClusterServiceDetail,
  kubernetesClusterServiceDelete,
  kubernetesClusterPods,
  kubernetesClusterObjectEvents
} from '@/api/kubernetes'

export default {
  name: 'ClusterK8sServiceDetail',
  components: { Breadcrumb, EasyTitle },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      loading: false,
      loaded: false,
      error: '',
      service: {},
      activeTab: 'overview',
      podsLoading: false,
      pods: [],
      eventsLoading: false,
      events: []
    }
  },
  computed: {
    namespace () { return this.$route.query.namespace || '' },
    serviceName () { return this.$route.query.name || '' },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: 'Services', to: { name: 'ClusterK8sServices', params: { clusterId: this.clusterId } } },
        { title: this.serviceName, to: '' }
      ]
    },
    metadata () { return this.service.metadata || {} },
    spec () { return this.service.spec || {} },
    selectorLabelsObj () { return this.spec.selector || {} },
    selectorLabels () { return Object.keys(this.selectorLabelsObj) },
    ports () {
      return (this.spec.ports || []).map(p => ({
        name: p.name || '',
        protocol: p.protocol || 'TCP',
        port: p.port || 0,
        target_port: (p.targetPort != null ? p.targetPort : ''),
        node_port: p.nodePort || 0
      }))
    },
    externalIpsText () {
      const ext = this.spec.externalIPs || []
      return ext.length ? ext.join(', ') : '-'
    },
    yaml () {
      try {
        return yaml.dump(this.service, { noRefs: true, skipInvalid: true })
      } catch (e) {
        return String(e)
      }
    },
    matchedPods () {
      if (!this.pods.length) return []
      if (!this.selectorLabels.length) return this.pods
      return this.pods.filter(pod => {
        const labels = pod.labels || {}
        return this.selectorLabels.every(key => labels[key] === this.selectorLabelsObj[key])
      })
    }
  },
  created () { this.load() },
  methods: {
    load () {
      if (!this.serviceName) { this.error = '缺少 Service 名称'; return }
      this.loading = true
      this.error = ''
      kubernetesClusterServiceDetail(this.orgId, this.clusterId, this.namespace, this.serviceName).then(res => {
        this.service = res.data.service || {}
        this.loaded = true
      }).catch(err => {
        this.error = err.response?.data?.msg || err.response?.data?.message || '获取详情失败'
      }).finally(() => { this.loading = false })
    },
    onTabClick (tab) {
      if (tab.name === 'pods' && !this.pods.length) this.loadPods()
      if (tab.name === 'events' && !this.events.length) this.loadEvents()
    },
    loadPods () {
      this.podsLoading = true
      kubernetesClusterPods(this.orgId, this.clusterId, this.namespace).then(res => {
        this.pods = res.data.pods || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '加载 Pods 失败')
      }).finally(() => { this.podsLoading = false })
    },
    loadEvents () {
      this.eventsLoading = true
      kubernetesClusterObjectEvents(this.orgId, this.clusterId, 'Service', this.serviceName).then(res => {
        this.events = res.data.events || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '加载事件失败')
      }).finally(() => { this.eventsLoading = false })
    },
    meta (key) { return (this.metadata[key] != null) ? this.metadata[key] : '-' },
    specVal (key) { return this.spec[key] != null ? this.spec[key] : '' },
    formatK8sDate,
    podPhaseType (phase) {
      if (phase === 'Running') return 'success'
      if (phase === 'Pending') return 'warning'
      if (phase === 'Failed') return 'danger'
      return 'info'
    },
    copyYaml () {
      this.$copyText ? this.$copyText(this.yaml).then(() => this.$message.success('已复制'))
        : navigator.clipboard?.writeText(this.yaml).then(() => this.$message.success('已复制'))
    },
    openEdit () {
      this.$router.push({ name: 'ClusterK8sServiceEdit', params: { clusterId: this.clusterId }, query: { namespace: this.namespace, name: this.serviceName } })
    },
    remove () {
      kubernetesClusterServiceDelete(this.orgId, this.clusterId, this.namespace, this.serviceName).then(() => {
        this.$message.success('Service 已删除')
        this.$router.push({ name: 'ClusterK8sServices', params: { clusterId: this.clusterId } })
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '删除失败')
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.heading { display: flex; align-items: center; justify-content: space-between; }
.heading-actions { display: flex; align-items: center; gap: 10px; }
.section { margin-top: 16px; }
.block { margin-top: 16px; }
.yaml-pre { margin: 0; padding: 14px; background: #1e1e1e; color: #d4d4d4; border-radius: 4px; max-height: 640px; overflow: auto; font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
.label-tag { margin: 0 6px 6px 0; }
.link-name { color: #409eff; &:hover { text-decoration: underline; } }
.cell-sub { color: #909399; }
.text-danger { color: #f56c6c; }
</style>
