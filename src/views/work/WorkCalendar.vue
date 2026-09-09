<template>
  <div class="project-container work-calendar">
    <div class="page-head">
      <h2 class="page-title">日历</h2>
      <span class="page-subtitle">按截止时间查看项目协作条目</span>
    </div>

    <el-card shadow="never" class="content-card">
      <div slot="header" class="card-header">
        <i class="el-icon-date card-header-icon"></i> 截止时间分布
        <div class="card-header-actions">
          <el-select v-model="filterType" size="small" placeholder="全部类型" clearable @change="fetch">
            <el-option label="待办事项" value="todo" />
            <el-option label="工作任务" value="task" />
            <el-option label="需求清单" value="requirement" />
          </el-select>
        </div>
      </div>

      <el-calendar v-model="picked" @current-change="onMonthChange">
        <template slot="dateCell" slot-scope="{ data }">
          <div class="cal-cell" @click="onCellClick(data)">
            <div class="cal-day">{{ data.day.split('-').slice(2).join('') }}</div>
            <div class="cal-items">
              <div
                v-for="item in itemsByDate[data.day]"
                :key="item.id"
                class="cal-item"
                :class="`cal-${item.type}`"
                @click.stop="open(item)">
                <span class="cal-dot"></span>{{ item.title }}
              </div>
            </div>
          </div>
        </template>
      </el-calendar>

      <div class="cal-legend">
        <span class="lg lg-todo">待办</span>
        <span class="lg lg-task">任务</span>
        <span class="lg lg-requirement">需求</span>
      </div>
    </el-card>
  </div>
</template>

<script>
import { workItemCalendar } from '@/api/workItem'

export default {
  name: 'WorkCalendarPage',
  data () {
    return {
      picked: new Date(),
      curMonth: new Date(),
      filterType: '',
      loading: false,
      itemsByDate: {}
    }
  },
  computed: {
    orgId () { return this.$store.getters.orgId },
    groupId () { return this.$route.params.groupId },
    isProjectContext () { return !!this.$route.params.projectId }
  },
  created () {
    this.fetch()
  },
  methods: {
    onMonthChange (date) {
      this.curMonth = new Date(date)
      this.fetch()
    },
    fetch () {
      const y = this.curMonth.getFullYear()
      const m = this.curMonth.getMonth()
      const first = new Date(y, m, 1, 0, 0, 0)
      const last = new Date(y, m + 1, 0, 23, 59, 59)
      const start = Math.floor(first.getTime() / 1000)
      const end = Math.floor(last.getTime() / 1000)
      this.loading = true
      workItemCalendar(this.orgId, this.groupId, {
        start,
        end,
        type: this.filterType || undefined
      }).then(res => {
        const map = {}
        ;(res.data || []).forEach(item => {
          const key = this.tsToDay(item.deadline)
          if (!map[key]) map[key] = []
          map[key].push(item)
        })
        this.itemsByDate = map
      }).catch(err => {
        this.$message.error(err.response?.data?.message || err.message || '加载失败')
      }).finally(() => {
        this.loading = false
      })
    },
    tsToDay (ts) {
      const d = new Date(ts * 1000)
      const p = n => (n < 10 ? '0' + n : n)
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    },
    open (item) {
      const names = { todo: 'WorkTodoDetail', task: 'WorkTaskDetail', requirement: 'WorkRequirementDetail' }
      const projectNames = { todo: 'ProjectWorkTodoDetail', task: 'ProjectWorkTaskDetail', requirement: 'ProjectWorkRequirementDetail' }
      const name = (this.isProjectContext ? projectNames : names)[item.type]
      if (name) {
        this.$router.push({ name, params: { groupId: this.groupId, id: item.id } })
      }
    },
    onCellClick () {}
  }
}
</script>

<style lang="scss" scoped>
.work-calendar { padding: 12px; }
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
.cal-cell { min-height: 78px; }
.cal-day { font-size: 12px; color: #909399; margin-bottom: 4px; }
.cal-items { display: flex; flex-direction: column; gap: 2px; }
.cal-item {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; line-height: 18px; padding: 0 4px; border-radius: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
  background: #f4f4f5; color: #606266;
}
.cal-item:hover { filter: brightness(0.96); }
.cal-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; }
.cal-todo { background: #ecf5ff; color: #409eff; } .cal-todo .cal-dot { background: #409eff; }
.cal-task { background: #f0f9eb; color: #67c23a; } .cal-task .cal-dot { background: #67c23a; }
.cal-requirement { background: #fdf6ec; color: #e6a23c; } .cal-requirement .cal-dot { background: #e6a23c; }
.cal-legend { margin-top: 10px; display: flex; gap: 16px; font-size: 12px; color: #606266; }
.lg::before {
  content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  margin-right: 5px; vertical-align: middle;
}
.lg-todo::before { background: #409eff; }
.lg-task::before { background: #67c23a; }
.lg-requirement::before { background: #e6a23c; }
</style>
