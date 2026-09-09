<template>
  <div
    class="project-container swarm-images"
    :class="{ 'embedded-resource': embedded }"
    v-loading="loading">
    <breadcrumb v-if="!embedded" :breadcrumb="breadcrumb" :cluster="cluster" />

    <div class="resource-head">
      <div class="resource-summary">
        <div class="stat-mini-card">
          <span class="stat-mini-value">{{ images.length }}</span>
          <span class="stat-mini-label">镜像总数</span>
        </div>
        <div class="stat-mini-card warn">
          <span class="stat-mini-value">{{ danglingCount }}</span>
          <span class="stat-mini-label">悬空镜像</span>
        </div>
        <div class="stat-mini-card">
          <span class="stat-mini-value">{{ totalSize }}</span>
          <span class="stat-mini-label">磁盘占用</span>
        </div>
      </div>

      <div class="resource-toolbar">
        <div class="primary-actions">
          <span class="selection-count">已选 {{ selectedImages.length }} 个</span>
          <el-button
            size="small"
            type="danger"
            plain
            icon="el-icon-delete"
            :disabled="!selectedImages.length"
            @click="batchRemove">批量删除</el-button>
          <el-button size="small" type="primary" icon="el-icon-download" @click="openPull">拉取镜像</el-button>
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
            placeholder="搜索镜像 / 标签 / Digest"
            prefix-icon="el-icon-search"
            class="search-input" />
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>
    </div>

    <el-table
      ref="table"
      :data="filteredImages"
      border
      stripe
      empty-text="当前筛选范围内没有镜像"
      :header-cell-style="headerCellStyle"
      @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column v-if="!fixedNodeId" label="节点" min-width="160" prop="node_hostname" sortable>
        <template #default="{ row }">
          <div class="cell-name">{{ row.node_hostname || shortId(row.node_id) }}</div>
          <div class="cell-id mono">{{ shortId(row.node_id) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="镜像" min-width="300">
        <template #default="{ row }">
          <template v-if="row.repo_tags && row.repo_tags.length">
            <div v-for="tag in row.repo_tags" :key="tag" class="image-tag-row">
              <image-reference
                :value="tag"
                :org-id="orgId"
                :cluster-id="clusterId"
                :node-id="row.node_id || nodeFilter"
                :node-name="row.node_hostname"
                :digest="row.repo_digests && row.repo_digests.length ? row.repo_digests[0].split('@').pop() : ''"
                :image-id="row.id"
                :size="row.size"
                :created-at="row.created"
                :pulled="true"
                compact />
            </div>
          </template>
          <span v-else class="cell-sub mono">{{ shortId(row.id) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Digest" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.repo_digests && row.repo_digests.length" class="digest-text mono">{{ row.repo_digests[0] }}</span>
          <span v-else class="cell-sub">-</span>
        </template>
      </el-table-column>
      <el-table-column label="大小" width="120" align="right">
        <template #default="{ row }">
          <span class="cell-metric">{{ formatBytes(row.size) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="关联容器" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.containers" size="small" type="success">{{ row.containers }}</el-tag>
          <span v-else class="cell-sub">0</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="175">
        <template #default="{ row }">
          <span class="cell-date">{{ formatDate(row.created) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" plain icon="el-icon-video-play" @click="openRun(row)">运行</el-button>
          <el-tooltip
            v-if="row.containers > 0"
            content="该镜像有关联容器，无法删除"
            placement="top">
            <el-button size="small" type="info" plain icon="el-icon-delete" disabled>删除</el-button>
          </el-tooltip>
          <el-popconfirm
            style="margin-left: 8px"
            v-else
            title="确定删除此镜像？"
            confirm-button-text="删除"
            cancel-button-text="取消"
            @confirm="removeImage(row)">
            <el-button slot="reference" size="small" type="danger" plain icon="el-icon-delete">删除</el-button>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      :title="'运行镜像：' + runImageLabel"
      :visible.sync="runDialogVisible"
      width="720px"
      :close-on-click-modal="false"
      @closed="onRunDialogClosed">
      <el-form v-loading="runLoading" :model="runForm" label-width="110px" class="run-form">
        <el-form-item label="服务名称">
          <el-input v-model="runForm.name" placeholder="留空将自动生成" />
        </el-form-item>
        <el-form-item label="副本数">
          <el-input-number v-model="runForm.replicas" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="启动命令">
          <el-input v-model="runForm.command" placeholder="可选，空格分隔，如 /bin/sh -c 'echo hi'" />
        </el-form-item>

        <el-divider>环境变量</el-divider>
        <div v-for="(env, idx) in runForm.env" :key="'env-' + idx" class="kv-row">
          <el-input v-model="env.key" placeholder="变量名" class="kv-key" />
          <el-input v-model="env.value" placeholder="值" class="kv-val" />
          <el-button
            size="small"
            icon="el-icon-delete"
            type="danger"
            plain
            circle
            @click="removeEnv(idx)" />
        </div>
        <el-button size="small" icon="el-icon-plus" @click="addEnv">添加环境变量</el-button>

        <el-divider>端口映射</el-divider>
        <div v-for="(port, idx) in runForm.ports" :key="'port-' + idx" class="kv-row">
          <el-input v-model="port.hostPort" placeholder="主机端口" class="kv-port" />
          <span class="kv-colon">:</span>
          <el-input v-model="port.containerPort" placeholder="容器端口" class="kv-port" />
          <el-select v-model="port.protocol" class="kv-proto">
            <el-option label="tcp" value="tcp" />
            <el-option label="udp" value="udp" />
          </el-select>
          <el-button
            size="small"
            icon="el-icon-delete"
            type="danger"
            plain
            circle
            @click="removePort(idx)" />
        </div>
        <el-button size="small" icon="el-icon-plus" @click="addPort">添加端口映射</el-button>

        <el-divider>目录映射（卷）</el-divider>
        <div v-for="(vol, idx) in runForm.volumes" :key="'vol-' + idx" class="vol-row">
          <el-select v-model="vol.type" class="vol-type">
            <el-option label="bind（主机路径）" value="bind" />
            <el-option label="volume（卷）" value="volume" />
          </el-select>
          <el-input v-model="vol.source" placeholder="宿主机路径 / 卷名" class="vol-src" />
          <span class="kv-colon">:</span>
          <el-input v-model="vol.target" placeholder="容器路径" class="vol-tgt" />
          <el-select v-model="vol.mode" class="vol-mode">
            <el-option label="rw" value="rw" />
            <el-option label="ro" value="ro" />
          </el-select>
          <el-button
            size="small"
            icon="el-icon-delete"
            type="danger"
            plain
            circle
            @click="removeVolume(idx)" />
        </div>
        <el-button size="small" icon="el-icon-plus" @click="addVolume">添加目录映射</el-button>

        <el-divider>高级</el-divider>
        <el-form-item label="网络">
          <el-input v-model="runForm.network" placeholder="可选，如 overlay 网络名" />
        </el-form-item>
        <el-form-item label="重启策略">
          <el-select v-model="runForm.restart" style="width: 180px">
            <el-option label="any（任意退出都重启）" value="any" />
            <el-option label="none（不重启）" value="none" />
            <el-option label="on-failure（失败时重启）" value="on-failure" />
          </el-select>
          <el-input-number
            v-if="runForm.restart === 'on-failure'"
            v-model="runForm.restartMaxAttempts"
            :min="1"
            :max="1000"
            class="restart-attempts"
            controls-position="right" />
        </el-form-item>
        <el-form-item label="资源配置">
          <resource-config-editor
            v-model="runResources"
            :show-reservations="false"
            :max-cpu="1000" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="runDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="runLoading" @click="submitRun">创建并运行</el-button>
      </div>
    </el-dialog>

    <el-dialog
      title="拉取镜像"
      :visible.sync="pullDialogVisible"
      width="680px"
      :close-on-click-modal="false"
      @opened="loadImageSelector">
      <el-form :model="pullForm" label-width="110px" class="pull-form">
        <el-form-item label="目标节点" required>
          <el-input v-if="fixedNodeId" :value="nodeName(fixedNodeId)" disabled />
          <el-select v-else v-model="pullForm.nodeId" placeholder="请选择节点" style="width: 100%">
            <el-option
              v-for="node in onlineNodes"
              :key="node.id"
              :label="node.hostname || shortId(node.id)"
              :value="node.id" />
          </el-select>
        </el-form-item>
        <image-reference-selector
          ref="pull-image-selector"
          v-model="pullForm.image"
          :org-id="orgId"
          :cluster-id="clusterId"
          :node-id="pullForm.nodeId"
          @registry-change="pullForm.registryId = $event" />
        <div class="little-tips pull-scope-tip">镜像只会拉取到所选节点。</div>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="pullDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="pullLoading" icon="el-icon-download" @click="submitPull">拉取</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { clusterSwarmImages, clusterSwarmImageRemove, clusterSwarmImageRun, clusterSwarmImagePull } from '@/api/cluster'
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import ImageReferenceSelector from './components/ImageReferenceSelector.vue'
import ResourceConfigEditor from '@/views/components/ResourceConfigEditor.vue'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'SwarmImages',
  components: { Breadcrumb, ImageReferenceSelector, ResourceConfigEditor },
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
      images: [],
      nodes: [],
      nodeFilter: this.fixedNodeId,
      searchKeyword: '',
      selectedImages: [],
      headerCellStyle: {
        background: '#f8f9fb',
        color: '#303133',
        fontWeight: 600,
        fontSize: '13px'
      },
      runDialogVisible: false,
      runLoading: false,
      runForm: this.emptyRunForm(),
      pullDialogVisible: false,
      pullLoading: false,
      pullForm: { image: '', registryId: 0, nodeId: '' }
    }
  },
  computed: {
    runResources: {
      get () {
        return {
          cpu_limit: this.runForm.cpu,
          memory_limit: this.runForm.memory,
          cpu_reservation: 0,
          memory_reservation: 0
        }
      },
      set (resources) {
        this.runForm.cpu = resources.cpu_limit
        this.runForm.memory = resources.memory_limit
      }
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: this.$route.meta.title, to: '' }
      ]
    },
    totalSize () {
      return this.formatBytes(this.images.reduce((sum, i) => sum + (i.size || 0), 0))
    },
    danglingCount () {
      return this.images.filter(i => !i.repo_tags || i.repo_tags.length === 0 || i.repo_tags[0] === '<none>:<none>').length
    },
    filteredImages () {
      const rows = this.nodeFilter ? this.images.filter(i => i.node_id === this.nodeFilter) : this.images
      const kw = this.searchKeyword.trim().toLowerCase()
      if (!kw) return rows
      return rows.filter(i => {
        const tags = (i.repo_tags || []).join(' ').toLowerCase()
        const digests = (i.repo_digests || []).join(' ').toLowerCase()
        const id = (i.id || '').toLowerCase()
        return tags.includes(kw) || digests.includes(kw) || id.includes(kw)
      })
    },
    runImageLabel () {
      const tag = this.runForm && this.runForm.image
      if (!tag) return ''
      const parts = String(tag).split('/')
      return parts[parts.length - 1]
    },
    onlineNodes () {
      return this.nodes.filter(node => node.agent_online)
    }
  },
  created () {
    this.load()
  },
  methods: {
    emptyRunForm () {
      return {
        image: '',
        name: '',
        replicas: 1,
        command: '',
        env: [],
        ports: [{ hostPort: '', containerPort: '', protocol: 'tcp' }],
        volumes: [{ type: 'bind', source: '', target: '', mode: 'rw' }],
        network: '',
        restart: 'any',
        restartMaxAttempts: 3,
        cpu: 0,
        memory: 0
      }
    },
    load () {
      if (this.fixedNodeId) this.nodeFilter = this.fixedNodeId
      this.loading = true
      clusterSwarmImages(this.orgId, this.clusterId, this.nodeFilter).then(res => {
        this.images = res.data.images || []
        this.nodes = res.data.nodes || []
        this.nodeFilter = res.data.selected_node_id || this.nodeFilter
      }).finally(() => { this.loading = false })
    },
    formatBytes (value) {
      let bytes = Number(value) || 0
      if (bytes <= 0) return '0 B'
      const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
      const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
      bytes /= Math.pow(1024, index)
      return `${bytes.toFixed(index === 0 ? 0 : 2)} ${units[index]}`
    },
    shortId (value) {
      if (!value) return '-'
      return String(value).replace(/^sha256:/, '').slice(0, 12)
    },
    nodeName (nodeId) {
      const node = this.nodes.find(item => item.id === nodeId)
      return node ? `${node.hostname || this.shortId(node.id)} (${this.shortId(node.id)})` : this.shortId(nodeId)
    },
    formatDate (value) {
      if (!value) return '-'
      const date = new Date(value * 1000)
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
    },
    removeImage (row) {
      const imageId = (row.repo_tags && row.repo_tags.length) ? row.repo_tags[0] : row.id
      clusterSwarmImageRemove(this.orgId, this.clusterId, imageId, row.node_id).then(() => {
        this.$message.success('已删除 ' + imageId)
        this.load()
      })
    },
    handleSelectionChange (val) {
      this.selectedImages = val
    },
    batchRemove () {
      if (!this.selectedImages.length) return
      const count = this.selectedImages.length
      this.$confirm(`确定删除选中的 ${count} 个镜像？`, '批量删除', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }).then(() => {
        this.loading = true
        const tasks = this.selectedImages.map(row => {
          const imageId = (row.repo_tags && row.repo_tags.length) ? row.repo_tags[0] : row.id
          return clusterSwarmImageRemove(this.orgId, this.clusterId, imageId, row.node_id)
        })
        Promise.allSettled(tasks).then(results => {
          const failed = results.filter(r => r.status === 'rejected').length
          if (failed === 0) {
            this.$message.success(`已删除 ${count} 个镜像`)
          } else {
            this.$message.warning(`已删除 ${count - failed} 个镜像，${failed} 个失败（可能因有关联容器）`)
          }
          if (this.$refs.table) this.$refs.table.clearSelection()
          this.load()
        })
      }).catch(() => {})
    },
    openRun (row) {
      const tag = (row.repo_tags && row.repo_tags.length) ? row.repo_tags[0] : row.id
      this.runForm = this.emptyRunForm()
      this.runForm.image = tag
      this.runDialogVisible = true
    },
    onRunDialogClosed () {
      this.runForm = this.emptyRunForm()
    },
    addEnv () { this.runForm.env.push({ key: '', value: '' }) },
    removeEnv (idx) { this.runForm.env.splice(idx, 1) },
    addPort () { this.runForm.ports.push({ hostPort: '', containerPort: '', protocol: 'tcp' }) },
    removePort (idx) { this.runForm.ports.splice(idx, 1) },
    addVolume () { this.runForm.volumes.push({ type: 'bind', source: '', target: '', mode: 'rw' }) },
    removeVolume (idx) { this.runForm.volumes.splice(idx, 1) },
    submitRun () {
      const form = this.runForm
      if (!form.image) {
        this.$message.warning('请选择镜像')
        return
      }
      const env = form.env.filter(e => e.key).map(e => `${e.key}=${e.value || ''}`)
      const ports = form.ports
        .filter(p => p.containerPort)
        .map(p => ({
          container_port: Number(p.containerPort),
          host_port: p.hostPort ? Number(p.hostPort) : 0,
          protocol: p.protocol || 'tcp'
        }))
      const volumes = form.volumes
        .filter(v => v.source && v.target)
        .map(v => ({
          type: v.type || 'bind',
          source: v.source,
          target: v.target,
          mode: v.mode || 'rw'
        }))
      const data = {
        image: form.image,
        name: form.name,
        replicas: Number(form.replicas) || 1,
        command: form.command,
        env,
        ports,
        volumes,
        network: form.network,
        restart: form.restart,
        restart_max_attempts: form.restart === 'on-failure' ? (Number(form.restartMaxAttempts) || 0) : 0,
        cpu: Number(form.cpu) || 0,
        memory: Number(form.memory) ? Number(form.memory) * 1024 * 1024 : 0
      }
      this.runLoading = true
      clusterSwarmImageRun(this.orgId, this.clusterId, data).then(res => {
        const d = res.data || {}
        this.$message.success('已创建服务 ' + (d.name || ''))
        this.runDialogVisible = false
        this.load()
      }).catch(err => {
        this.$message.error(typeof err === 'string' ? err : (err.response?.data?.msg || err.message || '运行镜像失败'))
      }).finally(() => {
        this.runLoading = false
      })
    },
    openPull () {
      const defaultNode = this.nodeFilter || (this.onlineNodes[0] && this.onlineNodes[0].id) || ''
      this.pullForm = { image: '', registryId: 0, nodeId: defaultNode }
      this.pullDialogVisible = true
    },
    loadImageSelector () {
      if (this.$refs['pull-image-selector']) this.$refs['pull-image-selector'].load()
    },
    submitPull () {
      const image = this.pullForm.image.trim()
      if (!image) {
        this.$message.warning('请输入镜像名称')
        return
      }
      if (!this.pullForm.nodeId) {
        this.$message.warning('请选择目标节点')
        return
      }
      this.pullLoading = true
      clusterSwarmImagePull(
        this.orgId,
        this.clusterId,
        image,
        this.pullForm.registryId || 0,
        this.pullForm.nodeId
      ).then(() => {
        this.$message.success('镜像 ' + image + ' 拉取成功')
        this.pullDialogVisible = false
        this.load()
      }).catch(err => {
        this.$message.error(typeof err === 'string' ? err : (err.response?.data?.msg || err.message || '拉取失败'))
      }).finally(() => {
        this.pullLoading = false
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
  &.warn { border-left-color: #e6a23c; }
  .stat-mini-value {
    min-width: 0;
    overflow: hidden;
    color: #303133;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
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
  .card-header-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
  .search-input { width: 240px; }
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
.primary-actions {
  flex: 1 1 auto;
  .selection-count {
    flex: none;
    color: #606266;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
}
.filter-actions {
  flex: 0 1 auto;
  margin-left: auto;
  flex-wrap: nowrap;
  .search-input { width: 250px; }
}
@media (max-width: 1100px) {
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

.image-tag-row { margin-bottom: 3px; }
.digest-text { font-size: 12px; color: #606266; }
.cell-sub { color: #909399; font-size: 13px; }
.cell-date { color: #606266; font-size: 13px; }
.cell-metric { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; font-size: 13px; font-weight: 500; color: #303133; }
.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }

.run-form {
  .el-divider { margin: 18px 0 14px; }
  .kv-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .kv-key { width: 200px; }
  .kv-val { flex: 1; }
  .kv-port { width: 130px; }
  .kv-proto { width: 90px; }
  .kv-colon { color: #909399; font-weight: 600; }
  .vol-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .vol-type { width: 170px; }
  .vol-src { flex: 1; }
  .vol-tgt { flex: 1; }
  .vol-mode { width: 80px; }
  .restart-attempts { margin-left: 12px; }
}
</style>
