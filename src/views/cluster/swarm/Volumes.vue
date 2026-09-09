<template>
  <div
    class="project-container swarm-volumes"
    :class="{ 'embedded-resource': embedded }"
    v-loading="loading">
    <breadcrumb v-if="!embedded" :breadcrumb="breadcrumb" :cluster="cluster" />

    <div class="resource-head">
      <div class="resource-summary">
        <div class="stat-mini-card">
          <span class="stat-mini-value">{{ volumes.length }}</span>
          <span class="stat-mini-label">数据卷总数</span>
        </div>
        <div class="stat-mini-card info">
          <span class="stat-mini-value">{{ localCount }}</span>
          <span class="stat-mini-label">Local 驱动</span>
        </div>
        <div class="stat-mini-card warn">
          <span class="stat-mini-value">{{ danglingCount }}</span>
          <span class="stat-mini-label">悬空数据卷</span>
        </div>
      </div>

      <div class="resource-toolbar">
        <div class="primary-actions">
          <el-button size="small" icon="el-icon-plus" type="primary" @click="showCreateDialog">创建卷</el-button>
        </div>
        <div class="filter-actions">
          <el-select
            v-if="!fixedNodeId"
            v-model="nodeFilter"
            size="small"
            class="node-select"
            placeholder="选择节点"
            @change="load">
            <el-option v-for="node in nodes" :key="node.id" :label="node.hostname || shortId(node.id)" :value="node.id" />
          </el-select>
          <el-input
            v-model="searchKeyword"
            size="small"
            clearable
            placeholder="搜索卷名称"
            prefix-icon="el-icon-search"
            class="search-input" />
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>
    </div>

    <el-table
      :data="filteredVolumes"
      border
      stripe
      empty-text="暂无数据卷"
      :header-cell-style="headerCellStyle">
      <el-table-column v-if="!fixedNodeId" label="节点" min-width="170">
        <template #default="{ row }">
          <div class="cell-name">{{ row.node_hostname || shortId(row.node_id) }}</div>
          <div class="cell-sub mono">{{ shortId(row.node_id) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="名称" min-width="240">
        <template #default="{ row }">
          <div class="cell-name">{{ row.name }}</div>
        </template>
      </el-table-column>
      <el-table-column label="Driver" width="130">
        <template #default="{ row }">
          <el-tag size="small" effect="plain" type="info">{{ row.driver }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="关联容器" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.ref_count" size="small" type="success">{{ row.ref_count }}</el-tag>
          <el-tag v-else size="small" type="warning">悬空</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="挂载源" min-width="200">
        <template #default="{ row }">
          <template v-if="row.driver_opts && row.driver_opts.type === 'nfs'">
            <span class="cell-sub">{{ row.driver_opts.device || '-' }}</span>
          </template>
          <template v-else-if="row.driver_opts && Object.keys(row.driver_opts).length">
            <el-tag
              v-for="(val, key) in row.driver_opts"
              :key="key"
              size="small"
              type="info"
              class="label-tag">{{ key }}={{ val }}</el-tag>
          </template>
          <span v-else class="cell-sub">-</span>
        </template>
      </el-table-column>
      <el-table-column label="标签" min-width="200">
        <template #default="{ row }">
          <template v-if="row.labels && Object.keys(row.labels).length">
            <el-tag
              v-for="(val, key) in row.labels"
              :key="key"
              size="small"
              type="info"
              class="label-tag">{{ key }}={{ val }}</el-tag>
          </template>
          <span v-else class="cell-sub">-</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="175">
        <template #default="{ row }">
          <span class="cell-date">{{ formatDate(row.created_at) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{ row }">
          <el-popconfirm
            v-if="row.ref_count > 0"
            :title="'该卷正被 ' + row.ref_count + ' 个容器/服务使用。强制删除可能导致数据丢失，确定继续？'"
            confirm-button-text="强制删除"
            cancel-button-text="取消"
            @confirm="removeVolume(row, true)">
            <el-button slot="reference" size="small" type="warning" plain icon="el-icon-delete">删除</el-button>
          </el-popconfirm>
          <el-popconfirm
            v-else
            title="确定删除此数据卷？此操作不可逆。"
            confirm-button-text="删除"
            cancel-button-text="取消"
            @confirm="removeVolume(row, false)">
            <el-button slot="reference" size="small" type="danger" plain icon="el-icon-delete">删除</el-button>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      title="创建数据卷"
      :visible.sync="createDialogVisible"
      width="620px"
      :close-on-click-modal="false"
      @closed="resetCreateForm">
      <el-form
        ref="createForm"
        :model="createForm"
        :rules="createRules"
        label-width="130px"
        size="small"
        @submit.native.prevent="doCreateVolume">
        <el-form-item label="目标节点" required>
          <el-input v-if="fixedNodeId" :value="nodeName(fixedNodeId)" disabled />
          <el-select v-else v-model="createForm.nodeId" placeholder="请选择节点" style="width: 100%">
            <el-option
              v-for="node in onlineNodes"
              :key="node.id"
              :label="node.hostname || shortId(node.id)"
              :value="node.id" />
          </el-select>
          <div class="form-tip">Local 数据卷只存在于所选节点；NFS 等远程卷仍需在使用它的每个节点创建挂载定义</div>
        </el-form-item>
        <el-form-item label="卷名称" prop="name">
          <el-input v-model.trim="createForm.name" maxlength="64" placeholder="例如 shared-nfs" />
        </el-form-item>

        <el-form-item label="卷类型">
          <el-radio-group v-model="volumeType">
            <el-radio-button label="local">普通本地卷</el-radio-button>
            <el-radio-button label="nfs">NFS 共享存储</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <template v-if="volumeType === 'nfs'">
          <el-form-item label="NFS 服务器地址" prop="nfsServer">
            <el-input v-model.trim="createForm.nfsServer" placeholder="例如 192.168.1.100" />
          </el-form-item>
          <el-form-item label="导出路径" prop="nfsPath">
            <el-input v-model.trim="createForm.nfsPath" placeholder="例如 /exported/shared" />
          </el-form-item>
          <el-form-item label="NFS 版本">
            <el-select v-model="createForm.nfsVersion" placeholder="NFS 协议版本" style="width: 200px">
              <el-option label="NFSv3（默认）" value="3" />
              <el-option label="NFSv4" value="4" />
            </el-select>
          </el-form-item>
          <el-form-item label="挂载选项">
            <el-input v-model.trim="createForm.nfsOptions" placeholder="例如 rw,nolock,soft" />
            <div class="form-tip">额外挂载选项，留空默认使用 rw,nolock,soft</div>
          </el-form-item>

          <el-collapse style="margin-top: 12px">
            <el-collapse-item title="高级选项（生成的 DriverOpts）" name="1">
              <el-input
                type="textarea"
                :rows="6"
                :value="JSON.stringify(computedDriverOpts, null, 2)"
                readonly
                class="mono-textarea" />
            </el-collapse-item>
          </el-collapse>
        </template>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="doCreateVolume">创建</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { clusterSwarmVolumes, clusterSwarmVolumeCreate, clusterSwarmVolumeRemove } from '@/api/cluster'
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'SwarmVolumes',
  components: { Breadcrumb },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true },
    embedded: { type: Boolean, default: false },
    fixedNodeId: { type: String, default: '' }
  },
  data () {
    return {
      loading: false,
      volumes: [],
      nodes: [],
      nodeFilter: this.fixedNodeId,
      searchKeyword: '',
      headerCellStyle: {
        background: '#f8f9fb',
        color: '#303133',
        fontWeight: 600,
        fontSize: '13px'
      },
      createDialogVisible: false,
      creating: false,
      volumeType: 'local',
      createForm: {
        nodeId: '',
        name: '',
        nfsServer: '',
        nfsPath: '',
        nfsVersion: '3',
        nfsOptions: ''
      },
      createRules: {
        name: [
          { required: true, message: '请输入卷名称', trigger: 'blur' },
          { pattern: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/, message: '只能包含字母、数字、下划线、点号、连字符，以字母或数字开头', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: this.$route.meta.title, to: '' }
      ]
    },
    localCount () {
      return this.volumes.filter(v => v.driver === 'local').length
    },
    danglingCount () {
      return this.volumes.filter(v => !v.ref_count).length
    },
    filteredVolumes () {
      const rows = this.nodeFilter ? this.volumes.filter(v => v.node_id === this.nodeFilter) : this.volumes
      const kw = this.searchKeyword.trim().toLowerCase()
      if (!kw) return rows
      return rows.filter(v => (v.name || '').toLowerCase().includes(kw))
    },
    computedDriverOpts () {
      if (this.volumeType !== 'nfs') return {}
      const mountOpts = this.createForm.nfsOptions || 'rw,nolock,soft'
      const opts = {
        type: 'nfs',
        o: 'addr=' + this.createForm.nfsServer + ',' + mountOpts,
        device: ':' + this.createForm.nfsPath
      }
      if (this.createForm.nfsVersion === '4') {
        opts.o = 'nfsvers=4,' + opts.o
      }
      return opts
    },
    onlineNodes () {
      return this.nodes.filter(node => node.agent_online)
    }
  },
  created () {
    this.load()
  },
  methods: {
    shortId (value, length = 12) {
      return value ? String(value).slice(0, length) : '-'
    },
    nodeName (nodeId) {
      const node = this.nodes.find(item => item.id === nodeId)
      return node ? `${node.hostname || this.shortId(node.id)} (${this.shortId(node.id)})` : this.shortId(nodeId)
    },
    load () {
      if (this.fixedNodeId) this.nodeFilter = this.fixedNodeId
      this.loading = true
      clusterSwarmVolumes(this.orgId, this.clusterId, this.nodeFilter).then(res => {
        this.volumes = res.data.volumes || []
        this.nodes = res.data.nodes || []
        this.nodeFilter = res.data.selected_node_id || this.nodeFilter
      }).finally(() => { this.loading = false })
    },
    formatDate (value) {
      if (!value) return '-'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
    },
    showCreateDialog () {
      this.volumeType = 'local'
      this.createForm = {
        nodeId: this.nodeFilter || (this.onlineNodes[0] && this.onlineNodes[0].id) || '',
        name: '',
        nfsServer: '',
        nfsPath: '',
        nfsVersion: '3',
        nfsOptions: ''
      }
      this.$nextTick(() => {
        this.$refs.createForm && this.$refs.createForm.clearValidate()
      })
      this.createDialogVisible = true
    },
    resetCreateForm () {
      this.volumeType = 'local'
      this.createForm = {
        nodeId: '',
        name: '',
        nfsServer: '',
        nfsPath: '',
        nfsVersion: '3',
        nfsOptions: ''
      }
      this.$nextTick(() => {
        this.$refs.createForm && this.$refs.createForm.clearValidate()
      })
    },
    doCreateVolume () {
      this.$refs.createForm.validate((valid) => {
        if (!valid) return
        if (!this.createForm.nodeId) {
          this.$message.error('请选择目标节点')
          return
        }
        if (this.volumeType === 'nfs' && !this.createForm.nfsServer) {
          this.$message.error('请输入 NFS 服务器地址')
          return
        }
        if (this.volumeType === 'nfs' && !this.createForm.nfsPath) {
          this.$message.error('请输入导出路径')
          return
        }
        this.creating = true
        clusterSwarmVolumeCreate(this.orgId, this.clusterId, {
          name: this.createForm.name,
          driver: 'local',
          driverOpts: this.computedDriverOpts,
          nodeId: this.createForm.nodeId
        }).then(res => {
          this.$message.success('数据卷 ' + res.data.volume.name + ' 创建成功')
          this.createDialogVisible = false
          this.load()
        }).catch(err => {
          this.$message.error(err.response?.data?.message || err.message || '创建失败')
        }).finally(() => {
          this.creating = false
        })
      })
    },
    removeVolume (row, force = false) {
      clusterSwarmVolumeRemove(this.orgId, this.clusterId, row.name, force, row.node_id).then(() => {
        this.$message.success('已删除数据卷 ' + row.name)
        this.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.message || err.message || '删除失败')
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.resource-head { padding: 6px 20px 14px; }
.resource-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 200px));
  gap: 10px;
}
.stat-mini-card {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  padding: 10px 14px;
  background: #f7f8fa;
  border: 1px solid #ebeef5;
  border-left: 3px solid #dcdfe6;
  border-radius: 6px;
  &.info { border-left-color: #409eff; }
  &.warn { border-left-color: #e6a23c; }
  .stat-mini-value { color: #303133; font-size: 20px; font-weight: 700; line-height: 1.2; white-space: nowrap; }
  .stat-mini-label { flex: none; color: #909399; font-size: 13px; white-space: nowrap; }
}

.content-card {
  border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06);
  ::v-deep .el-card__header { padding: 14px 20px; border-bottom: 1px solid #ebeef5; background: #fafbfc; }
  ::v-deep .el-card__body { padding: 0; }
}
.content-card.embedded-card {
  width: 100%;
  margin: 0 !important;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
  ::v-deep .el-card__header {
    padding: 4px 0 12px;
    border-bottom: 0;
    background: transparent;
  }
  ::v-deep .el-card__body { padding: 0; }
  .resource-head { padding: 4px 0 14px; }
}
.embedded-resource {
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  ::v-deep .el-table { width: 100% !important; }
}
.card-header {
  display: flex; align-items: center;
  font-size: 15px; font-weight: 600; color: #303133;
  .card-header-icon { margin-right: 8px; color: #409eff; font-size: 16px; }
  .card-count { margin-left: 8px; color: #909399; font-size: 13px; font-weight: 400; &::before { content: '('; } &::after { content: ')'; } }
  .card-header-actions { margin-left: auto; display: flex; gap: 8px; }
  .search-input { width: 220px; }
  .node-select { width: 180px; }
}
.resource-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
.primary-actions,
.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
  ::v-deep .el-button + .el-button { margin-left: 0; }
}
.primary-actions { flex: 1 1 auto; }
.filter-actions {
  flex: 0 1 auto;
  margin-left: auto;
  flex-wrap: nowrap;
  .search-input { width: 250px; }
}
@media (max-width: 900px) {
  .resource-toolbar { align-items: flex-start; flex-direction: column; }
  .filter-actions {
    width: 100%;
    margin-left: 0;
    .search-input { flex: 1; width: auto; }
  }
}
@media (max-width: 720px) {
  .resource-head { padding: 12px; }
  .content-card.embedded-card .resource-head { padding: 4px 0 12px; }
  .resource-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .stat-mini-card {
    justify-content: center;
    gap: 5px;
    padding: 9px 6px;
    .stat-mini-value { font-size: 17px; }
    .stat-mini-label { font-size: 12px; }
  }
}

::v-deep .el-table {
  margin-top: 0;
  th { padding: 11px 0; font-size: 13px; letter-spacing: .3px; }
  td { padding: 10px 0; font-size: 13px; }
  .el-table__empty-text { font-size: 14px; color: #909399; }
}
::v-deep .el-table__body tr:hover > td { background: #f5f7fa; }

.cell-name { font-weight: 600; color: #303133; font-size: 13px; }
.cell-sub { color: #909399; font-size: 13px; }
.cell-date { color: #606266; font-size: 13px; }

.label-tag { margin: 1px 3px 1px 0; }

.form-tip {
  font-size: 12px; color: #909399; margin-top: 4px;
}

.mono-textarea {
  ::v-deep textarea { font-family: 'Menlo', 'Consolas', monospace; font-size: 12px; }
}
.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }
</style>
