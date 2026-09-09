<template>
  <div v-loading="loading" class="runtime-observability">
    <div class="toolbar">
      <span class="secondary">{{ section === 'alerts' ? '仅展示当前实例的运行告警' : '仅展示当前实例的运行事件' }}</span>
      <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
    </div>
    <el-table v-if="section === 'alerts'" :data="alerts" size="small" empty-text="当前实例暂无运行告警">
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'resolved' ? 'success' : 'danger'" size="mini">
            {{ row.status === 'resolved' ? '已恢复' : '告警中' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="告警" min-width="210" />
      <el-table-column prop="message" label="详情" min-width="260" show-overflow-tooltip />
      <el-table-column prop="occurrences" label="次数" width="70" align="right" />
      <el-table-column label="最后检测" width="180">
        <template #default="{ row }">{{ dateTime(row.last_seen_at) }}</template>
      </el-table-column>
      <el-table-column prop="notification_error" label="通知状态" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.notification_error || (row.notified_at ? '已发送' : '待触发') }}
        </template>
      </el-table-column>
    </el-table>
    <el-table v-else :data="events" size="small" empty-text="当前实例暂无运行事件">
      <el-table-column prop="event_type" label="类型" width="150" show-overflow-tooltip />
      <el-table-column prop="action" label="动作" width="160" show-overflow-tooltip />
      <el-table-column prop="actor_id" label="对象" min-width="210" show-overflow-tooltip />
      <el-table-column label="详情" min-width="260" show-overflow-tooltip>
        <template #default="{ row }">{{ eventMessage(row) }}</template>
      </el-table-column>
      <el-table-column label="发生时间" width="180">
        <template #default="{ row }">{{ dateTime(row.occurred_at) }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import { projectAlertProfile } from '@/api/project'

export default {
  name: 'RuntimeAlertsEvents',
  props: {
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true },
    runtimeId: { type: [Number, String], required: true },
    section: {
      type: String,
      required: true,
      validator: value => ['alerts', 'events'].includes(value)
    }
  },
  data () {
    return { loading: false, alerts: [], events: [] }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      return projectAlertProfile(this.orgId, this.groupId, this.projectId, this.runtimeId)
        .then(res => {
          this.alerts = res.data.alerts || []
          this.events = res.data.events || []
        })
        .finally(() => { this.loading = false })
    },
    eventMessage (event) {
      const attributes = event.attributes || {}
      return attributes.message || attributes.error || attributes.reason || '-'
    },
    dateTime (timestamp) {
      return timestamp ? new Date(Number(timestamp) * 1000).toLocaleString() : '-'
    }
  }
}
</script>

<style lang="scss" scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.secondary { color: #909399; font-size: 12px; }
</style>
