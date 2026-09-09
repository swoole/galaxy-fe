<template>
  <el-tabs v-model="activeTabEnv">
    <template v-if="groups.length">
      <el-tab-pane v-for="group in groups" :key="group.env.id" :name="`${group.env.id}-env`">
        <template #label><env-name :env="group.env" />（{{ group.data.length }}）</template>
        <el-row :gutter="20" class="runtime-list">
          <el-col v-for="runtime in group.data" :key="runtime.id" :span="12">
            <div class="runtime-card">
              <div class="runtime-title">
                <router-link :to="{ name: 'ProjectInstance', params: { groupId: runtime.group.alias || runtime.group_id, projectId: runtime.project.alias || runtime.project_id }, query: { runtime_id: runtime.id } }">
                  <el-link type="primary"><slot name="title" :runtime="runtime">{{ runtime.name }}</slot></el-link>
                </router-link>
                <el-tag size="mini" :type="statusType(runtime.status)">{{ runtime.status || 'unknown' }}</el-tag>
              </div>
              <div class="runtime-meta">Docker Swarm · {{ runtime.cluster ? runtime.cluster.title : '未知集群' }}</div>
              <div class="runtime-meta">副本：{{ runtime.running_count }}/{{ runtime.desired_count }} · 健康状态：{{ runtime.health || '-' }}</div>
              <div v-if="runtime.release" class="runtime-meta">
                <template v-if="runtime.release.version">版本：{{ runtime.release.version }}</template>
                <template v-else>版本：<image-reference :value="runtime.release.image" compact /></template>
              </div>
              <div v-if="runtime.last_error" class="runtime-error">{{ runtime.last_error }}</div>
            </div>
          </el-col>
        </el-row>
      </el-tab-pane>
    </template>
    <div v-else class="desc-content">没有相关实例</div>
  </el-tabs>
</template>

<script>
import EnvName from '@/views/components/EnvName'
import { formatInArrayNumber } from '@/utils/helpers'

export default {
  name: 'SpecialInstance',
  components: { EnvName },
  data () {
    return { activeTabEnv: null, groups: [] }
  },
  methods: {
    formatRuntimes (source, formatted = {}) {
      formatInArrayNumber(source, ['id', 'org_id', 'group_id', 'project_id', 'env_id', 'cluster_id', 'release_id', 'running_count', 'desired_count']).forEach(runtime => {
        const group = formatted[runtime.env_id] || { env: runtime.env, data: [] }
        group.data.push(runtime)
        formatted[runtime.env_id] = group
      })
      this.groups = Object.values(formatted).map(group => ({ ...group, data: group.data.sort((a, b) => a.cluster_id - b.cluster_id) }))
      if (this.groups.length && !this.groups.some(group => `${group.env.id}-env` === this.activeTabEnv)) {
        this.activeTabEnv = `${this.groups[0].env.id}-env`
      }
    },
    statusType (status) {
      return ({ running: 'success', pending: 'warning', deploying: 'warning', failed: 'danger', stopped: 'info' })[status] || 'info'
    }
  }
}
</script>

<style lang="scss" scoped>
.runtime-list { padding: 8px 4px; }
.runtime-card { min-height: 112px; margin-bottom: 16px; padding: 16px; border: 1px solid #ebeef5; border-radius: 6px; }
.runtime-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.runtime-meta { margin-top: 9px; color: #606266; font-size: 13px; }
.runtime-error { margin-top: 9px; color: #f56c6c; font-size: 12px; word-break: break-all; }
.desc-content { padding: 30px; color: #909399; text-align: center; }
</style>
