<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />
    <div class="project-main">
      <div class="heading">
        <easy-title title="Docker Swarm 集群" margin-set="0" />
        <router-link :to="{ name: 'ClusterSwarmCreate' }"><el-button type="primary" size="small">创建集群</el-button></router-link>
      </div>
      <div class="filters">
        <el-select v-model="filter.envId" clearable placeholder="环境筛选" size="small" @change="load">
          <el-option v-for="env in envs" :key="env.id" :label="env.title" :value="env.id" />
        </el-select>
        <el-input v-model.trim="filter.keyword" clearable size="small" placeholder="名称或 ID" @keyup.enter.native="load">
          <el-button slot="append" icon="el-icon-search" @click="load" />
        </el-input>
      </div>
      <el-table v-loading="loading" :data="rows" fit>
        <el-table-column label="名称" min-width="220">
          <template #default="{ row }">
            <router-link v-if="row.online" :to="{ name: 'ClusterSwarmOverview', params: { clusterId: row.id } }"><el-link type="primary">{{ row.title }}</el-link></router-link>
            <span v-else>{{ row.title }}</span>
            <div class="secondary cluster-summary">
              <span>#{{ row.id }}</span>
              <span v-if="row.remark">{{ row.remark }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="环境" min-width="180">
          <template #default="{ row }"><el-tag v-for="env in row.envs || []" :key="env.id" size="mini" class="env-tag">{{ env.title }}</el-tag><span v-if="!(row.envs || []).length">-</span></template>
        </el-table-column>
        <el-table-column label="Agent 节点" width="150">
          <template #default="{ row }">
            <div class="node-count">
              <strong>{{ Number(row.online_agent_nodes_count || 0) }}</strong>
              <span>/ {{ Number(row.agent_nodes_count || 0) }} 在线</span>
            </div>
            <div class="secondary">
              Manager {{ Number(row.online_manager_agent_nodes_count || 0) }}/{{ Number(row.manager_agent_nodes_count || 0) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="运行版本" min-width="145">
          <template #default="{ row }">
            <span v-if="row.version">Docker {{ row.version }}</span>
            <span v-else class="muted">等待 Agent 上报</span>
            <div v-if="row.swarm_id" class="secondary mono" :title="row.swarm_id">Swarm {{ shortId(row.swarm_id) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="连接状态" width="135" align="center">
          <template #default="{ row }">
            <cluster-status-tag :status="row.status" />
            <div class="secondary">{{ agentStatusText(row) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="接入时间" width="170">
          <template #default="{ row }">
            {{ (row.registered_at || row.created_at) | formatDate(null, '-') }}
            <div v-if="!row.registered_at" class="secondary">尚未完成注册</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="270" align="center" fixed="right">
          <template #default="{ row }">
            <router-link v-if="row.online" :to="{ name: 'ClusterSwarmOverview', params: { clusterId: row.id } }"><el-link type="primary">详情</el-link></router-link>
            <el-link v-else disabled>详情</el-link>
            <el-divider direction="vertical" />
            <router-link :to="{ name: 'ClusterSwarmAgent', params: { clusterId: row.id } }"><el-link type="primary">Agent 连接</el-link></router-link>
            <el-divider direction="vertical" />
            <el-link type="primary" @click="openGroupGrants(row)">项目组授权</el-link>
            <el-divider direction="vertical" />
            <el-link type="danger" @click="prepareDelete(row)">删除</el-link>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog title="删除 Docker Swarm 集群" :visible.sync="deleteVisible" width="560px">
      <el-alert v-if="!canDelete" title="集群仍有关联运行资源，暂时不能删除" type="error" :closable="false" show-icon />
      <div class="overview-row">运行实例：{{ count(overview.instances) }}</div>
      <div class="overview-row">开发工作区：{{ count(overview.workspaces) }}</div>
      <div class="overview-row">Traefik 路由：{{ count(overview.domains) }}</div>
      <div class="overview-row">托管 Web 网关：{{ count(overview.webGateway) }}</div>
      <div class="overview-row">活动 BuildKit 流水线：{{ count(overview.pipelines) }}</div>
      <div class="overview-row">执行中或待对账构建：{{ count(overview.builds) }}</div>
      <div class="overview-row">执行中或待对账发布：{{ count(overview.releaseBlockers) }}</div>
      <div class="overview-row">历史发布：{{ count(overview.deploys) }}</div>
      <div class="overview-row">环境关联：{{ count(overview.envRel) }}</div>
      <span slot="footer"><el-button @click="deleteVisible = false">取消</el-button><el-button type="danger" :disabled="!canDelete" @click="confirmDelete">删除</el-button></span>
    </el-dialog>
    <el-dialog :title="`项目组资源授权 · ${grantingCluster ? grantingCluster.title : ''}`" :visible.sync="grantVisible" width="600px">
      <el-alert title="只有被选中的项目组及其成员才能在构建、Workspace 和项目发布中使用此集群。未授权即不可用。" type="warning" :closable="false" show-icon />
      <div v-loading="grantLoading" class="grant-list">
        <el-checkbox-group v-model="grantedGroupIds">
          <el-checkbox
            v-for="group in grantGroups"
            :key="group.id"
            :label="group.id"
            :disabled="group.granted && group.revoke_blocked"
            class="grant-project">
            <span class="grant-project-content">
              <span><strong>{{ group.title }}</strong><code>{{ group.alias }}</code></span>
              <small v-if="group.granted && group.revoke_blocked">正在使用：{{ revokeBlockerText(group.revoke_blockers) }}</small>
            </span>
          </el-checkbox>
        </el-checkbox-group>
        <el-empty v-if="!grantLoading && !grantGroups.length" description="组织内暂无项目组" :image-size="70" />
      </div>
      <span slot="footer">
        <el-button @click="grantVisible = false">取消</el-button>
        <el-button type="primary" :loading="grantSaving" @click="saveGroupGrants">保存授权</el-button>
      </span>
    </el-dialog>
    <id-confirm ref="id-confirm" />
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import IdConfirm from '@/views/components/IdConfirm'
import ClusterStatusTag from '@/views/cluster/components/ClusterStatusTag'
import { clusters, clusterDeleteOverview, clusterDelete, clusterGroupGrants, clusterGroupGrantsSave } from '@/api/cluster'
import { envSimple } from '@/api/env'
import { routeBreadcrumb, formatInArrayNumber } from '@/utils/helpers'
import { formatDate } from '@/utils/filters'

export default {
  name: 'ClusterSwarmList',
  components: { Breadcrumb, EasyTitle, IdConfirm, ClusterStatusTag },
  filters: { formatDate },
  data () {
    return {
      loading: false,
      rows: [],
      envs: [],
      filter: { envId: null, keyword: '' },
      deleteVisible: false,
      deleting: null,
      grantingCluster: null,
      grantVisible: false,
      grantLoading: false,
      grantSaving: false,
      grantGroups: [],
      grantedGroupIds: [],
      overview: { instances: [], workspaces: [], domains: [], webGateway: [], pipelines: [], builds: [], releaseBlockers: [], deploys: [], envRel: [] }
    }
  },
  computed: {
    orgId () { return this.$store.getters.orgId },
    breadcrumb () { return [...routeBreadcrumb(this), { title: 'Docker Swarm 集群', to: '' }] },
    canDelete () {
      return ['instances', 'workspaces', 'domains', 'webGateway', 'pipelines', 'builds', 'releaseBlockers']
        .every(key => this.count(this.overview[key]) === 0)
    }
  },
  created () {
    this.load()
    envSimple(this.orgId).then(res => { this.envs = formatInArrayNumber(res.data.envs || [], ['id']) })
  },
  methods: {
    load () {
      this.loading = true
      clusters(this.orgId, this.filter.envId, this.filter.keyword || null).then(res => {
        this.rows = formatInArrayNumber(res.data.clusters || [], [
          'id', 'org_id', 'created_at', 'registered_at',
          'agent_nodes_count', 'online_agent_nodes_count',
          'manager_agent_nodes_count', 'online_manager_agent_nodes_count'
        ])
        this.rows.forEach(row => {
          // Generic cluster availability follows the Manager Agent. Partial
          // Worker coverage is reported separately by agent_status.
          this.$set(row, 'online', Number(row.status) === 3)
        })
      }).finally(() => { this.loading = false })
    },
    prepareDelete (row) {
      this.deleting = row
      clusterDeleteOverview(this.orgId, row.id).then(res => {
        this.overview = {
          instances: [],
          workspaces: [],
          domains: [],
          webGateway: [],
          pipelines: [],
          builds: [],
          releaseBlockers: [],
          deploys: [],
          envRel: [],
          ...(res.data || {})
        }
        this.deleteVisible = true
      })
    },
    confirmDelete () {
      if (!this.canDelete || !this.deleting) return
      this.$refs['id-confirm'].confirm(`删除集群【${this.deleting.title}】`, token => {
        clusterDelete(this.orgId, this.deleting.id, token).then(() => {
          this.$message.success('集群已删除')
          this.$refs['id-confirm'].finish()
          this.deleteVisible = false
          this.load()
        })
      })
    },
    openGroupGrants (cluster) {
      this.grantingCluster = cluster
      this.grantVisible = true
      this.grantLoading = true
      clusterGroupGrants(this.orgId, cluster.id).then(res => {
        this.grantGroups = formatInArrayNumber(res.data.groups || [], ['id'])
        this.grantedGroupIds = this.grantGroups.filter(item => item.granted).map(item => item.id)
      }).finally(() => { this.grantLoading = false })
    },
    saveGroupGrants () {
      if (!this.grantingCluster) return
      this.grantSaving = true
      clusterGroupGrantsSave(this.orgId, this.grantingCluster.id, this.grantedGroupIds).then(() => {
        this.$message.success('项目组集群授权已更新')
        this.grantVisible = false
      }).finally(() => { this.grantSaving = false })
    },
    revokeBlockerText (blockers = {}) {
      const labels = {
        projects: '构建设置',
        pipelines: 'Pipeline',
        workspaces: 'Workspace',
        runtimes: '运行实例',
        builds: '构建任务',
        releases: '发布任务'
      }
      return Object.keys(labels).filter(key => Number(blockers[key] || 0) > 0)
        .map(key => `${labels[key]} ${Number(blockers[key])}`).join('、')
    },
    agentStatusText (row) {
      if (row.registration_status !== 'registered') return '等待 Agent 注册'
      return {
        healthy: 'Agent 正常',
        degraded: 'Agent 部分在线',
        initializing: 'Agent 初始化中',
        pending: '等待 Agent',
        offline: 'Agent 离线'
      }[row.agent_status] || 'Agent 未知'
    },
    shortId (value) {
      const text = String(value || '')
      return text.length > 12 ? `${text.slice(0, 12)}…` : text
    },
    count (rows) { return (rows || []).reduce((sum, row) => sum + Number(row.cnt || 0), 0) }
  }
}
</script>

<style lang="scss" scoped>
.heading { display: flex; align-items: center; justify-content: space-between; }
.filters { display: grid; grid-template-columns: 220px 340px; justify-content: end; gap: 10px; margin: 18px 0 12px; }
.secondary { margin-top: 3px; color: #909399; font-size: 12px; }
.cluster-summary { display: flex; min-width: 0; gap: 8px; }
.cluster-summary span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.node-count { display: flex; align-items: baseline; gap: 4px; color: #606266; }
.node-count strong { color: #303133; font-size: 16px; font-variant-numeric: tabular-nums; }
.muted { color: #909399; }
.mono { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.env-tag { margin: 2px 5px 2px 0; }
.overview-row { padding: 10px 4px; border-bottom: 1px solid #ebeef5; }
.grant-list { min-height: 180px; max-height: 420px; overflow: auto; margin-top: 18px; border: 1px solid #ebeef5; border-radius: 4px; padding: 8px 16px; }
.grant-project { display: flex; align-items: center; margin: 0; padding: 12px 0; border-bottom: 1px solid #f0f2f5; }
.grant-project:last-child { border-bottom: 0; }
.grant-project code { margin-left: 8px; color: #909399; font-size: 12px; }
.grant-project-content { display: inline-flex; flex-direction: column; gap: 4px; vertical-align: middle; }
.grant-project-content small { color: #e6a23c; font-size: 12px; line-height: 1.4; }
</style>
