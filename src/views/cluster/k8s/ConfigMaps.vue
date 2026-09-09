<template>
  <resource-list
    ref="list"
    title="Kubernetes ConfigMaps"
    resource-name="ConfigMaps"
    :columns="columns"
    :loader="loadRows"
    :org-id="orgId"
    :cluster-id="clusterId"
    :cluster="cluster">
    <template #toolbar>
      <el-button size="small" type="primary" icon="el-icon-plus" @click="openCreate">新增 ConfigMap</el-button>
    </template>
    <template #name="{ row }">
      <strong>{{ row.name }}</strong>
      <div class="secondary">{{ row.namespace }}</div>
    </template>
    <template #labels="{ row }">
      <template v-if="row.labels && Object.keys(row.labels).length">
        <el-tag v-for="(v, k) in row.labels" :key="k" size="small" type="info" class="label-tag">{{ k }}={{ v }}</el-tag>
      </template>
      <span v-else class="cell-sub">-</span>
    </template>
    <template #actions="{ row }">
      <el-button type="text" size="small" icon="el-icon-edit" @click="openEdit(row)">编辑</el-button>
      <el-button type="text" size="small" icon="el-icon-copy-document" @click="openClone(row)">克隆</el-button>
      <el-popconfirm title="确定删除该 ConfigMap？" @confirm="remove(row)">
        <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
      </el-popconfirm>
    </template>
  </resource-list>
</template>

<script>
import ResourceList from './components/ResourceList'
import { kubernetesClusterConfigMaps, kubernetesClusterConfigMapDelete } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sConfigMaps',
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
        { key: 'labels', label: '标签', slot: 'labels', minWidth: 220 },
        { key: 'created', label: '创建时间', prop: 'created_at', width: 190 },
        { key: 'actions', label: '操作', slot: 'actions', width: 220, align: 'center' }
      ]
    }
  },
  methods: {
    loadRows (orgId, clusterId, namespace) {
      return kubernetesClusterConfigMaps(orgId, clusterId, namespace).then(res => res.data.configmaps || [])
    },
    openCreate () {
      this.$router.push({ name: 'ClusterK8sConfigMapCreate', params: { clusterId: this.clusterId } })
    },
    openEdit (row) {
      this.$router.push({ name: 'ClusterK8sConfigMapEdit', params: { clusterId: this.clusterId }, query: { namespace: row.namespace, name: row.name } })
    },
    openClone (row) {
      this.$router.push({ name: 'ClusterK8sConfigMapCreate', params: { clusterId: this.clusterId }, query: { namespace: row.namespace, name: row.name, clone: '1' } })
    },
    remove (row) {
      kubernetesClusterConfigMapDelete(this.orgId, this.clusterId, row.namespace, row.name).then(() => {
        this.$message.success('ConfigMap 已删除')
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
.label-tag { margin: 0 4px 4px 0; }
.cell-sub { color: #909399; }
.text-danger { color: #f56c6c; }
</style>
