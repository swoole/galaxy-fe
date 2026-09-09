<template>
  <div>
    <resource-list
      ref="list"
      title="Kubernetes Deployments"
      resource-name="Deployments"
      :columns="columns"
      :loader="loadRows"
      :org-id="orgId"
      :cluster-id="clusterId"
      namespace-memory-key="deployments"
      :cluster="cluster">
      <template #toolbar>
        <el-button size="small" type="primary" icon="el-icon-plus" @click="openCreate">新增 Deployment</el-button>
      </template>
      <template #name="{ row }">
        <router-link
          :to="{ name: 'ClusterK8sDeploymentDetail', params: { clusterId: clusterId }, query: { namespace: row.namespace, name: row.name } }"
          class="link-name">
          <strong>{{ row.name }}</strong>
        </router-link>
        <div class="secondary">{{ row.namespace }}</div>
      </template>
      <template #status="{ row }">
        <el-tag size="small" :type="row.ready_replicas >= row.replicas ? 'success' : 'warning'">
          {{ row.ready_replicas }}/{{ row.replicas }}
        </el-tag>
      </template>
      <template #image="{ row }"><image-reference v-for="image in row.images" :key="image" :value="image" compact /></template>
      <template #actions="{ row }">
        <el-button type="text" size="small" icon="el-icon-edit" @click="openEdit(row)">编辑</el-button>
        <el-button type="text" size="small" icon="el-icon-sort" @click="openScale(row)">伸缩</el-button>
        <el-button type="text" size="small" icon="el-icon-refresh" @click="restart(row)">重启</el-button>
        <el-popconfirm title="确定删除该 Deployment？" @confirm="remove(row)">
          <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
        </el-popconfirm>
      </template>
    </resource-list>
    <el-dialog title="伸缩 Deployment" :visible.sync="scaleVisible" width="560px">
      <el-form label-width="90px" size="small">
        <el-form-item label="名称">{{ scaleRow.name }}</el-form-item>
        <el-form-item label="命名空间">{{ scaleRow.namespace }}</el-form-item>
        <el-form-item label="副本数">
          <div class="scale-label">{{ scaleCurrentReplicas }} → {{ scaleReplicas }}</div>
          <el-slider
            v-model="scaleReplicas"
            :min="0"
            :max="scaleMax"
            :marks="scaleMarks"
            show-input
            class="scale-slider" />
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
  kubernetesClusterDeployments, kubernetesClusterDeploymentDelete,
  kubernetesClusterDeploymentScale, kubernetesClusterDeploymentRestart
} from '@/api/kubernetes'

export default {
  name: 'ClusterK8sDeployments',
  components: { ResourceList, ImageReference },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      columns: [
        { key: 'name', label: 'Deployment', slot: 'name', minWidth: 250 },
        { key: 'status', label: 'Ready', slot: 'status', width: 110, align: 'center' },
        { key: 'updated', label: '已更新', prop: 'updated_replicas', width: 95, align: 'center' },
        { key: 'available', label: '可用', prop: 'available_replicas', width: 85, align: 'center' },
        { key: 'image', label: '镜像', slot: 'image', minWidth: 300 },
        { key: 'created', label: '创建时间', prop: 'created_at', width: 190 },
        { key: 'actions', label: '操作', slot: 'actions', width: 260, align: 'center' }
      ],
      scaleVisible: false,
      scaleSaving: false,
      scaleRow: { name: '', namespace: '', replicas: 0 },
      scaleReplicas: 1
    }
  },
  computed: {
    scaleCurrentReplicas () {
      return Number(this.scaleRow.replicas || 0)
    },
    scaleMax () {
      return Math.max(this.scaleCurrentReplicas * 8, 1)
    },
    scaleMarks () {
      const marks = { 0: '0' }
      marks[this.scaleCurrentReplicas] = String(this.scaleCurrentReplicas)
      marks[this.scaleMax] = String(this.scaleMax)
      return marks
    }
  },
  methods: {
    loadRows (orgId, clusterId, namespace) {
      return kubernetesClusterDeployments(orgId, clusterId, namespace).then(res => res.data.deployments || [])
    },
    openCreate () {
      this.$router.push({ name: 'ClusterK8sDeploymentCreate', params: { clusterId: this.clusterId } })
    },
    openEdit (row) {
      this.$router.push({ name: 'ClusterK8sDeploymentEdit', params: { clusterId: this.clusterId }, query: { namespace: row.namespace, name: row.name } })
    },
    openScale (row) {
      const replicas = Number(row.replicas || 0)
      this.scaleRow = { name: row.name, namespace: row.namespace, replicas }
      this.scaleReplicas = replicas
      this.scaleVisible = true
    },
    confirmScale () {
      this.scaleSaving = true
      kubernetesClusterDeploymentScale(this.orgId, this.clusterId, this.scaleRow.namespace, this.scaleRow.name, this.scaleReplicas).then(() => {
        this.$message.success('已触发伸缩')
        this.scaleVisible = false
        this.$refs.list && this.$refs.list.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '伸缩失败')
      }).finally(() => { this.scaleSaving = false })
    },
    restart (row) {
      this.$confirm('确定要滚动重启该 Deployment？', '提示', { type: 'warning' }).then(() => {
        kubernetesClusterDeploymentRestart(this.orgId, this.clusterId, row.namespace, row.name).then(() => {
          this.$message.success('已触发滚动重启')
          this.$refs.list && this.$refs.list.load()
        }).catch(err => {
          this.$message.error(err.response?.data?.msg || err.response?.data?.message || '重启失败')
        })
      }).catch(() => {})
    },
    remove (row) {
      kubernetesClusterDeploymentDelete(this.orgId, this.clusterId, row.namespace, row.name).then(() => {
        this.$message.success('Deployment 已删除')
        this.$refs.list && this.$refs.list.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '删除失败')
      })
    },
    shortImage (image) { return String(image || '').split('@')[0] }
  }
}
</script>

<style lang="scss" scoped>
.secondary { margin-top: 4px; color: #909399; font-size: 12px; }
.text-danger { color: #f56c6c; }
.link-name { color: #409eff; &:hover { text-decoration: underline; } }
.scale-label { margin-bottom: 2px; color: #606266; font-size: 13px; }
.scale-slider { width: 100%; }
</style>
