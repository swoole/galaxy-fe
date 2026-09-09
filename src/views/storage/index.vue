<template>
  <div class="project-container storage-page" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="content-card">
      <!-- 存储桶列表 -->
      <div v-if="currentView === 'buckets'">
        <div class="toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索名称或 Bucket..."
              prefix-icon="el-icon-search"
              clearable
              size="small"
              class="search-input" />
          </div>
          <div class="toolbar-right">
            <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="loadBuckets">刷新</el-button>
            <el-button size="small" type="primary" icon="el-icon-plus" @click="openBucketDialog(null)">添加存储桶</el-button>
          </div>
        </div>

        <el-table :data="filteredBuckets" stripe empty-text="暂无存储桶" style="width: 100%">
          <el-table-column label="名称" min-width="160">
            <template #default="{ row }">
              <a class="bucket-link" @click="openBucketFiles(row)">
                {{ row.title }}
                <el-tag v-if="row.is_default" size="mini" type="success" effect="plain" class="default-badge">默认</el-tag>
              </a>
            </template>
          </el-table-column>
          <el-table-column label="云厂商" width="150">
            <template #default="{ row }">
              <span class="cloud-provider">
                <svg-icon :icon-class="providerIcon(row.provider)" class="cloud-provider-icon" />
              </span>
            </template>
          </el-table-column>
          <el-table-column label="Bucket" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ row.bucket }}</template>
          </el-table-column>
          <el-table-column label="Region" width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.region || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="240" align="center">
            <template #default="{ row }">
              <el-button v-if="!row.is_default" type="text" size="small" icon="el-icon-star-off" @click="setDefault(row)">设为默认</el-button>
              <el-button type="text" size="small" icon="el-icon-edit" @click="openBucketDialog(row)">编辑</el-button>
              <el-popconfirm title="确定删除该存储桶？" @confirm="deleteBucket(row)">
                <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 文件管理 -->
      <div v-else class="file-browser" ref="fileBrowser">
        <div class="file-toolbar" ref="fileToolbar">
          <el-button size="small" icon="el-icon-arrow-left" @click="backToBuckets">返回</el-button>
          <el-button size="small" icon="el-icon-refresh" :loading="filesLoading" @click="loadFiles">刷新</el-button>
          <el-button size="small" icon="el-icon-folder-add" @click="createDirectory">新建目录</el-button>
          <el-button size="small" icon="el-icon-upload2" :loading="uploading" @click="triggerUpload">上传文件</el-button>
          <input ref="fileInput" type="file" hidden @change="handleUpload" />
          <div class="file-breadcrumb">
            <a class="breadcrumb-link" @click="backToBuckets">{{ selectedBucket.title }}</a>
            <span class="breadcrumb-sep">/</span>
            <a class="breadcrumb-link" :class="{ current: pathSegments.length === 0 }" @click="navigateToPath(-1)">根目录</a>
            <template v-for="(seg, i) in pathSegments">
              <span :key="'sep-' + i" class="breadcrumb-sep">/</span>
              <a :key="'seg-' + i" class="breadcrumb-link" :class="{ current: i === pathSegments.length - 1 }" @click="navigateToPath(i)">{{ seg }}</a>
            </template>
          </div>
          <div class="file-pagination">
            <el-pagination
              small
              background
              layout="prev, pager, next"
              :total="fileTotal"
              :page-size="filePageSize"
              :current-page="filePage"
              :disabled="filesLoading"
              @current-change="changeFilePage" />
          </div>
        </div>

        <el-table
          v-loading="filesLoading"
          :data="files"
          border
          stripe
          size="small"
          empty-text="该目录下暂无文件"
          :height="fileTableHeight"
          @row-dblclick="handleFileClick">
          <el-table-column label="名称" min-width="260">
            <template #default="{ row }">
              <div class="file-name">
                <svg-icon :icon-class="fileIcon(row)" class="file-icon" />
                <a class="file-link" @click="handleFileClick(row)">{{ row.name }}</a>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="大小" width="100" align="right">
            <template #default="{ row }"><span class="mono">{{ row.type === 'dir' ? '-' : formatSize(row.size) }}</span></template>
          </el-table-column>
          <el-table-column label="类型" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ row.mime_type || '-' }}</template>
          </el-table-column>
          <el-table-column label="修改时间" width="160">
            <template #default="{ row }"><span class="cell-date">{{ formatDate(row.created_at) }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="220" align="center">
            <template #default="{ row }">
              <el-button
                v-if="row.type !== 'dir'"
                type="text"
                size="small"
                icon="el-icon-download"
                :loading="row._downloading"
                @click="downloadFile(row)">下载</el-button>
              <el-button type="text" size="small" icon="el-icon-document-copy" @click="copyUrl(row)">复制 URL</el-button>
              <el-popconfirm :title="row.type === 'dir' ? '确定删除该空目录？' : '确定删除该文件？'" @confirm="deleteFile(row)">
                <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <BucketDialog
      :visible.sync="dialogVisible"
      :bucket="editingBucket"
      :orgId="orgId"
      @saved="onBucketSaved" />
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import { routeBreadcrumb, formatDateTime } from '@/utils/helpers'
import {
  getStorageBuckets, deleteStorageBucket,
  setDefaultBucket,
  getStorageFiles, downloadStorageFile, uploadStorageFile, createStorageDirectory, deleteStorageFile
} from '@/api/storage'
import BucketDialog from './BucketDialog.vue'

