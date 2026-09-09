<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <div class="project-main">
      <div class="heading">
        <easy-title title="Kubernetes 节点" margin-set="0" />
        <div class="actions">
          <el-input
            v-model="keyword"
            size="small"
            clearable
            class="search"
            placeholder="搜索节点名称 / 角色 / IP"
            prefix-icon="el-icon-search" />
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>
      <el-table v-loading="loading" :data="displayRows" fit class="table">
        <el-table-column label="节点" min-width="210">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openDetail(row)"><strong>{{ row.name }}</strong></el-link>
            <div class="secondary">{{ row.addresses | addresses }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }"><el-tag size="small" :type="row.ready ? 'success' : 'danger'">{{ row.ready ? 'Ready' : 'NotReady' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="角色" min-width="145"><template #default="{ row }">{{ (row.roles || []).join(', ') }}</template></el-table-column>
        <el-table-column label="Kubelet" min-width="150" prop="kubelet_version" />
        <el-table-column label="容器运行时" min-width="190" show-overflow-tooltip prop="container_runtime" />
        <el-table-column label="CPU 使用率" min-width="200">
          <template #default="{ row }">
            <usage-bar
              :value="usage(row).cpu ? usage(row).cpu.percent : null"
              :used-text="usage(row).cpu ? usage(row).cpu.usedText : ''"
              :all-text="usage(row).cpu ? usage(row).cpu.allText : ''" />
          </template>
        </el-table-column>
        <el-table-column label="内存 使用率" min-width="200">
          <template #default="{ row }">
            <usage-bar
              :value="usage(row).memory ? usage(row).memory.percent : null"
              :used-text="usage(row).memory ? usage(row).memory.usedText : ''"
              :all-text="usage(row).memory ? usage(row).memory.allText : ''" />
          </template>
        </el-table-column>
        <el-table-column label="Pods 使用率" min-width="200">
          <template #default="{ row }">
            <usage-bar
              :value="usage(row).pods ? usage(row).pods.percent : null"
              :used-text="usage(row).pods ? usage(row).pods.usedText : ''"
              :all-text="usage(row).pods ? usage(row).pods.allText : ''" />
          </template>
        </el-table-column>
        <el-table-column label="系统" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ row.os_image || '-' }} / {{ row.architecture || '-' }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import UsageBar from './components/UsageBar'
import { routeBreadcrumb } from '@/utils/helpers'
import { formatK8sCpu, formatK8sMemory, parseK8sCpuToCores, parseK8sMemoryToKi } from '@/utils/filters'
import { kubernetesClusterNodes } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sNodes',
  components: { Breadcrumb, EasyTitle, UsageBar },
  filters: {
    addresses (rows) {
      return (rows || []).filter(item => item.type === 'InternalIP').map(item => item.address).join(', ') || '-'
    }
  },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () { return { loading: false, rows: [], keyword: '' } },
  computed: {
    breadcrumb () { return [...routeBreadcrumb(this), { title: '节点', to: '' }] },
    displayRows () {
      const kw = this.keyword.trim().toLowerCase()
      if (!kw) return this.rows
      return this.rows.filter(row => this.matchKeyword(row, kw))
    }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      kubernetesClusterNodes(this.orgId, this.clusterId).then(res => {
        this.rows = res.data.nodes || []
      }).finally(() => { this.loading = false })
    },
    matchKeyword (row, kw) {
      return JSON.stringify(row).toLowerCase().includes(kw)
    },
    openDetail (row) {
      this.$router.push({ name: 'ClusterK8sNodeDetail', params: { clusterId: this.clusterId }, query: { name: row.name } })
    },
    openDetail (row) {
      this.$router.push({ name: 'ClusterK8sNodeDetail', params: { clusterId: this.clusterId }, query: { name: row.name } })
    },
    usage (row) {
      const noUsage = { cpu: null, memory: null, pods: null }
      if (!row.usage || (!row.usage.cpu && !row.usage.memory)) return noUsage
      const result = {}
      const cpuUsed = parseK8sCpuToCores(row.usage.cpu)
      const cpuAll = parseK8sCpuToCores((row.allocatable || {}).cpu)
      if (cpuAll > 0) {
        result.cpu = {
          percent: (cpuUsed / cpuAll) * 100,
          usedText: formatK8sCpu(row.usage.cpu),
          allText: formatK8sCpu((row.allocatable || {}).cpu)
        }
      }
      const memUsed = parseK8sMemoryToKi(row.usage.memory)
      const memAll = parseK8sMemoryToKi((row.allocatable || {}).memory)
      if (memAll > 0) {
        result.memory = {
          percent: (memUsed / memAll) * 100,
          usedText: formatK8sMemory(row.usage.memory),
          allText: formatK8sMemory((row.allocatable || {}).memory)
        }
      }
      const podsAll = parseInt((row.allocatable || {}).pods, 10)
      if (podsAll > 0 && row.pod_count !== null && row.pod_count !== undefined) {
        result.pods = {
          percent: (row.pod_count / podsAll) * 100,
          usedText: String(row.pod_count),
          allText: String(podsAll)
        }
      }
      return { ...noUsage, ...result }
    },
    formatK8sCpu,
    formatK8sMemory
  }
}
</script>

<style lang="scss" scoped>
.heading { display: flex; align-items: center; justify-content: space-between; }
.actions { display: flex; align-items: center; gap: 10px; }
.actions .search { width: 240px; }
.table { margin-top: 18px; }
.secondary { margin-top: 4px; color: #909399; font-size: 12px; }
</style>
