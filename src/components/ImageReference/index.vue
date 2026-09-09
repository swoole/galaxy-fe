<template>
  <el-popover
    ref="popover"
    placement="top"
    width="520"
    trigger="click"
    popper-class="image-reference-popover"
    @show="loadDetails">
    <div v-loading="loading" class="image-detail-popover">
      <div class="image-detail-popover__title">镜像详情</div>

      <el-descriptions :column="1" size="small">
        <el-descriptions-item label="状态">
          <span>{{ statusLabel }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="节点">
          <span>{{ nodeLabel }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="镜像 URI">
          <span class="image-detail-popover__long-text">{{ normalizedValue || emptyText }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="SHA256">
          <span class="image-detail-popover__long-text">{{ resolvedDigest || '暂未获取' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="镜像 ID">
          <span class="image-detail-popover__long-text">{{ resolvedImageId || '暂未获取' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="镜像大小">
          <span>{{ formatBytes(resolvedSize) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          <span>{{ formatDateTime(resolvedCreatedAt) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="检测时间">
          <span>{{ formatDateTime(detectedCheckedAt) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="缓存状态">
          <span>{{ cacheStatusLabel }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-alert
        v-if="error"
        type="warning"
        :closable="false"
        show-icon
        :title="error" />

      <div v-if="clickable" class="image-detail-popover__actions">
        <el-button type="primary" size="mini" @click="handleAction">查看相关详情</el-button>
      </div>
    </div>

    <span
      slot="reference"
      class="image-reference"
      :class="{ 'has-action': clickable, 'is-compact': compact }"
      :style="{ maxWidth }"
      role="button"
      tabindex="0">
      <i class="el-icon-box image-reference__icon" />
      <span class="image-reference__text">{{ displayValue }}</span>
    </span>
  </el-popover>
</template>

<script>
import { clusterSwarmImageInfo } from '@/api/cluster'
import { imageTag } from '@/utils/helpers'

export default {
  name: 'ImageReference',
  props: {
    value: { type: [String, Number], default: '' },
    clickable: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
    stripDigest: { type: Boolean, default: true },
    maxWidth: { type: String, default: '380px' },
    emptyText: { type: String, default: '-' },
    orgId: { type: [Number, String], default: null },
    clusterId: { type: Number, default: 0 },
    nodeId: { type: String, default: '' },
    nodeName: { type: String, default: '' },
    digest: { type: String, default: '' },
    imageId: { type: String, default: '' },
    size: { type: [Number, String], default: 0 },
    createdAt: { type: [Number, String], default: 0 },
    pulled: { type: Boolean, default: null }
  },
  data () {
    return {
      loading: false,
      loaded: false,
      detectedPulled: null,
      detectedDigest: '',
      detectedImageId: '',
      detectedSize: 0,
      detectedCreatedAt: 0,
      detectedCheckedAt: 0,
      detectedCacheStatus: '',
      detectedNodeName: '',
      error: ''
    }
  },
  computed: {
    normalizedValue () {
      return String(this.value || '').trim()
    },
    displayValue () {
      if (!this.normalizedValue) return this.emptyText
      return this.stripDigest ? imageTag(this.normalizedValue) : this.normalizedValue
    },
    hasNodeContext () {
      return Number(this.orgId || 0) > 0 && Number(this.clusterId || 0) > 0
    },
    resolvedPulled () {
      return this.detectedPulled !== null ? this.detectedPulled : this.pulled
    },
    resolvedDigest () {
      return this.detectedDigest || this.digestFromReference || this.digest
    },
    digestFromReference () {
      const match = this.normalizedValue.match(/@(sha256:[a-f0-9]{64})$/i)
      return match ? match[1] : ''
    },
    resolvedImageId () {
      return this.detectedImageId || this.imageId
    },
    resolvedSize () {
      return Number(this.detectedSize || this.size || 0)
    },
    resolvedCreatedAt () {
      return Number(this.detectedCreatedAt || this.createdAt || 0)
    },
    nodeLabel () {
      if (this.detectedNodeName || this.nodeName) return this.detectedNodeName || this.nodeName
      if (this.hasNodeContext) return this.nodeId ? this.shortId(this.nodeId) : '默认 Manager'
      return '未指定节点缓存'
    },
    statusLabel () {
      if (this.error) return '检测失败'
      if (this.resolvedPulled === true) return '已拉取'
      if (this.resolvedPulled === false) return '未拉取'
      return this.hasNodeContext ? '待检测' : '未检测'
    },
    cacheStatusLabel () {
      if (!this.hasNodeContext) return '未使用节点缓存'
      if (this.detectedCacheStatus === 'ready') return '正常'
      if (this.detectedCacheStatus === 'stale') return '等待后台刷新'
      return '正在生成'
    }
  },
  watch: {
    value: 'resetDetection',
    nodeId: 'resetDetection',
    clusterId: 'resetDetection'
  },
  methods: {
    loadDetails () {
      if (this.loaded || !this.hasNodeContext || !this.normalizedValue) return
      this.loading = true
      this.error = ''
      clusterSwarmImageInfo(
        Number(this.orgId),
        Number(this.clusterId),
        this.normalizedValue,
        this.nodeId
      ).then(res => {
        const result = res.data || {}
        const matched = result.image || null
        this.detectedPulled = typeof result.pulled === 'boolean' ? result.pulled : null
        this.detectedCheckedAt = Number(result.refreshed_at || 0)
        this.detectedCacheStatus = String(result.cache_status || '')
        this.detectedNodeName = String(result.node_hostname || '')
        if (!matched) {
          this.loaded = this.detectedPulled !== null && this.detectedCacheStatus === 'ready'
          return
        }
        this.detectedDigest = this.firstDigest(matched)
        this.detectedImageId = String(matched.id || '')
        this.detectedSize = Number(matched.size || 0)
        this.detectedCreatedAt = Number(matched.created || 0)
        this.detectedNodeName = String(matched.node_hostname || result.node_hostname || '')
        this.loaded = this.detectedCacheStatus === 'ready'
      }).catch(err => {
        this.error = typeof err === 'string'
          ? err
          : (err.response?.data?.msg || err.message || '无法读取节点镜像状态')
      }).finally(() => {
        this.loading = false
      })
    },
    firstDigest (image) {
      const value = String((image.repo_digests || [])[0] || '')
      const at = value.lastIndexOf('@')
      return at >= 0 ? value.slice(at + 1) : value
    },
    resetDetection () {
      this.loaded = false
      this.detectedPulled = null
      this.detectedDigest = ''
      this.detectedImageId = ''
      this.detectedSize = 0
      this.detectedCreatedAt = 0
      this.detectedCheckedAt = 0
      this.detectedCacheStatus = ''
      this.detectedNodeName = ''
      this.error = ''
    },
    handleAction () {
      this.$refs.popover.doClose()
      this.$emit('click')
    },
    shortId (value) {
      return String(value || '').replace(/^sha256:/, '').slice(0, 12)
    },
    formatBytes (value) {
      const bytes = Number(value || 0)
      if (!bytes) return '暂未获取'
      const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
      const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
      return `${(bytes / Math.pow(1024, index)).toFixed(index ? 2 : 0)} ${units[index]}`
    },
    formatDateTime (value) {
      if (!value) return '暂未获取'
      const date = new Date(Number(value) * 1000)
      return Number.isNaN(date.getTime()) ? '暂未获取' : date.toLocaleString('zh-CN', { hour12: false })
    }
  }
}
</script>

<style lang="scss" scoped>
.image-reference {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  padding: 4px 8px;
  border: 1px solid #dfe6ee;
  border-radius: 5px;
  background: #f5f7fa;
  color: #4b5563;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 18px;
  vertical-align: middle;
  cursor: pointer;
  &:hover, &:focus {
    border-color: #a8c9ed;
    background: #edf5ff;
    outline: none;
  }
}
.image-reference__icon {
  flex: 0 0 auto;
  margin-right: 5px;
  color: #7b8ba1;
  font-size: 13px;
}
.image-reference__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.image-reference.is-compact {
  padding: 2px 6px;
  line-height: 16px;
}
.image-reference.has-action {
  color: #337ecc;
}
.image-detail-popover__title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
}
.image-detail-popover__long-text {
  display: inline-block;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-all;
  white-space: normal;
}
.image-detail-popover__actions {
  margin-top: 12px;
  text-align: right;
}
</style>
