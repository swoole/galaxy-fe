<template>
  <resource-list
    ref="list"
    title="Kubernetes Services"
    resource-name="Services"
    :columns="columns"
    :loader="loadRows"
    :org-id="orgId"
    :cluster-id="clusterId"
    :cluster="cluster">
    <template #toolbar>
      <el-button size="small" type="primary" icon="el-icon-plus" @click="openCreate">新增 Service</el-button>
    </template>
    <template #name="{ row }">
      <router-link :to="{ name: 'ClusterK8sServiceDetail', params: { clusterId }, query: { namespace: row.namespace, name: row.name } }" class="link-name">
        <strong>{{ row.name }}</strong>
      </router-link>
      <div class="secondary">{{ row.namespace }}</div>
    </template>
    <template #type="{ row }"><el-tag size="small">{{ row.type }}</el-tag></template>
    <template #ports="{ row }">
      <span v-for="(port, index) in row.ports" :key="`${port.port}-${port.protocol}`">
        <span v-if="index">, </span>{{ port.port }}→{{ port.target_port }}/{{ port.protocol }}
        <template v-if="port.node_port"> · NodePort {{ port.node_port }}</template>
      </span>
      <span v-if="!row.ports.length">-</span>
    </template>
    <template #actions="{ row }">
      <el-button type="text" size="small" icon="el-icon-edit" @click="openEdit(row)">编辑</el-button>
      <el-popconfirm title="确定删除该 Service？" @confirm="remove(row)">
        <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
      </el-popconfirm>
    </template>
  </resource-list>
</template>

<script>
import ResourceList from './components/ResourceList'
import { kubernetesClusterServices, kubernetesClusterServiceDelete } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sServices',
  components: { ResourceList },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      columns: [
        { key: 'name', label: 'Service', slot: 'name', minWidth: 250 },
        { key: 'type', label: '类型', slot: 'type', width: 120, align: 'center' },
        { key: 'ip', label: 'Cluster IP', prop: 'cluster_ip', minWidth: 160 },
        { key: 'ports', label: '端口', slot: 'ports', minWidth: 280 },
        { key: 'created', label: '创建时间', prop: 'created_at', width: 190 },
        { key: 'actions', label: '操作', slot: 'actions', width: 160, align: 'center' }
      ]
    }
  },
  methods: {
    loadRows (orgId, clusterId, namespace) {
      return kubernetesClusterServices(orgId, clusterId, namespace).then(res => res.data.services || [])
    },
    openCreate () {
      this.$router.push({ name: 'ClusterK8sServiceCreate', params: { clusterId: this.clusterId } })
    },
    openEdit (row) {
      this.$router.push({ name: 'ClusterK8sServiceEdit', params: { clusterId: this.clusterId }, query: { namespace: row.namespace, name: row.name } })
    },
    remove (row) {
      kubernetesClusterServiceDelete(this.orgId, this.clusterId, row.namespace, row.name).then(() => {
        this.$message.success('Service 已删除')
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
.link-name { color: #409eff; &:hover { text-decoration: underline; } }
.text-danger { color: #f56c6c; }
</style>
