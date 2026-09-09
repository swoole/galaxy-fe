<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <div class="project-main">
      <div class="heading">
        <easy-title title="Kubernetes 事件 (Events)" margin-set="0" />
        <div class="actions">
          <el-select v-model="typeFilter" size="small" class="type" placeholder="类型">
            <el-option label="全部类型" value="" />
            <el-option label="Normal" value="Normal" />
            <el-option label="Warning" value="Warning" />
          </el-select>
          <el-select
            v-model="namespace"
            clearable
            filterable
            size="small"
            class="ns"
            placeholder="全部 Namespace"
            @change="load">
            <el-option v-for="item in namespaces" :key="item.name" :label="item.name" :value="item.name" />
          </el-select>
          <el-input
            v-model="keyword"
            size="small"
            clearable
            class="search"
            placeholder="搜索原因 / 对象 / 消息"
            prefix-icon="el-icon-search" />
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>
      <el-table v-loading="loading" :data="displayRows" fit class="table">
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 'Warning' ? 'warning' : 'success'">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="原因" prop="reason" width="180" />
        <el-table-column label="对象" min-width="230">
          <template #default="{ row }">
            <strong>{{ row.involved_name }}</strong>
            <div class="secondary">{{ row.involved_kind }}<template v-if="row.involved_namespace"> · {{ row.involved_namespace }}</template></div>
          </template>
        </el-table-column>
        <el-table-column label="消息" prop="message" min-width="320" show-overflow-tooltip />
        <el-table-column label="来源" min-width="180">
          <template #default="{ row }">{{ row.source_component || '-' }}<template v-if="row.source_host"> · {{ row.source_host }}</template></template>
        </el-table-column>
        <el-table-column label="次数" prop="count" width="80" align="center" />
        <el-table-column label="最后时间" prop="last_timestamp" width="190" :formatter="dateFormatter" />
      </el-table>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import { routeBreadcrumb } from '@/utils/helpers'
import { formatK8sDate } from '@/utils/filters'
import { kubernetesClusterEvents, kubernetesClusterNamespaces } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sEvents',
  components: { Breadcrumb, EasyTitle },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      loading: false,
      rows: [],
      namespaces: [],
      namespace: '',
      typeFilter: '',
      keyword: ''
    }
  },
  computed: {
    breadcrumb () { return [...routeBreadcrumb(this), { title: '事件', to: '' }] },
    displayRows () {
      const kw = this.keyword.trim().toLowerCase()
      return this.rows.filter(row => {
        if (this.typeFilter && row.type !== this.typeFilter) return false
        if (kw && !JSON.stringify(row).toLowerCase().includes(kw)) return false
        return true
      })
    }
  },
  created () {
    kubernetesClusterNamespaces(this.orgId, this.clusterId).then(res => {
      this.namespaces = res.data.namespaces || []
    })
    this.load()
  },
  methods: {
    load () {
      this.loading = true
      kubernetesClusterEvents(this.orgId, this.clusterId, this.namespace).then(res => {
        this.rows = res.data.events || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '获取事件失败')
      }).finally(() => { this.loading = false })
    },
    dateFormatter (row, column, value) {
      return value ? formatK8sDate(value) : '-'
    }
  }
}
</script>

<style lang="scss" scoped>
.heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.actions { display: flex; align-items: center; gap: 10px; }
.actions .type { width: 130px; }
.actions .ns { width: 190px; }
.actions .search { width: 240px; }
.table { margin-top: 18px; }
.secondary { margin-top: 4px; color: #909399; font-size: 12px; }
</style>
