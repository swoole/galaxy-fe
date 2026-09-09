<template>
  <div class="project-container devenv-page">
    <el-card shadow="never" class="content-card">
      <div slot="header" class="card-header">
        <div>
          <div class="title"><i class="el-icon-terminal"></i> 开发环境</div>
          <div class="subtitle">您在每个项目组中可以拥有一个独立开发环境</div>
        </div>
        <div class="actions">
          <el-button type="primary" size="small" icon="el-icon-plus" @click="openCreate">新建开发环境</el-button>
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>

      <el-alert
        title="开发环境不隶属于单个项目，但仍属于项目组，并使用该项目组获授权的集群、Web 网关、域名和 SSL 证书资源。"
        type="info"
        :closable="false"
        show-icon />

      <el-table v-loading="loading" :data="workspaces" empty-text="尚未创建开发环境" style="margin-top: 16px">
        <el-table-column label="开发环境" min-width="190">
          <template #default="{ row }">
            <router-link :to="workspaceRoute(row)" class="workspace-link">{{ row.title || '我的开发环境' }}</router-link>
            <div class="secondary">#{{ row.id }}</div>
          </template>
        </el-table-column>
        <el-table-column label="所属项目组" min-width="170"><template #default="{ row }">{{ row.group ? row.group.title : `#${row.group_id}` }}</template></el-table-column>
        <el-table-column label="入口" width="110"><template #default="{ row }">{{ row.mode === 'terminal' ? 'CLI 终端' : 'Web IDE' }}</template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="集群" width="100"><template #default="{ row }">#{{ row.cluster_id }}</template></el-table-column>
        <el-table-column label="最近更新" width="170"><template #default="{ row }">{{ row.updated_at | formatDate }}</template></el-table-column>
        <el-table-column label="操作" width="90" fixed="right"><template #default="{ row }"><el-button type="primary" size="mini" @click="$router.push(workspaceRoute(row))">进入</el-button></template></el-table-column>
      </el-table>
    </el-card>

    <el-dialog title="新建开发环境" :visible.sync="createVisible" width="520px">
      <el-alert title="先选择开发环境所属的项目组；运行集群将在下一步从该项目组已授权资源中选择。" type="info" :closable="false" show-icon />
      <el-form label-width="90px" style="margin-top: 18px">
        <el-form-item label="项目组" required>
          <el-select v-model="selectedProjectId" style="width: 100%" placeholder="请选择项目组">
            <el-option
              v-for="project in creatableProjects"
              :key="project.id"
              :label="project.title"
              :value="project.alias || project.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="createVisible = false">取消</el-button><el-button type="primary" :disabled="!selectedProjectId" @click="continueCreate">下一步</el-button></span>
    </el-dialog>
  </div>
</template>

<script>
import { workspaceList } from '@/api/workspace'
import { formatDate } from '@/utils/filters'

export default {
  name: 'DevEnv',
  filters: { formatDate },
  data () {
    return {
      loading: false,
      projects: [],
      workspaces: [],
      createVisible: false,
      selectedProjectId: null
    }
  },
  computed: {
    orgId () { return this.$store.getters.orgId },
    userId () { return Number((this.$store.getters.user || {}).id) },
    creatableProjects () {
      const used = new Set(this.workspaces.map(item => Number(item.group_id)))
      return this.projects.filter(item => !used.has(Number(item.id)))
    }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      workspaceList(this.orgId).then(res => {
        this.projects = res.data.projects || []
        this.workspaces = res.data.workspaces || []
      }).finally(() => { this.loading = false })
    },
    workspaceRoute (workspace) {
      return { name: 'Workspace', params: { groupId: workspace.group && (workspace.group.alias || workspace.group.id) || workspace.group_id, userId: this.userId } }
    },
    openCreate () {
      if (!this.creatableProjects.length) return this.$message.info('您所在的项目组均已创建开发环境')
      this.selectedProjectId = null
      this.createVisible = true
    },
    continueCreate () {
      this.createVisible = false
      this.$router.push({ name: 'Workspace', params: { groupId: this.selectedProjectId, userId: this.userId } })
    },
    statusType (status) { return ({ running: 'success', starting: 'warning', stopped: 'info', error: 'danger' })[status] || 'info' },
    statusText (status) { return ({ pending: '等待创建', starting: '启动中', running: '运行中', stopped: '已停止', error: '异常' })[status] || status }
  }
}
</script>

<style lang="scss" scoped>
.devenv-page { padding: 20px; }
.content-card { border-radius: 6px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.title { color: #303133; font-size: 16px; font-weight: 600; }
.title i { margin-right: 7px; color: #409eff; }
.subtitle, .secondary { margin-top: 4px; color: #909399; font-size: 12px; }
.workspace-link { color: #409eff; font-weight: 600; }
</style>
