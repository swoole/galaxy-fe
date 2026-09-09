<template>
  <div class="project-container work-item-detail">
    <div class="page-head">
      <el-page-header @back="goBack" :content="pageTitle" />
    </div>

    <el-card shadow="never" class="content-card" v-loading="loading">
      <div v-if="isEdit" class="meta-row">
        <span><b>创建人：</b><org-user v-if="profile.creator_info" :user="profile.creator_info" /><template v-else>{{ profile.creator_name || '-' }}</template></span>
        <span><b>创建时间：</b>{{ formatTime(profile.created_at) }}</span>
        <span><b>更新时间：</b>{{ formatTime(profile.updated_at) }}</span>
      </div>

      <el-form :model="form" :rules="rules" ref="form" label-width="92px" class="work-form">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="255" show-word-limit placeholder="简要描述该条目" />
        </el-form-item>

        <el-form-item label="详情">
          <div class="detail-editor">
            <el-radio-group v-model="detailMode" size="mini" class="detail-mode">
              <el-radio-button label="edit">编辑</el-radio-button>
              <el-radio-button label="preview">预览</el-radio-button>
            </el-radio-group>
            <EasyMDE
              v-show="detailMode === 'edit'"
              v-model="form.detail"
              placeholder="补充更多信息，支持 Markdown（不超过 64K）"
              :extra-config="{ minHeight: '220px' }" />
            <div v-show="detailMode === 'preview'" ref="preview" class="markdown-body detail-preview"></div>
          </div>
        </el-form-item>

        <template v-if="isCollab">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12">
              <el-form-item label="优先级">
                <el-select v-model="form.priority" placeholder="优先级" style="width:100%">
                  <el-option v-for="o in priorityOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="状态">
                <el-select v-model="form.status" placeholder="状态" style="width:100%">
                  <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :xs="24" :sm="12">
              <el-form-item label="负责人">
                <el-select v-model="form.owner_id" placeholder="选择负责人" filterable clearable style="width:100%">
                  <el-option v-for="o in ownerOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="截止时间">
                <el-date-picker
                  v-model="form.deadline"
                  type="datetime"
                  placeholder="选择截止时间"
                  value-format="timestamp"
                  style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="标记">
            <el-checkbox v-model="form.urgent">紧急</el-checkbox>
            <el-checkbox v-model="form.important">重要</el-checkbox>
          </el-form-item>
        </template>
      </el-form>

      <div class="form-actions">
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        <el-button v-if="isEdit" type="danger" plain :loading="deleting" @click="remove">删除</el-button>
        <el-button @click="goBack">返回</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import EasyMDE from '@/components/Editor/EasyMDE'
import MarkdownIt from 'markdown-it'
import { workItemProfile, workItemCreate, workItemUpdate, workItemDelete } from '@/api/workItem'
import { groupMemberList } from '@/api/group-member'
import OrgUser from '@/views/components/OrgUser'

const md = new MarkdownIt({ html: true, linkify: true, typographer: true })

