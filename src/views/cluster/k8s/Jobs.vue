<template>
  <resource-list
    ref="list"
    title="Kubernetes Jobs"
    resource-name="Jobs"
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
      <el-tag size="small" :type="row.failed > 0 ? 'danger' : (row.succeeded >= row.completions && row.completions > 0 ? 'success' : 'warning')">
        {{ row.succeeded }}/{{ row.completions }}
      </el-tag>
    </template>
    <template #actions="{ row }">
      <el-button type="text" size="small" icon="el-icon-document" @click="openDetail(row)">详情</el-button>
      <el-popconfirm title="确定删除该 Job？" @confirm="remove(row)">
        <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
      </el-popconfirm>
    </template>
  </resource-list>
</template>

<script>
import ResourceList from './components/ResourceList'
import { kubernetesClusterJobs, kubernetesClusterJobDetail, kubernetesClusterJobDelete } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sJobs',
  components: { ResourceList },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      columns: [
        { key: 'name', label: 'Job', slot: 'name', minWidth: 250 },
        { key: 'status', label: '完成', slot: 'status', width: 110, align: 'center' },
        { key: 'parallelism', label: '并行', prop: 'parallelism', width: 80, align: 'center' },
        { key: 'active', label: '活跃', prop: 'active', width: 80, align: 'center' },
        { key: 'failed', label: '失败', prop: 'failed', width: 80, align: 'center' },
        { key: 'created', label: '创建时间', prop: 'created_at', width: 190 },
        { key: 'actions', label: '操作', slot: 'actions', width: 160, align: 'center' }
      ]
    }
  },
  methods: {
    loadRows (orgId, clusterId, namespace) {
      return kubernetesClusterJobs(orgId, clusterId, namespace).then(res => res.data.jobs || [])
    },
    openDetail (row) {
      this.$router.push({ name: 'ClusterK8sJobDetail', params: { clusterId: this.clusterId }, query: { namespace: row.namespace, name: row.name } })
    },
    remove (row) {
      kubernetesClusterJobDelete(this.orgId, this.clusterId, row.namespace, row.name).then(() => {
        this.$message.success('Job 已删除')
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
