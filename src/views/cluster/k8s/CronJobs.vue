<template>
  <resource-list
    ref="list"
    title="Kubernetes CronJobs"
    resource-name="CronJobs"
    :columns="columns"
    :loader="loadRows"
    :org-id="orgId"
    :cluster-id="clusterId"
    :cluster="cluster">
    <template #name="{ row }">
      <strong>{{ row.name }}</strong>
      <div class="secondary">{{ row.namespace }}</div>
    </template>
    <template #schedule="{ row }">
      <code>{{ row.schedule }}</code>
      <el-tag v-if="row.suspend" size="small" type="info" class="ml">已暂停</el-tag>
    </template>
    <template #actions="{ row }">
      <el-button type="text" size="small" icon="el-icon-document" @click="openDetail(row)">详情</el-button>
      <el-popconfirm title="确定删除该 CronJob？" @confirm="remove(row)">
        <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
      </el-popconfirm>
    </template>
  </resource-list>
</template>

<script>
import ResourceList from './components/ResourceList'
import { kubernetesClusterCronJobs, kubernetesClusterCronJobDetail, kubernetesClusterCronJobDelete } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sCronJobs',
  components: { ResourceList },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      columns: [
        { key: 'name', label: 'CronJob', slot: 'name', minWidth: 250 },
        { key: 'schedule', label: '调度', slot: 'schedule', minWidth: 220 },
        { key: 'active', label: '活跃', prop: 'active', width: 80, align: 'center' },
        { key: 'last', label: '上次调度', prop: 'last_schedule_time', width: 190 },
        { key: 'created', label: '创建时间', prop: 'created_at', width: 190 },
        { key: 'actions', label: '操作', slot: 'actions', width: 160, align: 'center' }
      ]
    }
  },
  methods: {
    loadRows (orgId, clusterId, namespace) {
      return kubernetesClusterCronJobs(orgId, clusterId, namespace).then(res => res.data.cronjobs || [])
    },
    openDetail (row) {
      this.$router.push({ name: 'ClusterK8sCronJobDetail', params: { clusterId: this.clusterId }, query: { namespace: row.namespace, name: row.name } })
    },
    remove (row) {
      kubernetesClusterCronJobDelete(this.orgId, this.clusterId, row.namespace, row.name).then(() => {
        this.$message.success('CronJob 已删除')
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
.ml { margin-left: 8px; }
.text-danger { color: #f56c6c; }
</style>
