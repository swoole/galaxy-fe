<template>
  <div>
    <resource-list
      ref="list"
      title="Kubernetes StatefulSets"
      resource-name="StatefulSets"
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
        <el-tag size="small" :type="row.ready_replicas >= row.replicas ? 'success' : 'warning'">
          {{ row.ready_replicas }}/{{ row.replicas }}
        </el-tag>
      </template>
      <template #image="{ row }"><image-reference v-for="image in row.images" :key="image" :value="image" compact /></template>
      <template #actions="{ row }">
        <el-button type="text" size="small" icon="el-icon-document" @click="openDetail(row)">详情</el-button>
        <el-button type="text" size="small" icon="el-icon-sort" @click="openScale(row)">伸缩</el-button>
        <el-popconfirm title="确定删除该 StatefulSet？" @confirm="remove(row)">
          <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
        </el-popconfirm>
      </template>
    </resource-list>
    <el-dialog title="伸缩 StatefulSet" :visible.sync="scaleVisible" width="420px">
      <el-form label-width="90px" size="small">
        <el-form-item label="名称">{{ scaleRow.name }}</el-form-item>
        <el-form-item label="命名空间">{{ scaleRow.namespace }}</el-form-item>
        <el-form-item label="副本数">
          <el-input-number v-model="scaleReplicas" :min="0" :max="100" controls-position="right" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="scaleVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="scaleSaving" @click="confirmScale">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import ResourceList from './components/ResourceList'
import ImageReference from '@/components/ImageReference'
import {
  kubernetesClusterStatefulSets, kubernetesClusterStatefulSetDetail,
  kubernetesClusterStatefulSetScale, kubernetesClusterStatefulSetDelete
} from '@/api/kubernetes'

export default {
  name: 'ClusterK8sStatefulSets',
  components: { ResourceList, ImageReference },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      columns: [
        { key: 'name', label: 'StatefulSet', slot: 'name', minWidth: 250 },
        { key: 'status', label: 'Ready', slot: 'status', width: 110, align: 'center' },
        { key: 'service', label: 'Service', prop: 'service_name', minWidth: 160 },
        { key: 'image', label: '镜像', slot: 'image', minWidth: 300 },
        { key: 'created', label: '创建时间', prop: 'created_at', width: 190 },
        { key: 'actions', label: '操作', slot: 'actions', width: 240, align: 'center' }
      ],
      scaleVisible: false,
      scaleSaving: false,
      scaleRow: { name: '', namespace: '' },
      scaleReplicas: 1
    }
  },
  methods: {
    loadRows (orgId, clusterId, namespace) {
      return kubernetesClusterStatefulSets(orgId, clusterId, namespace).then(res => res.data.statefulsets || [])
    },
    openDetail (row) {
      this.$router.push({ name: 'ClusterK8sStatefulSetDetail', params: { clusterId: this.clusterId }, query: { namespace: row.namespace, name: row.name } })
    },
    openScale (row) {
      this.scaleRow = { name: row.name, namespace: row.namespace }
      this.scaleReplicas = row.replicas || 1
      this.scaleVisible = true
    },
    confirmScale () {
      this.scaleSaving = true
      kubernetesClusterStatefulSetScale(this.orgId, this.clusterId, this.scaleRow.namespace, this.scaleRow.name, this.scaleReplicas).then(() => {
        this.$message.success('已触发伸缩')
        this.scaleVisible = false
        this.$refs.list && this.$refs.list.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '伸缩失败')
      }).finally(() => { this.scaleSaving = false })
    },
    remove (row) {
      kubernetesClusterStatefulSetDelete(this.orgId, this.clusterId, row.namespace, row.name).then(() => {
        this.$message.success('StatefulSet 已删除')
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
