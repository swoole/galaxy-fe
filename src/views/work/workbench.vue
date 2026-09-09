<template>
  <div class="project-container workbench-page">
    <div class="page-head">
      <h2 class="page-title">工作台</h2>
      <span class="page-subtitle">个人工作概览与摘要汇总</span>
    </div>

    <el-row :gutter="16" class="stat-mini-grid">
      <el-col :xs="12" :sm="8" :lg="4" v-for="stat in stats" :key="stat.key">
        <div class="stat-mini-card" :class="stat.tone">
          <div class="stat-mini-value">{{ stat.value }}</div>
          <div class="stat-mini-label">
            <span v-if="stat.tone" class="dot"></span>{{ stat.label }}
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 待办事项 / 工作任务 -->
    <el-row :gutter="16">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="content-card">
          <div slot="header" class="card-header">
            <i class="el-icon-s-order card-header-icon"></i> 待办事项
            <span class="card-count">{{ items.todo.length }}</span>
          </div>
          <ul class="item-list" v-if="items.todo.length">
            <li v-for="it in items.todo.slice(0, 5)" :key="it.id" @click="openItem(it)">
              <span class="item-text">{{ it.title }}</span>
              <span class="item-project">{{ it.group_id ? '项目组 #' + it.group_id : '个人' }}</span>
              <span class="item-status" :class="`tag-${it.status}`">{{ statusText[it.status] }}</span>
            </li>
          </ul>
          <div v-else class="item-empty">暂无待办事项</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="content-card">
          <div slot="header" class="card-header">
            <i class="el-icon-s-claim card-header-icon"></i> 工作任务
            <span class="card-count">{{ items.task.length }}</span>
          </div>
          <ul class="item-list" v-if="items.task.length">
            <li v-for="it in items.task.slice(0, 5)" :key="it.id" @click="openItem(it)">
              <span class="item-text">{{ it.title }}</span>
              <span class="item-project">{{ it.group_id ? '项目组 #' + it.group_id : '个人' }}</span>
              <span class="item-status" :class="`tag-${it.status}`">{{ statusText[it.status] }}</span>
            </li>
          </ul>
          <div v-else class="item-empty">暂无工作任务</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 需求清单 / 备忘录 -->
    <el-row :gutter="16">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="content-card">
          <div slot="header" class="card-header">
            <i class="el-icon-folder card-header-icon"></i> 需求清单
            <span class="card-count">{{ items.requirement.length }}</span>
          </div>
          <ul class="item-list" v-if="items.requirement.length">
            <li v-for="it in items.requirement.slice(0, 5)" :key="it.id" @click="openItem(it)">
              <span class="item-text">{{ it.title }}</span>
              <span class="item-project">{{ it.group_id ? '项目组 #' + it.group_id : '个人' }}</span>
              <span class="item-status" :class="`tag-${it.status}`">{{ statusText[it.status] }}</span>
            </li>
          </ul>
          <div v-else class="item-empty">暂无需求清单</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <NotePad />
      </el-col>
    </el-row>
  </div>
</template>

<script>
import NotePad from '@/views/work/NotePad'
import { workItemMine, workItemList } from '@/api/workItem'

export default {
  name: 'WorkbenchPage',
  components: { NotePad },
  data () {
    return {
      loading: false,
      items: { todo: [], task: [], requirement: [] },
      noteCount: 0,
      statusText: { pending: '待处理', in_progress: '进行中', done: '已完成', closed: '已关闭' }
    }
  },
  computed: {
    orgId () { return this.$store.getters.orgId },
    stats () {
      return [
        { key: 'todo', label: '待办事项', value: this.items.todo.length, tone: 'degraded' },
        { key: 'task', label: '工作任务', value: this.items.task.length, tone: 'info' },
        { key: 'req', label: '需求清单', value: this.items.requirement.length, tone: '' },
        { key: 'note', label: '备忘录', value: this.noteCount, tone: 'info' }
      ]
    }
  },
  created () {
    this.loadSummary()
  },
  methods: {
    loadSummary () {
      const types = ['todo', 'task', 'requirement']
      Promise.all(types.map(t => workItemMine(this.orgId, t, 1000).then(res => {
        this.items[t] = res.data || []
      }).catch(() => { this.items[t] = [] })))
      workItemList(this.orgId, 0, { type: 'note', pagesize: 1 }).then(res => {
        this.noteCount = Number(res.data.total) || 0
      }).catch(() => { this.noteCount = 0 })
    },
    openItem (it) {
      const name = { todo: 'WorkTodoDetail', task: 'WorkTaskDetail', requirement: 'WorkRequirementDetail' }[it.type]
      if (name) {
        this.$router.push({
          name,
          params: { groupId: String(it.group_id), id: it.id }
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.page-head {
  margin: 20px 20px 4px;
  .page-title { margin: 0; font-size: 20px; color: rgba(0, 0, 0, 0.755); }
  .page-subtitle { margin-left: 10px; font-size: 13px; color: #909399; }
}

.workbench-page { padding: 12px; }
.stat-mini-grid { margin: 16px 4px; }
.stat-mini-card {
  background: #fff; border-radius: 6px; padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); border-left: 3px solid #e4e7ed;
  transition: box-shadow .2s;
  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,.10); }
  &.info { border-left-color: #409eff; }
  &.healthy { border-left-color: #67c23a; }
  &.degraded { border-left-color: #e6a23c; }
  .stat-mini-value { font-size: 26px; font-weight: 700; color: #303133; line-height: 1.2; }
  .stat-mini-label {
    margin-top: 6px; font-size: 13px; color: #909399;
    .dot {
      display: inline-block; width: 7px; height: 7px;
      border-radius: 50%; margin-right: 5px; vertical-align: middle;
    }
  }
  &.info .stat-mini-label .dot { background: #409eff; }
  &.healthy .stat-mini-label .dot { background: #67c23a; }
  &.degraded .stat-mini-label .dot { background: #e6a23c; }
}

.content-card {
  border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06); margin-bottom: 16px;
  ::v-deep .el-card__header { padding: 14px 20px; border-bottom: 1px solid #ebeef5; background: #fafbfc; }
  ::v-deep .el-card__body { padding: 8px 20px 20px; }
}
.card-header {
  display: flex; align-items: center;
  font-size: 15px; font-weight: 600; color: #303133;
  .card-header-icon { margin-right: 8px; color: #409eff; font-size: 16px; }
  .card-count { margin-left: 8px; color: #909399; font-size: 13px; font-weight: 400; &::before { content: '('; } &::after { content: ')'; } }
}

.item-list { list-style: none; margin: 0; padding: 0; }
.item-list li {
  display: flex; align-items: center; gap: 10px; padding: 9px 0;
  border-bottom: 1px solid #f2f3f5; font-size: 13px; cursor: pointer;
  &:last-child { border-bottom: none; }
  &:hover .item-text { color: #409eff; text-decoration: underline; }
}
.item-text { flex: 1; color: #303133; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-project { color: #c0c4cc; font-size: 12px; flex: none; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-status { font-size: 12px; padding: 0 8px; border-radius: 10px; line-height: 20px; flex: none; }
.tag-pending { background: #fdf6ec; color: #e6a23c; }
.tag-in_progress { background: #ecf5ff; color: #409eff; }
.tag-done { background: #f0f9eb; color: #67c23a; }
.tag-closed { background: #f4f4f5; color: #909399; }
.item-empty { padding: 14px 0; font-size: 13px; color: #909399; }
</style>