export default {
  name: 'WorkItemDetailPage',
  components: { EasyMDE, OrgUser },
  data () {
    return {
      loading: false,
      saving: false,
      deleting: false,
      detailMode: 'edit',
      isEdit: false,
      workType: this.$route.meta.workType || 'todo',
      profile: {},
      ownerOptions: [],
      form: {
        title: '',
        detail: '',
        priority: 'normal',
        status: 'pending',
        owner_id: null,
        deadline: null,
        urgent: false,
        important: false
      },
      rules: {
        title: [{ required: true, message: '请填写标题', trigger: 'blur' }]
      },
      priorityOptions: [
        { value: 'low', label: '低' },
        { value: 'normal', label: '普通' },
        { value: 'high', label: '高' }
      ],
      statusOptions: [
        { value: 'pending', label: '待处理' },
        { value: 'in_progress', label: '进行中' },
        { value: 'done', label: '已完成' },
        { value: 'closed', label: '已关闭' }
      ],
      typeText: { todo: '待办事项', task: '工作任务', requirement: '需求清单', note: '备忘录' }
    }
  },
  computed: {
    orgId () { return this.$store.getters.orgId },
    groupId () { return this.$route.params.groupId },
    isCollab () { return this.workType !== 'note' },
    isProjectContext () { return !!this.$route.params.projectId },
    pageTitle () {
      const base = this.typeText[this.workType] || '条目'
      return this.isEdit ? `${base}详情` : `新建${base}`
    }
  },
  created () {
    this.isEdit = !!this.$route.params.id
    this.loadOwners()
    if (this.isEdit) {
      this.loadProfile()
    }
  },
  watch: {
    detailMode (mode) {
      if (mode === 'preview') {
        this.$nextTick(() => {
          if (this.$refs.preview) {
            this.$refs.preview.innerHTML = md.render(this.form.detail || '')
          }
        })
      }
    },
    form: {
      deep: true,
      handler (val) {
        if (this.detailMode === 'preview' && this.$refs.preview) {
          this.$refs.preview.innerHTML = md.render(val.detail || '')
        }
      }
    }
  },
  methods: {
    loadProfile () {
      this.loading = true
      workItemProfile(this.orgId, this.$route.params.id).then(res => {
        const d = res.data
        this.profile = d
        this.form = {
          title: d.title,
          detail: d.detail || '',
          priority: d.priority || 'normal',
          status: d.status || 'pending',
          owner_id: d.owner_id ? Number(d.owner_id) : null,
          deadline: d.deadline ? d.deadline * 1000 : null,
          urgent: !!Number(d.urgent),
          important: !!Number(d.important)
        }
      }).catch(err => {
        this.$message.error(err.response?.data?.message || err.message || '加载失败')
      }).finally(() => {
        this.loading = false
      })
    },
    loadOwners () {
      if (!this.isCollab) return
      groupMemberList(this.orgId, this.groupId).then(res => {
        const list = (res.data && res.data.data) || []
        this.ownerOptions = list.map(m => ({
          value: Number(m.uid),
          label: m.realname || m.nickname || m.email || `用户${m.uid}`
        }))
      }).catch(() => {})
    },
    save () {
      this.$refs.form.validate(valid => {
        if (!valid) return
        this.saving = true
        const payload = {
          title: this.form.title,
          detail: this.form.detail || '',
          urgent: this.form.urgent ? 1 : 0,
          important: this.form.important ? 1 : 0
        }
        if (this.isCollab) {
          payload.priority = this.form.priority
          payload.status = this.form.status
          payload.owner_id = this.form.owner_id ? Number(this.form.owner_id) : 0
          payload.deadline = this.form.deadline ? Math.floor(this.form.deadline / 1000) : 0
        }
        const done = () => { this.saving = false }
        if (this.isEdit) {
          workItemUpdate(this.orgId, this.$route.params.id, payload)
            .then(() => { this.$message.success('已保存'); this.loadProfile() })
            .catch(err => this.$message.error(err.response?.data?.message || err.message || '保存失败'))
            .finally(done)
        } else {
          workItemCreate(this.orgId, this.groupId, {
            ...payload,
            type: this.workType
          }).then(res => {
            this.$message.success('已创建')
            const detailNames = { todo: 'WorkTodoDetail', task: 'WorkTaskDetail', requirement: 'WorkRequirementDetail' }
            const projectDetailNames = { todo: 'ProjectWorkTodoDetail', task: 'ProjectWorkTaskDetail', requirement: 'ProjectWorkRequirementDetail' }
            const detailName = (this.isProjectContext ? projectDetailNames : detailNames)[this.workType]
            this.$router.replace({ name: detailName, params: { groupId: this.groupId, id: res.data.id } })
          }).catch(err => this.$message.error(err.response?.data?.message || err.message || '创建失败'))
            .finally(done)
        }
      })
    },
    remove () {
      this.$confirm('确认删除该条目？此操作不可恢复。', '删除确认', { type: 'warning' }).then(() => {
        this.deleting = true
        workItemDelete(this.orgId, this.$route.params.id).then(() => {
          this.$message.success('已删除')
          this.goBack()
        }).catch(err => this.$message.error(err.response?.data?.message || err.message || '删除失败'))
          .finally(() => { this.deleting = false })
      }).catch(() => {})
    },
    goBack () {
      const listNames = { todo: 'WorkTodo', task: 'WorkTask', requirement: 'WorkRequirement' }
      const projectListNames = { todo: 'ProjectWorkTodo', task: 'ProjectWorkTask', requirement: 'ProjectWorkRequirement' }
      const listName = (this.isProjectContext ? projectListNames : listNames)[this.workType]
      this.$router.push({ name: listName, params: { groupId: this.groupId } })
    },
    formatTime (ts) {
      if (!ts) return '-'
      const d = new Date(ts * 1000)
      const p = n => (n < 10 ? '0' + n : n)
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    }
  }
}
</script>

<style lang="scss" scoped>
.work-item-detail { padding: 12px; }
.page-head { margin: 8px 8px 16px; }
.content-card {
  border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06);
  ::v-deep .el-card__body { padding: 24px; }
}
.meta-row {
  display: flex; flex-wrap: wrap; gap: 24px;
  margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid #ebeef5;
  font-size: 13px; color: #606266;
}
.detail-editor { position: relative; }
.detail-mode { position: absolute; right: 8px; top: 8px; z-index: 2; }
.detail-preview {
  min-height: 220px; padding: 14px 18px; border: 1px solid #dcdfe6; border-radius: 4px;
}
.form-actions { margin-top: 24px; text-align: right; }
</style>
