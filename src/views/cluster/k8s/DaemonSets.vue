<template>
  <resource-list
    ref="list"
    title="Kubernetes DaemonSets"
    resource-name="DaemonSets"
    :columns="columns"
    :loader="loadRows"
    :org-id="orgId"
    :cluster-id="clusterId"
    :cluster="cluster">
    <template #name="{ row }">
      <strong>{{ row.name }}</strong>
      <div class="secondary">{{ row.namespace }}</div>
    </template>
    <template #status="{ row }">
      <el-tag size="small" :type="row.ready >= row.desired ? 'success' : 'warning'">
        {{ row.ready }}/{{ row.desired }}
      </el-tag>
    </template>
    <template #image="{ row }"><image-reference v-for="image in row.images" :key="image" :value="image" compact /></template>
    <template #actions="{ row }">
      <el-button type="text" size="small" icon="el-icon-document" @click="openDetail(row)">详情</el-button>
      <el-popconfirm title="确定删除该 DaemonSet？" @confirm="remove(row)">
        <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
      </el-popconfirm>
    </template>
  </resource-list>
</template>

<script>
import ResourceList from './components/ResourceList'
import ImageReference from '@/components/ImageReference'
import { kubernetesClusterDaemonSets, kubernetesClusterDaemonSetDetail, kubernetesClusterDaemonSetDelete } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sDaemonSets',
  components: { ResourceList, ImageReference },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      columns: [
        { key: 'name', label: 'DaemonSet', slot: 'name', minWidth: 250 },
        { key: 'status', label: 'Ready', slot: 'status', width: 110, align: 'center' },
        { key: 'image', label: '镜像', slot: 'image', minWidth: 300 },
        { key: 'created', label: '创建时间', prop: 'created_at', width: 190 },
        { key: 'actions', label: '操作', slot: 'actions', width: 160, align: 'center' }
      ]
    }
  },
  methods: {
    loadRows (orgId, clusterId, namespace) {
      return kubernetesClusterDaemonSets(orgId, clusterId, namespace).then(res => res.data.daemonsets || [])
    },
    openDetail (row) {
      this.$router.push({ name: 'ClusterK8sDaemonSetDetail', params: { clusterId: this.clusterId }, query: { namespace: row.namespace, name: row.name } })
    },
    remove (row) {
      kubernetesClusterDaemonSetDelete(this.orgId, this.clusterId, row.namespace, row.name).then(() => {
        this.$message.success('DaemonSet 已删除')
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
.text-danger { color: #f56c6c; }
</style>
