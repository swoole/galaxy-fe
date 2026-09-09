<template>
  <el-dialog
    :title="title"
    :visible.sync="visible"
    width="900px"
    @opened="onOpened">
    <div v-loading="loading" class="log-viewer">
      <div class="log-toolbar">
        <span class="log-info">最近 {{ tail }} 行</span>
        <div>
          <el-radio-group v-model="tail" size="mini" @change="fetchLogs">
            <el-radio-button :label="100">100</el-radio-button>
            <el-radio-button :label="500">500</el-radio-button>
            <el-radio-button :label="1000">1000</el-radio-button>
          </el-radio-group>
          <el-button size="mini" icon="el-icon-refresh" :loading="loading" @click="fetchLogs" style="margin-left:8px">刷新</el-button>
        </div>
      </div>
      <pre class="log-content" v-text="logs || '(无输出)'"></pre>
    </div>
    <span slot="footer" class="dialog-footer">
      <el-button @click="visible = false">关闭</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { clusterSwarmContainerLogs, clusterSwarmServiceLogs } from '@/api/cluster'

export default {
  name: 'SwarmLogViewer',
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    scope: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      visible: false,
      loading: false,
      logs: '',
      tail: 100,
      title: '',
      mode: 'container', // 'container' | 'service'
      targetId: '',
      targetNodeId: '',
      targetClusterId: null
    }
  },
  methods: {
    openContainer (container) {
      this.mode = 'container'
      this.targetId = container.id
      this.targetNodeId = container.node_id || ''
      this.targetClusterId = Number(container.cluster_id || this.clusterId)
      this.title = (container.name || container.id) + ' 日志'
      this.tail = 100
      this.logs = ''
      this.visible = true
    },
    openService (service) {
      this.mode = 'service'
      this.targetId = service.id
      this.targetNodeId = ''
      this.targetClusterId = Number(service.cluster_id || this.clusterId)
      this.title = (service.name || service.id) + ' 日志'
      this.tail = 100
      this.logs = ''
      this.visible = true
    },
    onOpened () {
      this.fetchLogs()
    },
    fetchLogs () {
      if (!this.targetId) return
      this.loading = true
      let fetch
      if (this.mode === 'service') {
        fetch = clusterSwarmServiceLogs(this.orgId, this.targetClusterId || this.clusterId, this.targetId, this.tail, this.scope)
      } else {
        fetch = clusterSwarmContainerLogs(this.orgId, this.targetClusterId || this.clusterId, this.targetId, this.tail, {
          ...this.scope,
          nodeId: this.targetNodeId || this.scope.nodeId
        })
      }
      fetch.then(res => {
        this.logs = res.data.logs || ''
      }).finally(() => {
        this.loading = false
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.log-viewer {
  min-height: 300px;
}
.log-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
  .log-info { font-size: 13px; color: #909399; }
}
.log-content {
  background: #1e1e1e; color: #d4d4d4;
  padding: 14px; border-radius: 4px;
  font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
  font-size: 12px; line-height: 1.6;
  max-height: 500px; overflow: auto;
  white-space: pre-wrap; word-break: break-all;
  margin: 0;
}
</style>
