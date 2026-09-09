<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <div class="project-main">
      <div class="heading">
        <easy-title :title="title" margin-set="0" />
        <div class="actions">
          <el-input
            v-model="keyword"
            size="small"
            clearable
            class="search"
            placeholder="搜索名称 / 命名空间"
            prefix-icon="el-icon-search" />
          <namespace-selector
            v-if="namespaced"
            v-model="nsFilter"
            :namespaces="namespaces"
            @change="handleNamespaceChange" />
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
          <slot name="toolbar" />
        </div>
      </div>
      <el-table
        v-loading="loading"
        :data="displayRows"
        fit
        class="table"
        :row-class-name="rowClassName"
        :empty-text="keyword ? '无匹配结果' : `暂无 ${resourceName}`">
        <el-table-column
          v-for="column in columns"
          :key="column.key"
          :label="column.label"
          :prop="column.prop"
          :width="column.width"
          :min-width="column.minWidth"
          :align="column.align"
          :show-overflow-tooltip="column.tooltip">
          <template #default="scope">
            <slot v-if="column.slot" :name="column.slot" v-bind="scope" />
            <span v-else>{{ value(scope.row, column) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import NamespaceSelector from './NamespaceSelector'
import { kubernetesClusterNamespaces } from '@/api/kubernetes'
import { routeBreadcrumb } from '@/utils/helpers'
import { formatK8sDate } from '@/utils/filters'
import { Storage } from '@/utils/storage'
import {
  isSystemNamespace, DEFAULT_NAMESPACE_FILTER,
  namespaceParamFromFilter, rowMatchesNamespaceFilter
} from '@/utils/k8sNamespace'

export default {
  name: 'KubernetesResourceList',
  components: { Breadcrumb, EasyTitle, NamespaceSelector },
  props: {
    title: { type: String, required: true },
    resourceName: { type: String, required: true },
    columns: { type: Array, required: true },
    loader: { type: Function, required: true },
    namespaced: { type: Boolean, default: true },
    namespaceMemoryKey: { type: String, default: '' },
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    const routeNamespace = String(this.$route.query.namespace || '')
    const rememberedFilter = this.namespaceMemoryKey
      ? Storage.get(this.namespacePreferenceKey())
      : null
    return {
      loading: false,
      rows: [],
      keyword: '',
      // 默认只展示 User Namespaces（除非用户手动切换）
      nsFilter: routeNamespace
        ? 'ns:' + routeNamespace
        : rememberedFilter || DEFAULT_NAMESPACE_FILTER,
      targetWorkload: String(this.$route.query.workload || ''),
      namespaces: []
    }
  },
  computed: {
    breadcrumb () { return [...routeBreadcrumb(this), { title: this.resourceName, to: '' }] },
    // 系统命名空间集合，用于 "Only User / Only System Namespaces" 过滤
    systemSet () {
      const set = new Set()
      for (const ns of (this.namespaces || [])) {
        if (isSystemNamespace(ns.name, ns.annotations, ns.labels)) {
          set.add(ns.name)
        }
      }
      return set
    },
    displayRows () {
      let rows = this.rows
      if (this.namespaced && this.nsFilter && this.nsFilter !== 'all') {
        rows = rows.filter(row => rowMatchesNamespaceFilter(row, this.nsFilter, this.systemSet))
      }
      const kw = this.keyword.trim().toLowerCase()
      if (kw) rows = rows.filter(row => this.matchKeyword(row, kw))
      return rows
    }
  },
  created () {
    this.rememberNamespaceFilter()
    if (this.namespaced) {
      kubernetesClusterNamespaces(this.orgId, this.clusterId).then(res => {
        this.namespaces = res.data.namespaces || []
      })
    }
    this.load()
  },
  methods: {
    namespacePreferenceKey () {
      const user = this.$store.getters.user || {}
      return `k8s-namespace-filter:${user.id || 0}:${this.orgId}:${this.clusterId}:${this.namespaceMemoryKey}`
    },
    rememberNamespaceFilter () {
      if (this.namespaced && this.namespaceMemoryKey && this.nsFilter) {
        Storage.set(this.namespacePreferenceKey(), this.nsFilter)
      }
    },
    handleNamespaceChange () {
      this.rememberNamespaceFilter()
      return this.load()
    },
    load () {
      this.loading = true
      const nsParam = namespaceParamFromFilter(this.nsFilter)
      return this.loader(this.orgId, this.clusterId, nsParam).then(rows => {
        this.rows = rows || []
      }).finally(() => { this.loading = false })
    },
    value (row, column) {
      const result = typeof column.formatter === 'function' ? column.formatter(row) : row[column.prop]
      if (result === undefined || result === null || result === '') return '-'
      if (typeof result === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result)) {
        return formatK8sDate(result)
      }
      return result
    },
    matchKeyword (row, kw) {
      return JSON.stringify(row).toLowerCase().includes(kw)
    },
    rowClassName ({ row }) {
      return this.targetWorkload && row.name === this.targetWorkload ? 'target-workload-row' : ''
    }
  }
}
</script>

<style lang="scss" scoped>
.heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.actions { display: flex; align-items: center; gap: 10px; }
.actions .el-select { width: 210px; }
.actions .search { width: 220px; }
.table { margin-top: 18px; }
::v-deep .target-workload-row > td { background: #ecf5ff !important; }
</style>
