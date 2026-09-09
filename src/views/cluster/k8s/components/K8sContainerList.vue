<template>
  <div class="k8s-container-list">
    <el-table :data="rows" border stripe size="small" empty-text="该 Pod 没有容器">
      <el-table-column label="容器名称" min-width="200">
        <template #default="{ row }">
          <strong>{{ row.name }}</strong>
          <div class="cell-id mono">{{ row.containerId || '' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="镜像" min-width="280" show-overflow-tooltip>
        <template #default="{ row }">
          <image-reference :value="row.image" :org-id="orgId" :cluster-id="clusterId" compact />
        </template>
      </el-table-column>
      <el-table-column label="状态" min-width="220">
        <template #default="{ row }">
          <el-tag size="small" :type="row.ready ? 'success' : 'danger'" style="margin-right: 6px">
            {{ row.ready ? 'Ready' : 'NotReady' }}
          </el-tag>
          <el-tag size="small" :type="phaseType(row.phase)">{{ phaseLabel(row) }}</el-tag>
          <div v-if="row.detail" class="cell-sub">{{ row.detail }}</div>
        </template>
      </el-table-column>
      <el-table-column label="重启次数" prop="restartCount" width="100" align="center" />
      <el-table-column label="Age" width="130" align="center">
        <template #default="{ row }">{{ containerAge(row) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="text" size="small" icon="el-icon-document" @click="$emit('view-logs', row.name)">日志</el-button>
          <el-button
            type="text"
            size="small"
            icon="el-icon-monitor"
            :disabled="row.phase !== 'running'"
            @click="$emit('open-terminal', row.name)">终端</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import ImageReference from '@/components/ImageReference'
import { formatTimeDiff } from '@/utils/helpers'

export default {
  name: 'K8sContainerList',
  components: { ImageReference },
  props: {
    pod: { type: Object, required: true },
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true }
  },
  data () {
    return {
      now: Math.floor(Date.now() / 1000),
      ageTimer: null
    }
  },
  computed: {
    rows () {
      const specContainers = (this.pod.spec && this.pod.spec.containers) || []
      const statuses = {}
      for (const cs of ((this.pod.status && this.pod.status.containerStatuses) || [])) {
        statuses[cs.name] = cs
      }
      return specContainers.map(c => {
        const st = statuses[c.name] || {}
        const state = st.state || {}
        let phase = 'waiting'
        let detail = ''
        let startedAt = ''
        if (state.running) {
          phase = 'running'
          startedAt = state.running.startedAt || ''
        } else if (state.waiting) {
          phase = 'waiting'
          detail = (state.waiting.reason || '') + (state.waiting.message ? '：' + state.waiting.message : '')
        } else if (state.terminated) {
          phase = 'terminated'
          detail = state.terminated.reason || ''
        }
        return {
          name: c.name,
          image: c.image,
          containerId: (st.containerID || '').replace(/^docker:\/\//, '').replace(/^containerd:\/\//, '') || '',
          ready: !!st.ready,
          restartCount: st.restartCount || 0,
          phase,
          detail,
          startedAt
        }
      })
    }
  },
  created () {
    this.ageTimer = window.setInterval(() => {
      this.now = Math.floor(Date.now() / 1000)
    }, 30000)
  },
  beforeDestroy () {
    window.clearInterval(this.ageTimer)
  },
  methods: {
    phaseType (phase) {
      if (phase === 'running') return 'success'
      if (phase === 'waiting') return 'warning'
      return 'info'
    },
    phaseLabel (row) {
      if (row.phase === 'running') return '运行中'
      if (row.phase === 'waiting') return '等待中'
      if (row.phase === 'terminated') return '已终止'
      return row.phase
    },
    containerAge (row) {
      if (row.phase !== 'running' || !row.startedAt) return '-'
      const startedAt = Math.floor(new Date(row.startedAt).getTime() / 1000)
      if (!Number.isFinite(startedAt)) return '-'
      return formatTimeDiff(Math.max(1, this.now - startedAt), 2)
    }
  }
}
</script>

<style lang="scss" scoped>
.k8s-container-list { margin-top: 4px; }
.cell-id { margin-top: 3px; color: #909399; font-size: 12px; }
.cell-sub { margin-top: 2px; color: #909399; font-size: 12px; }
</style>
