<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />
    <div class="project-main">
      <div class="heading">
        <easy-title title="Kubernetes 集群" margin-set="0" />
        <router-link :to="{ name: 'ClusterK8sCreate' }">
          <el-button type="primary" size="small">接入集群</el-button>
        </router-link>
      </div>
      <el-alert
        class="intro"
        type="info"
        :closable="false"
        show-icon
        title="Kubernetes 资源模块与 Docker Swarm 独立；已支持基础资源查看，以及项目镜像发布为 Deployment + ClusterIP Service。" />
      <el-table v-loading="loading" :data="rows" fit>
        <el-table-column label="名称" min-width="210">
          <template #default="{ row }">
            <router-link :to="{ name: 'ClusterK8sOverview', params: { clusterId: row.id } }">
              <el-link type="primary">{{ row.title }}</el-link>
            </router-link>
            <div class="secondary">#{{ row.id }}<span v-if="row.remark"> · {{ row.remark }}</span></div>
          </template>
        </el-table-column>
        <el-table-column label="API Server" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">{{ connection(row).server_url || '-' }}</template>
        </el-table-column>
        <el-table-column label="Context / Namespace" min-width="190">
          <template #default="{ row }">
            {{ connection(row).context_name || '-' }}
            <div class="secondary">{{ connection(row).default_namespace || 'default' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="版本" width="155">
          <template #default="{ row }">{{ row.version || connection(row).version || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="115" align="center">
          <template #default="{ row }"><cluster-status-tag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="最后检查" width="170">
          <template #default="{ row }">{{ connection(row).last_checked_at | formatDate(null, '-') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="215" align="center" fixed="right">
          <template #default="{ row }">
            <router-link :to="{ name: 'ClusterK8sOverview', params: { clusterId: row.id } }">
              <el-link type="primary">详情</el-link>
            </router-link>
            <el-divider direction="vertical" />
            <el-link type="primary" @click="$refs.grants.open(row)">项目组授权</el-link>
            <el-divider direction="vertical" />
            <el-link type="danger" @click="remove(row)">删除</el-link>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <cluster-group-grant-dialog ref="grants" :org-id="orgId" />
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import ClusterStatusTag from '@/views/cluster/components/ClusterStatusTag'
import ClusterGroupGrantDialog from '@/views/cluster/components/ClusterGroupGrantDialog'
import { kubernetesClusters, kubernetesClusterDelete } from '@/api/kubernetes'
import { routeBreadcrumb, formatInArrayNumber } from '@/utils/helpers'
import { formatDate } from '@/utils/filters'

export default {
  name: 'ClusterK8sList',
  components: { Breadcrumb, EasyTitle, ClusterStatusTag, ClusterGroupGrantDialog },
  filters: { formatDate },
  data () {
    return { loading: false, rows: [] }
  },
  computed: {
    orgId () { return this.$store.getters.orgId },
    breadcrumb () { return [...routeBreadcrumb(this), { title: 'Kubernetes 集群', to: '' }] }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      kubernetesClusters(this.orgId).then(res => {
        this.rows = formatInArrayNumber(res.data.clusters || [], ['id', 'org_id', 'status', 'created_at'])
      }).finally(() => { this.loading = false })
    },
    connection (row) { return row.connection || {} },
    remove (row) {
      this.$confirm(`确定删除 Kubernetes 集群「${row.title}」的 Galaxy 连接配置？不会删除真实集群。`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除连接',
        cancelButtonText: '取消'
      }).then(() => kubernetesClusterDelete(this.orgId, row.id)).then(() => {
        this.$message.success('Kubernetes 集群连接已删除')
        this.load()
      }).catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
.heading { display: flex; align-items: center; justify-content: space-between; }
.intro { margin: 18px 0 12px; }
.secondary { margin-top: 3px; overflow: hidden; color: #909399; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
</style>
