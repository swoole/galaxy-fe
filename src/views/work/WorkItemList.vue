<template>
  <div class="project-container work-item-list">
    <div class="page-head">
      <h2 class="page-title">{{ typeText[workType] }}</h2>
      <span class="page-subtitle">仅项目组成员可见与协作</span>
    </div>

    <el-card shadow="never" class="content-card">
      <div slot="header" class="card-header">
        <i class="el-icon-s-operation card-header-icon"></i> 筛选
        <div class="card-header-actions">
          <el-button type="primary" size="small" icon="el-icon-plus" @click="create">新建</el-button>
        </div>
      </div>

      <el-form :inline="true" :model="filters" class="filter-bar" @submit.native.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            size="small"
            placeholder="标题 / 详情"
            clearable
            @keyup.enter.native="search"
            @clear="search" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" size="small" placeholder="全部" clearable @change="search">
            <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="filters.priority" size="small" placeholder="全部" clearable @change="search">
            <el-option v-for="o in priorityOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-select
            v-model="filters.owner_id"
            size="small"
            placeholder="全部"
            filterable
            clearable
            @change="search">
            <el-option v-for="o in ownerOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="标记">
          <el-checkbox v-model="filters.urgent" @change="search">紧急</el-checkbox>
          <el-checkbox v-model="filters.important" @change="search">重要</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button size="small" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="content-card">
      <el-table :data="tableData" v-loading="loading" style="width:100%">
        <el-table-column label="标题" min-width="220">
          <template #default="{ row }">
            <a class="cell-name link" @click="open(row)">{{ row.title }}</a>
            <span v-if="Number(row.urgent)" class="flag flag-urgent">急</span>
            <span v-if="Number(row.important)" class="flag flag-important">重</span>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="90">
          <template #default="{ row }">
            <el-tag :type="priorityType[row.priority]" size="small">{{ priorityText[row.priority] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="92">
          <template #default="{ row }">
            <el-tag :type="statusType[row.status]" size="small">{{ statusText[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="负责人" width="130" class-name="cell-sub">
          <template #default="{ row }">
            <org-user v-if="row.owner_info" :user="row.owner_info" />
            <span v-else class="cell-sub">-</span>
          </template>
        </el-table-column>
        <el-table-column label="截止时间" width="120" class-name="cell-date">
          <template #default="{ row }">{{ row.deadline ? formatDate(row.deadline) : '-' }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="120" class-name="cell-date">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="text" @click="open(row)">查看</el-button>
            <el-button type="text" class="danger-link" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          @current-change="handlePage" />
      </div>
    </el-card>
  </div>
</template>

<script>
import { workItemList, workItemDelete } from '@/api/workItem'
import { groupMemberList } from '@/api/group-member'
import OrgUser from '@/views/components/OrgUser'

export default {
  name: 'WorkItemListPage',
  components: { OrgUser },
  data () {
    return {
      loading: false,
      workType: this.$route.meta.workType || 'todo',
      tableData: [],
      total: 0,
      page: 1,
      pageSize: 20,
      ownerOptions: [],
      filters: {
        keyword: '',
        status: '',
        priority: '',
        owner_id: '',
        urgent: false,
        important: false
      },
      priorityOptions: [
        { value: 'low', label: '低' },
        { value: 'normal', label: '普通' },
        { value: 'high', label: '高' }
      ],
      statusOptions: [
        { value: 'pending', label: '待处理' },
        { value: 'in_progress', label: '进行中' },
        { value: 'done', label: '已完成' },
        { value: 'closed', label: '已关闭' }
      ],
      priorityText: { low: '低', normal: '普通', high: '高' },
      priorityType: { low: 'info', normal: '', high: 'warning' },
      statusText: { pending: '待处理', in_progress: '进行中', done: '已完成', closed: '已关闭' },
      statusType: { pending: 'info', in_progress: 'warning', done: 'success', closed: 'info' },
      typeText: { todo: '待办事项', task: '工作任务', requirement: '需求清单', note: '备忘录' }
    }
  },
  computed: {
    orgId () { return this.$store.getters.orgId },
    groupId () { return this.$route.params.groupId },
    isCollab () { return this.workType !== 'note' },
    isProjectContext () { return !!this.$route.params.projectId }
  },
  created () {
    this.loadOwners()
    this.getList()
  },
  methods: {
    getList () {
      this.loading = true
      const params = {
        group: this.groupId,
        type: this.workType,
        keyword: this.filters.keyword || undefined,
        status: this.filters.status || undefined,
        priority: this.filters.priority || undefined,
        owner_id: this.filters.owner_id || undefined,
        urgent: this.filters.urgent ? 1 : undefined,
        important: this.filters.important ? 1 : undefined,
        project: 0,
        page: this.page,
        pagesize: this.pageSize
      }
      workItemList(this.orgId, this.groupId, params).then(res => {
        this.tableData = res.data.data || []
        this.total = Number(res.data.total) || 0
        this.page = Number(res.data.page) || 1
        this.pageSize = Number(res.data.pagesize) || 20
      }).catch(err => {
        this.$message.error(err.response?.data?.message || err.message || '加载失败')
      }).finally(() => {
        this.loading = false
      })
    },
    loadOwners () {
      if (!this.isCollab) return
      groupMemberList(this.orgId, this.groupId).then(res => {
        const list = (res.data && res.data.data) || []
        this.ownerOptions = list.map(m => ({
          value: Number(m.uid),
          label: m.realname || m.nickname || m.email || `用户${m.uid}`
        }))
      }).catch(() => {})
    },
    search () { this.page = 1; this.getList() },
    resetFilters () {
      this.filters = { keyword: '', status: '', priority: '', owner_id: '', urgent: false, important: false }
      this.search()
    },
    handlePage (p) { this.page = p; this.getList() },
    create () {
      const names = { todo: 'WorkTodoCreate', task: 'WorkTaskCreate', requirement: 'WorkRequirementCreate' }
      const projectNames = { todo: 'ProjectWorkTodoCreate', task: 'ProjectWorkTaskCreate', requirement: 'ProjectWorkRequirementCreate' }
      const name = (this.isProjectContext ? projectNames : names)[this.workType]
      this.$router.push({ name, params: { groupId: this.groupId } })
    },
    open (row) {
      const names = { todo: 'WorkTodoDetail', task: 'WorkTaskDetail', requirement: 'WorkRequirementDetail' }
      const projectNames = { todo: 'ProjectWorkTodoDetail', task: 'ProjectWorkTaskDetail', requirement: 'ProjectWorkRequirementDetail' }
      const name = (this.isProjectContext ? projectNames : names)[this.workType]
      this.$router.push({ name, params: { groupId: this.groupId, id: row.id } })
    },
    remove (row) {
      this.$confirm(`确认删除「${row.title}」？`, '删除确认', { type: 'warning' }).then(() => {
        workItemDelete(this.orgId, row.id).then(() => {
          this.$message.success('已删除')
          this.getList()
        }).catch(err => this.$message.error(err.response?.data?.message || err.message || '删除失败'))
      }).catch(() => {})
    },
    formatDate (ts) {
      if (!ts) return '-'
      const d = new Date(ts * 1000)
      const p = n => (n < 10 ? '0' + n : n)
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    }
  }
}
</script>

<style lang="scss" scoped>
.work-item-list { padding: 12px; }
.page-head { margin: 8px 8px 16px; }
.page-title { margin: 0; font-size: 20px; color: rgba(0,0,0,.755); }
.page-subtitle { margin-left: 10px; font-size: 13px; color: #909399; }
.content-card {
  border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06); margin-bottom: 16px;
  ::v-deep .el-card__header { padding: 14px 20px; border-bottom: 1px solid #ebeef5; background: #fafbfc; }
}
.card-header {
  display: flex; align-items: center; font-size: 15px; font-weight: 600; color: #303133;
  .card-header-icon { margin-right: 8px; color: #409eff; }
  .card-header-actions { margin-left: auto; }
}
.filter-bar { padding: 4px 0; }
.filter-bar .el-form-item { margin-bottom: 10px; }
::v-deep .el-table {
  th { padding: 11px 0; font-size: 13px; }
  td { padding: 10px 0; font-size: 13px; }
}
.cell-name { font-weight: 600; color: #303133; font-size: 13px; }
.cell-sub { color: #909399; font-size: 12px; }
.cell-date { color: #606266; font-size: 13px; }
.link { cursor: pointer; color: #409eff; }
.link:hover { text-decoration: underline; }
.danger-link { color: #f56c6c; }
.flag {
  display: inline-block; font-size: 11px; line-height: 16px; padding: 0 5px;
  border-radius: 3px; margin-left: 6px; vertical-align: middle;
}
.flag-urgent { background: #fef0f0; color: #f56c6c; }
.flag-important { background: #fdf6ec; color: #e6a23c; }
.pager { margin-top: 16px; text-align: right; }
</style>
