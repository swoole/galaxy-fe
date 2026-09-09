<template>
  <resource-list
    ref="list"
    title="Kubernetes Ingresses"
    resource-name="Ingresses"
    :columns="columns"
    :loader="loadRows"
    :org-id="orgId"
    :cluster-id="clusterId"
    :cluster="cluster">
    <template #toolbar>
      <el-button size="small" type="primary" icon="el-icon-plus" @click="openCreate">新增 Ingress</el-button>
    </template>
    <template #name="{ row }">
      <strong>{{ row.name }}</strong>
      <div class="secondary">{{ row.namespace }}</div>
    </template>
    <template #hosts="{ row }">
      <span v-if="row.hosts">{{ row.hosts }}</span>
      <span v-else class="cell-sub">-</span>
    </template>
    <template #tls="{ row }">
      <el-tag v-if="row.tls_enabled" size="small" type="success">HTTPS</el-tag>
      <span v-else class="cell-sub">HTTP</span>
    </template>
    <template #actions="{ row }">
      <el-button type="text" size="small" icon="el-icon-edit" @click="openEdit(row)">编辑</el-button>
      <el-popconfirm title="确定删除该 Ingress？" @confirm="remove(row)">
        <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
      </el-popconfirm>
    </template>
  </resource-list>
</template>

<script>
import ResourceList from './components/ResourceList'
import { kubernetesClusterIngresses, kubernetesClusterIngressDelete } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sIngresses',
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
        { key: 'hosts', label: 'Host', slot: 'hosts', minWidth: 240 },
        { key: 'tls', label: '协议', slot: 'tls', width: 100, align: 'center' },
        { key: 'created', label: '创建时间', prop: 'created_at', width: 190 },
        { key: 'actions', label: '操作', slot: 'actions', width: 160, align: 'center' }
      ]
    }
  },
  methods: {
    loadRows (orgId, clusterId, namespace) {
      return kubernetesClusterIngresses(orgId, clusterId, namespace).then(res => res.data.ingresses || [])
    },
    openCreate () {
      this.$router.push({ name: 'ClusterK8sIngressCreate', params: { clusterId: this.clusterId } })
    },
    openEdit (row) {
      this.$router.push({ name: 'ClusterK8sIngressEdit', params: { clusterId: this.clusterId }, query: { namespace: row.namespace, name: row.name } })
    },
    remove (row) {
      kubernetesClusterIngressDelete(this.orgId, this.clusterId, row.namespace, row.name).then(() => {
        this.$message.success('Ingress 已删除')
        this.$refs.list && this.$refs.list.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '删除失败')
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.secondary { margin-top: 4px; color: #909399; font-size: 12px; }
.cell-sub { color: #909399; }
.text-danger { color: #f56c6c; }
</style>
