<template>
  <resource-list
    ref="list"
    title="Kubernetes 持久卷声明 (PVC)"
    resource-name="PVC"
    :columns="columns"
    :loader="loadRows"
    :org-id="orgId"
    :cluster-id="clusterId"
    :cluster="cluster">
    <template #name="{ row }">
      <el-link type="primary" :underline="false" @click="openDetail(row)"><strong>{{ row.name }}</strong></el-link>
      <div class="secondary">{{ row.namespace }}</div>
    </template>
    <template #capacity="{ row }">{{ formatK8sMemory(row.capacity) }}</template>
    <template #modes="{ row }">
      <el-tag v-for="m in row.access_modes" :key="m" size="small" type="info" class="tag">{{ m }}</el-tag>
      <span v-if="!row.access_modes.length">-</span>
    </template>
    <template #status="{ row }">
      <el-tag size="small" :type="row.phase === 'Bound' ? 'success' : 'warning'">{{ row.phase || '-' }}</el-tag>
    </template>
    <template #actions="{ row }">
      <el-button type="text" size="small" icon="el-icon-document" @click="openDetail(row)">详情</el-button>
      <el-popconfirm title="确定删除该 PVC？" @confirm="remove(row)">
        <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
      </el-popconfirm>
    </template>
  </resource-list>
</template>

<script>
import ResourceList from './components/ResourceList'
import { formatK8sMemory } from '@/utils/filters'
import { kubernetesClusterPersistentVolumeClaims, kubernetesClusterPersistentVolumeClaimDetail, kubernetesClusterPersistentVolumeClaimDelete } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sPersistentVolumeClaims',
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
        { key: 'sc', label: 'StorageClass', prop: 'storage_class_name', minWidth: 160 },
        { key: 'volume', label: 'PV', prop: 'volume_name', minWidth: 160 },
        { key: 'status', label: '状态', slot: 'status', width: 110, align: 'center' },
        { key: 'created', label: '创建时间', prop: 'created_at', width: 190 },
        { key: 'actions', label: '操作', slot: 'actions', width: 160, align: 'center' }
      ]
    }
  },
  methods: {
    loadRows (orgId, clusterId, namespace) {
      return kubernetesClusterPersistentVolumeClaims(orgId, clusterId, namespace).then(res => res.data.persistentVolumeClaims || [])
    },
    openDetail (row) {
      this.$router.push({ name: 'ClusterK8sPersistentVolumeClaimDetail', params: { clusterId: this.clusterId }, query: { namespace: row.namespace, name: row.name } })
    },
    remove (row) {
      kubernetesClusterPersistentVolumeClaimDelete(this.orgId, this.clusterId, row.namespace, row.name).then(() => {
        this.$message.success('PVC 已删除')
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
.secondary { margin-top: 4px; color: #909399; font-size: 12px; }
.tag { margin: 0 4px 4px 0; }
.text-danger { color: #f56c6c; }
</style>
