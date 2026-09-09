<template>
  <resource-list
    ref="list"
    title="Kubernetes 持久卷 (PV)"
    resource-name="持久卷"
    :columns="columns"
    :loader="loadRows"
    :namespaced="false"
    :org-id="orgId"
    :cluster-id="clusterId"
    :cluster="cluster">
    <template #name="{ row }">
      <el-link type="primary" :underline="false" @click="openDetail(row)"><strong>{{ row.name }}</strong></el-link>
    </template>
    <template #capacity="{ row }">{{ formatK8sMemory(row.capacity) }}</template>
    <template #modes="{ row }">
      <el-tag v-for="m in row.access_modes" :key="m" size="small" type="info" class="tag">{{ m }}</el-tag>
      <span v-if="!row.access_modes.length">-</span>
    </template>
    <template #status="{ row }">
      <el-tag size="small" :type="row.status === 'Bound' ? 'success' : 'warning'">{{ row.status || '-' }}</el-tag>
    </template>
    <template #actions="{ row }">
      <el-button type="text" size="small" icon="el-icon-document" @click="openDetail(row)">详情</el-button>
      <el-popconfirm title="确定删除该 PV？" @confirm="remove(row)">
        <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
      </el-popconfirm>
    </template>
  </resource-list>
</template>

<script>
import ResourceList from './components/ResourceList'
import { formatK8sMemory } from '@/utils/filters'
import { kubernetesClusterPersistentVolumes, kubernetesClusterPersistentVolumeDetail, kubernetesClusterPersistentVolumeDelete } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sPersistentVolumes',
  components: { ResourceList },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      columns: [
        { key: 'name', label: '名称', slot: 'name', minWidth: 240 },
        { key: 'capacity', label: '容量', slot: 'capacity', width: 130, align: 'center' },
        { key: 'modes', label: '访问模式', slot: 'modes', minWidth: 200 },
        { key: 'reclaim', label: '回收策略', prop: 'reclaim_policy', width: 130, align: 'center' },
        { key: 'status', label: '状态', slot: 'status', width: 110, align: 'center' },
        { key: 'sc', label: 'StorageClass', prop: 'storage_class_name', minWidth: 160 },
        { key: 'claim', label: '绑定', width: 180, formatter: row => row.claim ? `${row.claim} (${row.claim_namespace})` : '-' },
        { key: 'created', label: '创建时间', prop: 'created_at', width: 190 },
        { key: 'actions', label: '操作', slot: 'actions', width: 160, align: 'center' }
      ]
    }
  },
  methods: {
    loadRows (orgId, clusterId) {
      return kubernetesClusterPersistentVolumes(orgId, clusterId).then(res => res.data.persistentVolumes || [])
    },
    openDetail (row) {
      this.$router.push({ name: 'ClusterK8sPersistentVolumeDetail', params: { clusterId: this.clusterId }, query: { name: row.name } })
    },
    remove (row) {
      kubernetesClusterPersistentVolumeDelete(this.orgId, this.clusterId, row.name).then(() => {
        this.$message.success('PV 已删除')
        this.$refs.list && this.$refs.list.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '删除失败')
      })
    },
    formatK8sMemory
  }
}
</script>

<style lang="scss" scoped>
.tag { margin: 0 4px 4px 0; }
.text-danger { color: #f56c6c; }
</style>
