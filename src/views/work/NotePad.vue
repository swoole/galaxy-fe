<template>
  <el-card shadow="never" class="content-card notepad">
    <div slot="header" class="card-header">
      <i class="el-icon-notebook-2 card-header-icon"></i> 备忘录
      <span class="card-count">{{ notes.length }}</span>
      <div class="card-header-actions">
        <el-button size="small" icon="el-icon-plus" @click="addNote">新建</el-button>
      </div>
    </div>

    <div v-if="loading" v-loading="true" class="notepad-loading"></div>

    <div v-for="note in notes" :key="note.id" class="note-block">
      <div v-if="editingId === note.id" class="note-editor">
        <el-input v-model="draft.title" size="small" maxlength="255" placeholder="备忘标题" />
        <EasyMDE v-model="draft.detail" placeholder="记录一条备忘，支持 Markdown" :extra-config="{ minHeight: '160px' }" />
        <div class="note-editor-actions">
          <el-checkbox style="float: left" v-model="draft.done" @change="toggleDone(note, $event)">已完成</el-checkbox>
          <el-button type="primary" size="small" :loading="saving" @click="save(note)">保存</el-button>
          <el-button size="small" @click="cancelEdit">取消</el-button>
          <el-button type="danger" size="small" plain :loading="deletingId === note.id" @click="remove(note)">删除</el-button>
        </div>
      </div>
      <div v-else class="note-view" @click="edit(note)">
        <div class="note-title">{{ note.title || '（无标题）' }}</div>
        <div class="note-snippet">{{ snippet(note.detail) }}</div>
        <div class="note-meta">{{ formatTime(note.updated_at) }}</div>
      </div>
    </div>

    <div v-if="editingId === 'new'" class="note-block">
      <div class="note-editor">
        <el-input v-model="draft.title" size="small" maxlength="255" placeholder="备忘标题" />
        <EasyMDE v-model="draft.detail" placeholder="记录一条备忘，支持 Markdown" :extra-config="{ minHeight: '160px' }" />
        <div class="note-editor-actions">
          <el-button type="primary" size="small" :loading="saving" @click="saveNew">保存</el-button>
          <el-button size="small" @click="cancelEdit">取消</el-button>
        </div>
      </div>
    </div>

    <div v-if="!loading && !notes.length && editingId !== 'new'" class="note-empty">
      暂无备忘，点击右上角「新建」记录一条。
    </div>
  </el-card>
</template>

<script>
import EasyMDE from '@/components/Editor/EasyMDE'
import { workItemList, workItemCreate, workItemUpdate, workItemDelete } from '@/api/workItem'

export default {
  name: 'NotePad',
  components: { EasyMDE },
  data () {
    return {
      loading: false,
      saving: false,
      deletingId: null,
      notes: [],
      editingId: null,
      draft: { id: null, title: '', detail: '', done: false }
    }
  },
  computed: {
    orgId () { return this.$store.getters.orgId }
  },
  created () {
    this.load()
  },
  methods: {
    load () {
      this.loading = true
      workItemList(this.orgId, 0, { type: 'note' }).then(res => {
        // 已完成的备忘录（status = done）不再显示在列表。
        this.notes = (res.data.data || []).filter(n => n.status !== 'done')
      }).catch(err => {
        this.$message.error(err.response?.data?.message || err.message || '加载失败')
      }).finally(() => {
        this.loading = false
      })
    },
    addNote () {
      this.draft = { id: null, title: '', detail: '', done: false }
      this.editingId = 'new'
    },
    edit (note) {
      this.draft = { id: note.id, title: note.title, detail: note.detail || '', done: note.status === 'done' }
      this.editingId = note.id
    },
    cancelEdit () {
      this.editingId = null
      this.draft = { id: null, title: '', detail: '', done: false }
    },
    save (note) {
      if (!this.draft.title.trim()) {
        this.$message.warning('请填写标题')
        return
      }
      this.saving = true
      workItemUpdate(this.orgId, note.id, {
        title: this.draft.title,
        detail: this.draft.detail || ''
      }).then(() => {
        this.$message.success('已保存')
        this.editingId = null
        this.load()
      }).catch(err => this.$message.error(err.response?.data?.message || err.message || '保存失败'))
        .finally(() => { this.saving = false })
    },
    saveNew () {
      if (!this.draft.title.trim()) {
        this.$message.warning('请填写标题')
        return
      }
      this.saving = true
      workItemCreate(this.orgId, 0, {
        type: 'note',
        title: this.draft.title,
        detail: this.draft.detail || ''
      }).then(() => {
        this.$message.success('已创建')
        this.editingId = null
        this.load()
      }).catch(err => this.$message.error(err.response?.data?.message || err.message || '创建失败'))
        .finally(() => { this.saving = false })
    },
    toggleDone (note, checked) {
      workItemUpdate(this.orgId, note.id, { status: checked ? 'done' : 'pending' })
        .then(() => {
          this.$message.success(checked ? '已标记为完成' : '已恢复')
          this.load()
          // 标记为完成后该备忘将不再显示，关闭其编辑表单。
          if (checked) {
            this.editingId = null
          }
        })
        .catch(err => {
          this.draft.done = !checked
          this.$message.error(err.response?.data?.message || err.message || '操作失败')
        })
    },
    remove (note) {
      this.$confirm(`确认删除「${note.title || '该备忘'}」？`, '删除确认', { type: 'warning' }).then(() => {
        this.deletingId = note.id
        workItemDelete(this.orgId, note.id).then(() => {
          this.$message.success('已删除')
          this.editingId = null
          this.load()
        }).catch(err => this.$message.error(err.response?.data?.message || err.message || '删除失败'))
          .finally(() => { this.deletingId = null })
      }).catch(() => {})
    },
    snippet (text) {
      if (!text) return '（无内容）'
      const plain = text.replace(/[#>*`\-\s]/g, ' ').replace(/\s+/g, ' ').trim()
      return plain.length > 60 ? plain.slice(0, 60) + '…' : plain
    },
    formatTime (ts) {
      if (!ts) return ''
      const d = new Date(ts * 1000)
      const p = n => (n < 10 ? '0' + n : n)
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    }
  }
}
</script>

<style lang="scss" scoped>
.notepad {
  border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06); margin-bottom: 16px;
  ::v-deep .el-card__header { padding: 14px 20px; border-bottom: 1px solid #ebeef5; background: #fafbfc; }
  ::v-deep .el-card__body { padding: 8px 20px 20px; }
}
.card-header {
  display: flex; align-items: center; font-size: 15px; font-weight: 600; color: #303133;
  .card-header-icon { margin-right: 8px; color: #409eff; font-size: 16px; }
  .card-count { margin-left: 8px; color: #909399; font-size: 13px; font-weight: 400; &::before { content: '('; } &::after { content: ')'; } }
  .card-header-actions { margin-left: auto; }
}
.notepad-loading { min-height: 120px; }
.note-block { padding: 12px 0; border-bottom: 1px solid #f2f3f5; }
.note-block:last-child { border-bottom: none; }
.note-view { cursor: pointer; }
.note-title { font-weight: 600; color: #303133; font-size: 14px; }
.note-snippet { margin-top: 4px; font-size: 13px; color: #909399; }
.note-meta { font-size: 12px; color: #c0c4cc; }
.note-editor .el-input { margin-bottom: 10px; }
.note-editor-options { margin: 4px 0 10px; font-size: 13px; color: #606266; }
.note-editor-actions { margin-top: 10px; text-align: right; }
.note-empty { padding: 14px 0; font-size: 13px; color: #909399; }
</style>
