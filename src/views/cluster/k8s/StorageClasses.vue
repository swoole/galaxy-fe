<template>
  <resource-list
    ref="list"
    title="Kubernetes StorageClass"
    resource-name="StorageClass"
    :columns="columns"
    :loader="loadRows"
    :namespaced="false"
    :org-id="orgId"
    :cluster-id="clusterId"
    :cluster="cluster">
    <template #name="{ row }">
      <el-link type="primary" :underline="false" @click="openDetail(row)"><strong>{{ row.name }}</strong></el-link>
      <el-tag v-if="row.is_default" size="small" type="success" class="ml">默认</el-tag>
    </template>
    <template #actions="{ row }">
      <el-button type="text" size="small" icon="el-icon-document" @click="openDetail(row)">详情</el-button>
      <el-popconfirm title="确定删除该 StorageClass？" @confirm="remove(row)">
        <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
      </el-popconfirm>
    </template>
  </resource-list>
</template>

<script>
import ResourceList from './components/ResourceList'
import { kubernetesClusterStorageClasses, kubernetesClusterStorageClassDetail, kubernetesClusterStorageClassDelete } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sStorageClasses',
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
        { key: 'provisioner', label: '供应者', prop: 'provisioner', minWidth: 260 },
        { key: 'reclaim', label: '回收策略', prop: 'reclaim_policy', width: 130, align: 'center' },
        { key: 'binding', label: '绑定模式', prop: 'binding_mode', width: 180 },
        { key: 'created', label: '创建时间', prop: 'created_at', width: 190 },
        { key: 'actions', label: '操作', slot: 'actions', width: 160, align: 'center' }
      ]
    }
  },
  methods: {
    loadRows (orgId, clusterId) {
      return kubernetesClusterStorageClasses(orgId, clusterId).then(res => res.data.storageClasses || [])
    },
    openDetail (row) {
      this.$router.push({ name: 'ClusterK8sStorageClassDetail', params: { clusterId: this.clusterId }, query: { name: row.name } })
    },
    remove (row) {
      kubernetesClusterStorageClassDelete(this.orgId, this.clusterId, row.name).then(() => {
        this.$message.success('StorageClass 已删除')
        this.$refs.list && this.$refs.list.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '删除失败')
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.ml { margin-left: 8px; }
.text-danger { color: #f56c6c; }
</style>