export default {
  name: 'StoragePage',
  components: { Breadcrumb, BucketDialog },
  props: {
    orgId: { type: [Number, String], required: true }
  },
  data () {
    return {
      loading: false,
      searchKeyword: '',
      buckets: [],
      dialogVisible: false,
      editingBucket: null,
      // 视图切换：buckets=存储桶列表，files=文件管理
      currentView: 'buckets',
      selectedBucket: null,
      // 文件管理
      filesLoading: false,
      files: [],
      filePage: 1,
      filePageSize: 50,
      fileTotal: 0,
      fileCursors: { 1: '' },
      uploading: false,
      fileTableHeight: 400,
      // 当前所在目录（远程前缀，'' 表示根目录）
      currentPath: ''
    }
  },
  computed: {
    breadcrumb () {
      return [...routeBreadcrumb(this), { title: '对象存储', to: '' }]
    },
    pathSegments () {
      if (!this.currentPath) return []
      return this.currentPath.split('/').filter(Boolean)
    },
    filteredBuckets () {
      const kw = this.searchKeyword.trim().toLowerCase()
      if (!kw) return this.buckets
      return this.buckets.filter(b =>
        (b.title || '').toLowerCase().includes(kw) ||
        (b.bucket || '').toLowerCase().includes(kw)
      )
    }
  },
  created () {
    this.loadBuckets()
  },
  mounted () {
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    async loadBuckets () {
      this.loading = true
      try {
        const res = await getStorageBuckets(this.orgId, { pagesize: 100 })
        this.buckets = res.data.data || []
      } catch (err) {
        this.$message.error(err.response?.data?.msg || '加载存储桶列表失败')
      } finally {
        this.loading = false
      }
    },
    // 点击存储桶名称，直接进入文件管理并加载根目录
    openBucketFiles (row) {
      this.selectedBucket = row
      this.currentView = 'files'
      this.currentPath = ''
      this.resetFilePagination()
      this.loadFiles()
    },
    backToBuckets () {
      this.currentView = 'buckets'
      this.selectedBucket = null
    },
    async loadFiles () {
      if (!this.selectedBucket) return
      const cursor = this.fileCursors[this.filePage]
      if (this.filePage > 1 && cursor === undefined) return
      this.filesLoading = true
      try {
        const res = await getStorageFiles(this.orgId, {
          bucket_id: this.selectedBucket.id,
          prefix: this.currentPath,
          page: this.filePage,
          pagesize: this.filePageSize,
          cursor
        })
        const payload = res.data || {}
        const list = payload.data || []
        this.fileTotal = Number(payload.total || list.length)
        if (payload.next_cursor) {
          this.$set(this.fileCursors, this.filePage + 1, payload.next_cursor)
        } else {
          this.$delete(this.fileCursors, this.filePage + 1)
        }
        this.files = list.map(f => ({
          ...f,
          name: f.filename,
          type: f.type ?? 'file',
          _downloading: false
        }))
      } catch (err) {
        this.$message.error(err.response?.data?.msg || '加载文件列表失败')
      } finally {
        this.filesLoading = false
        this.calcFileTableHeight()
      }
    },
    resetFilePagination () {
      this.filePage = 1
      this.fileTotal = 0
      this.fileCursors = { 1: '' }
    },
    changeFilePage (page) {
      if (page > 1 && this.fileCursors[page] === undefined) return
      this.filePage = page
      this.loadFiles()
    },
    fileIcon (row) {
      if (row.type === 'dir') return 'dir'
      if (row.type === 'link') return 'link'
      return 'file'
    },
    // 点击面包屑分段跳转到对应目录
    navigateToPath (index) {
      if (index < 0) {
        this.currentPath = ''
      } else {
        const segs = this.pathSegments.slice(0, index + 1)
        this.currentPath = segs.join('/')
      }
      this.resetFilePagination()
      this.loadFiles()
    },
    // 单击/双击：目录进入，文件下载
    handleFileClick (row) {
      if (row.type === 'dir') {
        this.currentPath = row.path
        this.resetFilePagination()
        this.loadFiles()
      } else {
        this.downloadFile(row)
      }
    },
    openBucketDialog (row) {
      this.editingBucket = row
      this.dialogVisible = true
    },
    onBucketSaved () {
      this.dialogVisible = false
      this.loadBuckets()
    },
    async setDefault (row) {
      try {
        await setDefaultBucket(this.orgId, row.id)
        this.$message.success('已设为默认存储桶')
        this.loadBuckets()
      } catch (err) {
        this.$message.error(err.response?.data?.msg || '设置失败')
      }
    },
    async deleteBucket (row) {
      try {
        await deleteStorageBucket(this.orgId, row.id)
        this.$message.success('已删除')
        this.loadBuckets()
      } catch (err) {
        this.$message.error(err.response?.data?.msg || '删除失败')
      }
    },
    triggerUpload () {
      if (!this.selectedBucket) return
      this.$refs.fileInput.click()
    },
    createDirectory () {
      if (!this.selectedBucket) return
      this.$prompt('请输入目录名称', '新建目录', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /^(?!\.{1,2}$)[^/\\]+$/,
        inputErrorMessage: '目录名称不能为空、不能为 . 或 ..，且不能包含斜杠',
        inputValidator: value => !!String(value || '').trim()
      }).then(async ({ value }) => {
        await createStorageDirectory(this.orgId, this.selectedBucket.id, this.currentPath, value.trim())
        this.$message.success('目录已创建')
        this.resetFilePagination()
        await this.loadFiles()
      }).catch(() => {})
    },
    async handleUpload (e) {
      const file = e.target.files[0]
      if (!file) return
      if (!this.selectedBucket) {
        this.$message.warning('请先选择一个存储桶')
        this.$refs.fileInput.value = ''
        return
      }
      const formData = new FormData()
      formData.append('org', this.orgId)
      formData.append('bucket_id', this.selectedBucket.id)
      formData.append('dir', this.currentPath)
      formData.append('file', file)

      this.uploading = true
      try {
        await uploadStorageFile(this.orgId, formData)
        this.$message.success('上传成功')
        this.resetFilePagination()
        this.loadFiles()
      } catch (err) {
        this.$message.error(err.response?.data?.msg || '上传失败')
      } finally {
        this.uploading = false
        this.$refs.fileInput.value = ''
      }
    },
    async deleteFile (row) {
      try {
        await deleteStorageFile(this.orgId, this.selectedBucket.id, row.path, row.type)
        this.$message.success(row.type === 'dir' ? '目录已删除' : '文件已删除')
        this.resetFilePagination()
        this.loadFiles()
      } catch (err) {
        this.$message.error(err.response?.data?.msg || '删除失败')
      }
    },
    async downloadFile (row) {
      if (!this.selectedBucket || row._downloading) return
      row._downloading = true
      try {
        const blob = await downloadStorageFile(this.orgId, this.selectedBucket.id, row.path)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = row.name || row.filename || 'download'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        this.$message.error(err.response?.data?.msg || '下载失败')
      } finally {
        row._downloading = false
      }
    },
    copyUrl (row) {
      const el = document.createElement('textarea')
      el.value = row.url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      this.$message.success('URL 已复制')
    },
    providerLabel (provider) {
      return { cos: '腾讯云', oss: '阿里云', s3: 'AWS' }[provider] || provider
    },
    providerIcon (provider) {
      return { cos: 'qcloud', oss: 'aliyun', s3: 'aws' }[provider] || 'cloud'
    },
    formatSize (bytes) {
      if (!bytes && bytes !== 0) return '-'
      if (bytes === 0) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let i = 0
      let size = Number(bytes)
      while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
      return size.toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
    },
    formatDate (value) {
      return formatDateTime(Number(value) * 1000)
    },
    // 计算文件浏览器表格高度，使其占满视口剩余空间
    calcFileTableHeight () {
      this.$nextTick(() => {
        const toolbar = this.$refs.fileToolbar
        if (!toolbar) return
        const rect = toolbar.getBoundingClientRect()
        const bottomPadding = 20
        const scrollGap = 50
        const topBar = 48
        const available = window.innerHeight - rect.bottom - bottomPadding - scrollGap
        const maxAllowed = window.innerHeight - topBar - bottomPadding - scrollGap
        this.fileTableHeight = Math.max(Math.min(available, maxAllowed), 200)
      })
    },
    handleResize () {
      this.calcFileTableHeight()
    }
  }
}
</script>

