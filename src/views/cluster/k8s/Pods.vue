<template>
  <div>
    <resource-list
      ref="list"
      title="Kubernetes Pods"
      resource-name="Pods"
      :columns="columns"
      :loader="loadRows"
      :org-id="orgId"
      :cluster-id="clusterId"
      :cluster="cluster">
      <template #name="{ row }">
        <router-link
          :to="{ name: 'ClusterK8sPodDetail', params: { clusterId: clusterId }, query: { namespace: row.namespace, name: row.name } }"
          class="link-name">
          <strong>{{ row.name }}</strong>
        </router-link>
        <div class="secondary">{{ row.namespace }} · {{ row.pod_ip || '尚未分配 IP' }}</div>
        <div v-for="problem in row.problems" :key="`${problem.container}-${problem.reason}`" class="problem" :title="problem.message">
          {{ problem.reason }}<template v-if="problem.message"> · {{ problem.message }}</template>
        </div>
      </template>
      <template #phase="{ row }">
        <el-tag size="small" :type="phaseType(row.phase)">{{ row.phase }}</el-tag>
      </template>
      <template #image="{ row }">
        <image-reference v-for="image in row.images" :key="image" :value="image" compact />
      </template>
      <template #actions="{ row }">
        <el-button type="text" size="small" icon="el-icon-document" @click="openDetail(row)">详情</el-button>
        <el-button type="text" size="small" icon="el-icon-tickets" @click="openLogs(row)">日志</el-button>
        <el-button type="text" size="small" icon="el-icon-terminal" @click="openTerminal(row)">终端</el-button>
        <el-popconfirm title="确定删除该 Pod？删除后可能被控制器重建" @confirm="remove(row)">
          <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
        </el-popconfirm>
      </template>
    </resource-list>
    <k8s-terminal ref="terminal" :org-id="orgId" :cluster-id="clusterId" />
  </div>
</template>

<script>
import ResourceList from './components/ResourceList'
import ImageReference from '@/components/ImageReference'
import K8sTerminal from './K8sTerminal'
import { kubernetesClusterPods, kubernetesClusterPodDelete } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sPods',
  components: { ResourceList, ImageReference, K8sTerminal },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      columns: [
        { key: 'name', label: 'Pod', slot: 'name', minWidth: 250 },
        { key: 'phase', label: '状态', slot: 'phase', width: 110, align: 'center' },
        { key: 'ready', label: 'Ready', width: 90, align: 'center', formatter: row => `${row.ready}/${row.containers}` },
        { key: 'restarts', label: '重启', prop: 'restarts', width: 80, align: 'center' },
        { key: 'node', label: '节点', prop: 'node_name', minWidth: 180 },
        { key: 'image', label: '镜像', slot: 'image', minWidth: 260 },
        { key: 'created', label: '创建时间', prop: 'created_at', width: 190 },
        { key: 'actions', label: '操作', slot: 'actions', width: 220, align: 'center' }
      ]
    }
  },
  methods: {
    loadRows (orgId, clusterId, namespace) {
      return kubernetesClusterPods(orgId, clusterId, namespace).then(res => res.data.pods || [])
    },
    openDetail (row) {
      this.$router.push({ name: 'ClusterK8sPodDetail', params: { clusterId: this.clusterId }, query: { namespace: row.namespace, name: row.name } })
    },
    openLogs (row) {
      this.$router.push({ name: 'ClusterK8sPodDetail', params: { clusterId: this.clusterId }, query: { namespace: row.namespace, name: row.name, tab: 'logs' } })
    },
    openTerminal (row) {
      this.$refs.terminal.open({
        namespace: row.namespace,
        name: row.name,
        containers: row.container_names || []
      })
    },
    remove (row) {
      kubernetesClusterPodDelete(this.orgId, this.clusterId, row.namespace, row.name).then(() => {
        this.$message.success('Pod 已删除')
        this.$refs.list && this.$refs.list.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '删除失败')
      })
    },
    phaseType (phase) {
      return { Running: 'success', Pending: 'warning', Failed: 'danger', Succeeded: 'info' }[phase] || 'info'
    },
    shortImage (image) { return String(image || '').split('@')[0] }
  }
}
</script>

<style lang="scss" scoped>
.secondary { margin-top: 4px; color: #909399; font-size: 12px; }
.problem { margin-top: 4px; overflow: hidden; color: #f56c6c; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.text-danger { color: #f56c6c; }
.link-name { color: #409eff; &:hover { text-decoration: underline; } }
</style>
