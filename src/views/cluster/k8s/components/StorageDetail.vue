<template>
  <div class="project-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <div class="project-main">
      <div class="heading">
        <easy-title :title="title + ' 详情'" margin-set="0" />
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
      </div>
      <el-alert v-if="error" class="section" type="error" :closable="false" show-icon :title="error" />
      <template v-if="loaded">
        <div class="block section">
          <easy-title :level="'h4'">基本信息</easy-title>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item v-for="row in infoRows" :key="row.label" :label="row.label">{{ row.value }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div v-if="kind === 'pv' && sourceText" class="block section">
          <easy-title :level="'h4'">卷来源</easy-title>
          <pre class="source">{{ sourceText }}</pre>
        </div>
        <div v-if="kind === 'storageclass' && parameters" class="block section">
          <easy-title :level="'h4'">参数</easy-title>
          <div v-for="(v, k) in parameters" :key="k" class="param">{{ k }}={{ v }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import { routeBreadcrumb } from '@/utils/helpers'
import { formatK8sDate, formatK8sMemory } from '@/utils/filters'
import {
  kubernetesClusterPersistentVolumeDetail, kubernetesClusterPersistentVolumeClaimDetail, kubernetesClusterStorageClassDetail
} from '@/api/kubernetes'

const API = {
  pv: kubernetesClusterPersistentVolumeDetail,
  pvc: kubernetesClusterPersistentVolumeClaimDetail,
  storageclass: kubernetesClusterStorageClassDetail
}
const LIST = { pv: 'ClusterK8sPersistentVolumes', pvc: 'ClusterK8sPersistentVolumeClaims', storageclass: 'ClusterK8sStorageClasses' }
const LABEL = { pv: '持久卷', pvc: 'PVC', storageclass: 'StorageClass' }

export default {
  name: 'KubernetesStorageDetail',
  components: { Breadcrumb, EasyTitle },
  props: {
    kind: { type: String, required: true },
    title: { type: String, required: true },
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return { loading: false, loaded: false, error: '', detail: {} }
  },
  computed: {
    breadcrumb () {
      return [...routeBreadcrumb(this), { title: LABEL[this.kind] + 's', to: { name: LIST[this.kind], params: { clusterId: this.clusterId } } }, { title: '详情', to: '' }]
    },
    spec () { return this.detail.spec || {} },
    status () { return this.detail.status || {} },
    parameters () { return this.spec.parameters || null },
    sourceText () {
      const ignore = ['capacity', 'accessModes', 'persistentVolumeReclaimPolicy', 'storageClassName', 'claimRef', 'mountOptions', 'volumeMode', 'nodeAffinity', 'message', 'storage', 'resources', 'selector']
      const keys = Object.keys(this.spec).filter(k => !ignore.includes(k))
      return keys.map(k => `${k}: ${JSON.stringify(this.spec[k])}`).join('\n')
    },
    infoRows () {
      if (this.kind === 'pv') {
        const claim = this.spec.claimRef || {}
        return [
          { label: '名称', value: this.meta('name') },
          { label: '创建时间', value: this.formatK8sDate(this.meta('creationTimestamp')) },
          { label: '容量', value: this.formatK8sMemory(this.spec.capacity && this.spec.capacity.storage) },
          { label: '访问模式', value: (this.spec.accessModes || []).join(', ') || '-' },
          { label: '回收策略', value: this.spec.persistentVolumeReclaimPolicy || '-' },
          { label: '状态', value: this.status.phase || '-' },
          { label: 'StorageClass', value: this.spec.storageClassName || '-' },
          { label: '绑定', value: claim.name ? `${claim.name} (${claim.namespace})` : '未绑定' }
        ]
      }
      if (this.kind === 'pvc') {
        const cap = (this.status.capacity && this.status.capacity.storage) || (this.spec.resources && this.spec.resources.requests && this.spec.resources.requests.storage) || ''
        return [
          { label: '名称', value: this.meta('name') },
          { label: '命名空间', value: this.meta('namespace') },
          { label: '创建时间', value: this.formatK8sDate(this.meta('creationTimestamp')) },
          { label: '容量', value: this.formatK8sMemory(cap) },
          { label: '访问模式', value: (this.spec.accessModes || []).join(', ') || '-' },
          { label: 'StorageClass', value: this.spec.storageClassName || '-' },
          { label: '绑定 PV', value: this.spec.volumeName || '-' },
          { label: '状态', value: this.status.phase || '-' }
        ]
      }
      return [
        { label: '名称', value: this.meta('name') },
        { label: '创建时间', value: this.formatK8sDate(this.meta('creationTimestamp')) },
        { label: '供应者', value: this.spec.provisioner || '-' },
        { label: '回收策略', value: this.spec.reclaimPolicy || '-' },
        { label: '绑定模式', value: this.spec.volumeBindingMode || '-' },
        { label: '允许扩容', value: this.spec.allowVolumeExpansion ? '是' : '否' }
      ]
    }
  },
  created () { this.load() },
  methods: {
    load () {
      const namespace = this.$route.query.namespace || ''
      const name = this.$route.query.name || ''
      if (!name) { this.error = '缺少资源名称'; return }
      this.loading = true
      this.error = ''
      API[this.kind](this.orgId, this.clusterId, namespace, name).then(res => {
        this.detail = (this.kind === 'pv' ? res.data.persistentVolume : this.kind === 'pvc' ? res.data.persistentVolumeClaim : res.data.storageClass) || {}
        this.loaded = true
      }).catch(err => {
        this.error = err.response?.data?.msg || err.response?.data?.message || '获取详情失败'
      }).finally(() => { this.loading = false })
    },
    meta (key) { return (this.detail.metadata && this.detail.metadata[key] != null) ? this.detail.metadata[key] : '-' },
    formatK8sDate
  }
}
</script>

<style lang="scss" scoped>
.heading { display: flex; align-items: center; justify-content: space-between; }
.section { margin-top: 18px; }
.block { margin-top: 18px; }
.source { margin: 0; white-space: pre-wrap; word-break: break-all; font-size: 13px; color: #606266; }
.param { padding: 2px 0; font-size: 13px; color: #606266; }
</style>
