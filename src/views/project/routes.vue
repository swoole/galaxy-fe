<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <div class="project-main">
      <div class="toolbar">
        <easy-title :title="pageTitle" margin-set="0 20" />
        <div class="toolbar-actions">
          <el-select
            :value="runtimeId || 0"
            size="small"
            filterable
            class="runtime-filter"
            placeholder="选择实例"
            @change="changeRuntime">
            <el-option label="全部实例" :value="0" />
            <el-option
              v-for="target in targets"
              :key="target.runtime_id"
              :label="`${target.runtime_name} · ${target.env_title} · ${target.cluster_title}`"
              :value="target.runtime_id" />
          </el-select>
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
          <el-button v-if="canManage" size="small" icon="el-icon-download" @click="openImport">导入已有路由</el-button>
          <el-button v-if="canManage" size="small" type="primary" icon="el-icon-plus" @click="openCreate">创建路由</el-button>
        </div>
      </div>
      <el-alert
        title="实例路由规则统一包含 Service 端口和 Web 入口。Galaxy 会按目标集群生成 Swarm Service + Traefik 路由，或 Kubernetes Service + Ingress。"
        type="info"
        :closable="false"
        show-icon />
      <el-table v-loading="loading" :data="rows" style="margin-top: 18px" empty-text="该项目暂无实例路由规则">
        <el-table-column label="域名与路径" min-width="240">
          <template #default="{ row }">
            <a :href="routeUrl(row)" target="_blank" rel="noopener noreferrer">{{ row.hostname }}</a>
            <div class="secondary">{{ row.path_prefix }}</div>
          </template>
        </el-table-column>
        <el-table-column label="Workload / Runtime" min-width="190">
          <template #default="{ row }">
            {{ row.runtime ? row.runtime.name : `#${row.runtime_id}` }}
            <div class="secondary">Web 入口 → Service :{{ row.target_port }}</div>
            <div v-if="publishedPortText(row)" class="secondary">{{ publishedPortText(row) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="环境 / 集群" min-width="190">
          <template #default="{ row }">
            {{ row.env ? row.env.title : `#${row.env_id}` }}
            <div class="secondary">{{ row.cluster ? row.cluster.title : `集群 #${row.cluster_id}` }}</div>
          </template>
        </el-table-column>
        <el-table-column label="协议" width="110" align="center">
          <template #default="{ row }"><el-tag :type="row.tls_enabled ? 'success' : 'info'">{{ row.tls_enabled ? 'HTTPS' : 'HTTP' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="编排方式" width="130" align="center">
          <template #default="{ row }"><el-tag size="small" type="primary">{{ orchestratorText(row.orchestrator_type) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="同步状态" width="125" align="center">
          <template #default="{ row }">
            <el-tooltip :content="row.error || ''" :disabled="!row.error"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" align="center" fixed="right">
          <template #default="{ row }"><el-link type="primary" @click="openGateway(row)">{{ canManage ? '编辑' : '查看' }}</el-link></template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > pageSize" :total="total" :page.sync="page" :limit.sync="pageSize" @pagination="load" />
    </div>

    <el-dialog title="选择目标实例" :visible.sync="createVisible" width="520px" append-to-body>
      <el-alert
        v-if="!targets.length"
        title="当前项目还没有可用的运行实例，请先向 Swarm 或 Kubernetes 集群完成一次发布。"
        type="warning"
        :closable="false"
        show-icon />
      <el-form v-else label-width="90px">
        <el-form-item label="项目实例" required>
          <el-select v-model="selectedTarget" value-key="runtime_id" filterable style="width:100%" placeholder="选择需要绑定域名的实例">
            <el-option
              v-for="target in targets"
              :key="target.runtime_id"
              :label="`${target.runtime_name} · ${target.env_title} · ${target.cluster_title}`"
              :value="target" />
          </el-select>
          <div class="dialog-help">Galaxy 会根据所选实例的编排方式提供对应的路由配置。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedTarget" @click="continueCreate">下一步</el-button>
      </template>
    </el-dialog>

    <el-dialog title="从现有 Web 网关导入实例路由" :visible.sync="importVisible" width="760px" append-to-body>
      <el-alert
        title="Galaxy 会联合分析 Service 端口与旧 VHost，把 Host、TLS 和中间件配置迁移到实例路由，并将 published port 改写为 Service target port。"
        type="info"
        :closable="false"
        show-icon />
      <el-form label-width="90px" style="margin-top:18px">
        <el-form-item label="项目实例" required>
          <el-select v-model="importRuntimeId" filterable style="width:100%" placeholder="选择需要关联路由的 Swarm 实例" @change="loadImportCandidates">
            <el-option
              v-for="target in swarmTargets"
              :key="target.runtime_id"
              :label="`${target.runtime_name} · ${target.env_title} · ${target.cluster_title}`"
              :value="target.runtime_id" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-table
        v-loading="importLoading"
        :data="importCandidates"
        empty-text="未发现可可靠关联的现有 VHost"
        @selection-change="selectedImportCandidates = $event">
        <el-table-column type="selection" width="48" :selectable="importCandidateSelectable" />
        <el-table-column label="域名与路径" min-width="190">
          <template #default="{ row }">{{ row.hostname }}<div class="secondary">{{ row.path_prefix }}</div></template>
        </el-table-column>
        <el-table-column label="路由走向" min-width="255">
          <template #default="{ row }">
            <span>{{ row.old_target }}</span>
            <div class="secondary">→ {{ row.target_service }}:{{ row.target_port }}</div>
          </template>
        </el-table-column>
        <el-table-column label="分析结果" min-width="190">
          <template #default="{ row }">
            <el-tag :type="row.importable ? 'success' : 'danger'" size="small">{{ row.importable ? '可导入' : '不可导入' }}</el-tag>
            <div class="secondary">{{ row.blocked_reason || row.reason }}</div>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="importSubmitting"
          :disabled="!selectedImportCandidates.length"
          @click="submitImport">导入所选路由</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import Pagination from '@/components/Pagination'
import { projectRouteImport, projectRouteImportCandidates, projectRoutes } from '@/api/project'
import { routeBreadcrumb } from '@/utils/helpers'
import { projectRouteCreateLocation, projectRouteEditLocation } from '@/utils/projectRouteNavigation'

export default {
  name: 'ProjectRoutes',
  components: { Breadcrumb, EasyTitle, Pagination },
  props: {
    project: { type: Object, default: null },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return {
      rows: [],
      targets: [],
      total: 0,
      page: 1,
      pageSize: 20,
      loading: false,
      createVisible: false,
      selectedTarget: null,
      importVisible: false,
      importRuntimeId: null,
      importCandidates: [],
      selectedImportCandidates: [],
      importLoading: false,
      importSubmitting: false
    }
  },
  computed: {
    runtimeId () { return Number(this.$route.query.runtime_id || 0) || null },
    scopedTarget () {
      return this.runtimeId ? this.targets.find(item => Number(item.runtime_id) === this.runtimeId) : null
    },
    swarmTargets () {
      return this.targets.filter(item => item.orchestrator_type === 'docker_swarm')
    },
    pageTitle () {
      return this.scopedTarget ? `实例路由规则 · ${this.scopedTarget.runtime_name}` : '路由规则汇总'
    },
    breadcrumb () { return [...routeBreadcrumb(this), { title: '部署', to: '' }, { title: '路由规则汇总', to: '' }] },
    canManage () {
      return this.$p('project.no_viewer', this.project?.org_role, this.project?.group_role, this.project?.role)
    }
  },
  created () { this.load() },
  methods: {
    changeRuntime (runtimeId) {
      const query = { ...this.$route.query }
      if (Number(runtimeId) > 0) query.runtime_id = Number(runtimeId)
      else delete query.runtime_id
      this.page = 1
      this.$router.replace({ query }).then(() => this.load()).catch(() => {})
    },
    load () {
      this.loading = true
      return projectRoutes(this.orgId, this.groupId, this.projectId, this.page, this.pageSize, this.runtimeId).then(res => {
        this.rows = res.data.data || []
        this.targets = res.data.targets || []
        this.total = Number(res.data.total || 0)
        this.page = Number(res.data.page || 1)
        this.pageSize = Number(res.data.pagesize || this.pageSize)
      }).finally(() => { this.loading = false })
    },
    openCreate () {
      this.selectedTarget = this.targets.length === 1 ? this.targets[0] : null
      this.createVisible = true
    },
    openImport () {
      this.importRuntimeId = this.scopedTarget && this.scopedTarget.orchestrator_type === 'docker_swarm'
        ? this.scopedTarget.runtime_id
        : (this.swarmTargets.length === 1 ? this.swarmTargets[0].runtime_id : null)
      this.importCandidates = []
      this.selectedImportCandidates = []
      this.importVisible = true
      if (this.importRuntimeId) this.loadImportCandidates()
    },
    loadImportCandidates () {
      this.importCandidates = []
      this.selectedImportCandidates = []
      if (!this.importRuntimeId) return Promise.resolve()
      this.importLoading = true
      return projectRouteImportCandidates(
        this.orgId, this.groupId, this.projectId, this.importRuntimeId
      ).then(res => {
        this.importCandidates = res.data.candidates || []
      }).finally(() => { this.importLoading = false })
    },
    importCandidateSelectable (row) {
      return Boolean(row.importable)
    },
    submitImport () {
      const ids = this.selectedImportCandidates.map(item => item.vhost_id)
      if (!this.importRuntimeId || !ids.length) return
      this.importSubmitting = true
      return projectRouteImport(
        this.orgId, this.groupId, this.projectId, this.importRuntimeId, ids
      ).then(() => {
        this.$message.success('已有路由已导入并重新绑定到当前实例')
        this.importVisible = false
        return this.load()
      }).finally(() => { this.importSubmitting = false })
    },
    continueCreate () {
      if (!this.selectedTarget) return
      this.$router.push(projectRouteCreateLocation({
        groupId: this.groupId,
        projectId: this.projectId
      }, this.selectedTarget))
    },
    openGateway (row) {
      this.$router.push(projectRouteEditLocation({
        groupId: this.groupId,
        projectId: this.projectId
      }, row))
    },
    routeUrl (row) {
      return `${row.tls_enabled ? 'https' : 'http'}://${row.hostname}${row.path_prefix === '/' ? '' : row.path_prefix}`
    },
    publishedPortText (row) {
      const ports = row.runtime && row.runtime.spec && Array.isArray(row.runtime.spec.ports)
        ? row.runtime.spec.ports
        : []
      const port = ports.find(item => Number(item.target) === Number(row.target_port) && Number(item.published) > 0)
      return port ? `节点 :${port.published} → 容器 :${port.target}/${String(port.protocol || 'tcp').toUpperCase()}` : ''
    },
    orchestratorText (type) { return type === 'kubernetes' ? 'Kubernetes' : 'Docker Swarm' },
    statusText (status) { return ({ pending: '同步中', synced: '已同步', error: '失败' })[status] || status },
    statusType (status) { return ({ pending: 'warning', synced: 'success', error: 'danger' })[status] || 'info' }
  }
}
</script>

<style lang="scss" scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.toolbar-actions { display: flex; gap: 10px; }
.runtime-filter { width: 310px; }
.secondary { margin-top: 4px; color: #909399; font-size: 12px; }
.dialog-help { margin-top: 6px; color: #909399; font-size: 12px; line-height: 1.5; }
</style>