<style lang="scss" scoped>
.content-card {
  margin: 16px 20px 20px;
  background: #fff; border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  padding: 0 20px 20px;
}

.toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; padding-top: 12px;
}
.search-input { width: 260px; }
.bucket-filter { width: 240px; }

.bucket-link {
  display: inline-flex; align-items: center; gap: 8px;
  font-weight: 500; color: #409eff; cursor: pointer;
  &:hover { text-decoration: underline; }
}
.default-badge { font-size: 11px; }

.cloud-provider {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #303133;
  font-size: 13px;
  font-weight: 500;
}
.cloud-provider-icon {
  width: 60px;
  margin-top: 8px;
  height: 18px;
  flex: 0 0 60px;
}

.text-danger { color: #f56c6c; }

.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }

// 文件浏览器（与容器详情页文件浏览器一致）
.file-browser {
  .file-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
    padding-top: 12px;
    margin-bottom: 12px;
    padding-bottom: 15px;
    border-bottom: 1px solid #ebeef5;
  }
  .file-breadcrumb {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    gap: 2px;
    font-size: 14px;
    overflow-x: auto;
    white-space: nowrap;
  }
  .breadcrumb-sep { color: #c0c4cc; margin: 0 2px; }
  .breadcrumb-link {
    color: #409eff;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    &:hover { background: #ecf5ff; }
    &.current { color: #303133; font-weight: 600; cursor: default;
      &:hover { background: transparent; } }
  }
  .file-name {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .file-icon {
    width: 18px; height: 18px;
    color: #909399;
  }
  .file-link {
    cursor: pointer;
    color: #409eff;
    font-size: 13px;
    &:hover { text-decoration: underline; }
  }
  .file-pagination {
    flex: 0 0 auto;
    margin-left: auto;
    white-space: nowrap;
  }
}

::v-deep .el-table {
  th { padding: 10px 0; font-size: 12px; letter-spacing: .3px; }
  td { padding: 10px 0; font-size: 13px; }
}
</style>
