<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <div class="project-main">
      <easy-title title="项目配置中心" margin-set="0 20" />
      <el-alert
        title="配置优先级：项目全局默认值 → 部署环境覆盖值 → 本次发布临时覆盖值。创建发布时会冻结最终快照，再写入目标集群；修改此处不会改变已经发布的版本。"
        type="info"
        :closable="false"
        show-icon />
      <div class="toolbar">
        <el-button v-if="canEdit" type="primary" size="small" :disabled="selectedScopeArchived" @click="openCreate(activeKind)">新增{{ labels[activeKind] }}</el-button>
        <el-select v-model="scopeFilter" size="small" class="scope-filter" placeholder="作用域">
          <el-option label="全部作用域" value="all" />
          <el-option label="项目全局默认" :value="0" />
          <el-option v-for="environment in environments" :key="environment.id" :label="`环境：${environment.title}${environment.archived_at ? '（已归档）' : ''}`" :value="Number(environment.id)" />
        </el-select>
        <span class="summary">Env {{ groups.env.length }} · Config {{ groups.config.length }} · Secret {{ groups.secret.length }}</span>
      </div>
      <el-tabs v-model="activeKind">
        <el-tab-pane label="环境变量" name="env" />
        <el-tab-pane label="配置文件" name="config" />
        <el-tab-pane label="Secret" name="secret" />
      </el-tabs>
      <el-table v-loading="loading" :data="groups[activeKind]" fit>
        <el-table-column label="作用域" min-width="150">
          <template #default="{ row }">
            <el-tag :type="Number(row.env_id) === 0 ? 'info' : 'warning'" size="small">{{ scopeTitle(row.env_id) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="180"><template #default="{ row }"><code>{{ row.name }}</code></template></el-table-column>
        <el-table-column v-if="activeKind === 'env'" prop="value" label="值" min-width="280" show-overflow-tooltip />
        <el-table-column v-if="activeKind !== 'env'" prop="target" label="容器挂载目标" min-width="260"><template #default="{ row }"><code>{{ row.target }}</code></template></el-table-column>
        <el-table-column v-if="activeKind === 'config'" label="内容" min-width="260"><template #default="{ row }"><span class="preview">{{ preview(row.value) }}</span></template></el-table-column>
        <el-table-column v-if="activeKind === 'secret'" label="状态" width="120" align="center"><el-tag type="success" size="small">已加密配置</el-tag></el-table-column>
        <el-table-column v-if="activeKind !== 'env'" label="权限" width="90" align="center"><template #default="{ row }"><code>{{ modeText(row.file_mode) }}</code></template></el-table-column>
        <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
        <el-table-column label="版本" width="85" align="center"><template #default="{ row }">v{{ row.version }}</template></el-table-column>
        <el-table-column label="更新时间" width="170"><template #default="{ row }">{{ row.updated_at | formatDate }}</template></el-table-column>
        <el-table-column v-if="canEdit" label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-link type="primary" @click="openEdit(row)">编辑</el-link><el-divider direction="vertical" /><el-link type="danger" @click="remove(row)">删除</el-link>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog :title="`${editingId ? '编辑' : '新增'}${labels[form.kind]}`" :visible.sync="visible" width="680px" @closed="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="类型"><el-tag>{{ labels[form.kind] }}</el-tag></el-form-item>
        <el-form-item label="作用域" prop="env_id">
          <el-select v-model="form.env_id" style="width: 100%">
            <el-option label="项目全局默认" :value="0" />
            <el-option v-for="environment in activeEnvironments" :key="environment.id" :label="`部署环境：${environment.title}`" :value="Number(environment.id)" />
          </el-select>
          <div class="scope-help">环境配置会覆盖该环境中的同名全局配置。</div>
        </el-form-item>
        <el-form-item label="名称" prop="name"><el-input v-model.trim="form.name" :placeholder="form.kind === 'env' ? '例如 DATABASE_URL' : '例如 project-config'" /></el-form-item>
        <el-form-item v-if="form.kind !== 'env'" label="挂载目标" prop="target">
          <el-input v-model.trim="form.target" :placeholder="form.kind === 'config' ? '/etc/myapp/config.yml' : 'password 或 /run/secrets/password'" />
        </el-form-item>
        <el-form-item :label="form.kind === 'config' ? '文件内容' : '值'" :prop="form.kind === 'secret' && !editingId ? 'value' : ''">
          <el-input
            v-model="form.value"
            :type="form.kind === 'config' ? 'textarea' : (form.kind === 'secret' ? 'password' : 'text')"
            :rows="form.kind === 'config' ? 12 : 5"
            :show-password="form.kind === 'secret'"
            maxlength="512000"
            :placeholder="editingId && form.kind === 'secret' ? '留空表示保留当前 Secret；填写后将轮换' : '请输入配置值'" />
        </el-form-item>
        <el-form-item v-if="form.kind !== 'env'" label="文件权限" prop="mode"><el-input v-model.trim="form.mode" placeholder="例如 0444 或 0440" /></el-form-item>
        <el-form-item label="说明"><el-input v-model.trim="form.description" maxlength="500" show-word-limit /></el-form-item>
        <el-alert v-if="form.kind === 'secret'" title="Secret 明文只在提交时发送，服务端加密保存；列表和编辑接口永远不会返回明文。" type="warning" :closable="false" show-icon />
      </el-form>
      <span slot="footer"><el-button @click="visible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></span>
    </el-dialog>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import { projectConfigurationCreate, projectConfigurationDelete, projectConfigurations, projectConfigurationUpdate } from '@/api/project'
import { routeBreadcrumb } from '@/utils/helpers'

const emptyForm = kind => ({
  kind,
  env_id: 0,
  name: '',
  value: '',
  target: '',
  mode: kind === 'secret' ? '0440' : '0444',
  description: ''
})

export default {
  name: 'ProjectConfiguration',
  components: { Breadcrumb, EasyTitle },
  props: {
    project: { type: Object, required: true },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return {
      loading: false,
      saving: false,
      visible: false,
      editingId: null,
      activeKind: 'env',
      scopeFilter: 'all',
      rows: [],
      environments: [],
      labels: { env: '环境变量', config: '配置文件', secret: 'Secret' },
      form: emptyForm('env'),
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        value: [{ required: true, message: '请输入配置值', trigger: 'blur' }],
        target: [{ required: true, message: '请输入挂载目标', trigger: 'blur' }],
        mode: [{ pattern: /^0?[0-7]{3}$/, message: '请输入 0000 到 0777 的八进制权限', trigger: 'blur' }]
      }
    }
  },
  computed: {
    breadcrumb () { return routeBreadcrumb(this) },
    canEdit () { return this.$p('project.no_viewer', this.project.org_role, this.project.group_role, this.project.role) },
    activeEnvironments () { return this.environments.filter(item => !Number(item.archived_at || 0)) },
    selectedScopeArchived () {
      if (this.scopeFilter === 'all' || Number(this.scopeFilter) === 0) return false
      const environment = this.environments.find(item => Number(item.id) === Number(this.scopeFilter))
      return Boolean(environment && Number(environment.archived_at || 0))
    },
    groups () {
      return ['env', 'config', 'secret'].reduce((result, kind) => {
        result[kind] = this.rows.filter(item => item.kind === kind && (this.scopeFilter === 'all' || Number(item.env_id) === Number(this.scopeFilter)))
        return result
      }, {})
    }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      projectConfigurations(this.orgId, this.groupId, this.projectId).then(res => {
        this.rows = res.data.configurations || []
        this.environments = res.data.environments || []
      }).finally(() => { this.loading = false })
    },
    openCreate (kind) {
      this.editingId = null
      this.form = emptyForm(kind)
      if (this.scopeFilter !== 'all' && !this.selectedScopeArchived) this.form.env_id = Number(this.scopeFilter)
      this.visible = true
    },
    openEdit (row) {
      this.editingId = row.id
      this.form = { kind: row.kind, env_id: Number(row.env_id || 0), name: row.name, value: row.kind === 'secret' ? '' : row.value, target: row.target || '', mode: this.modeText(row.file_mode), description: row.description || '' }
      this.visible = true
    },
    resetForm () { this.editingId = null; this.form = emptyForm(this.activeKind); this.$refs.form && this.$refs.form.clearValidate() },
    save () {
      this.$refs.form.validate(valid => {
        if (!valid) return
        const data = { ...this.form, file_mode: parseInt(this.form.mode, 8) }
        delete data.mode
        if (this.editingId && data.kind === 'secret' && data.value === '') delete data.value
        this.saving = true
        const action = this.editingId
          ? projectConfigurationUpdate(this.orgId, this.groupId, this.projectId, this.editingId, data)
          : projectConfigurationCreate(this.orgId, this.groupId, this.projectId, data)
        action.then(() => { this.$message.success('配置已保存，新发布将冻结最新版本'); this.visible = false; this.load() }).finally(() => { this.saving = false })
      })
    },
    remove (row) {
      this.$confirm(`删除 ${this.labels[row.kind]} ${row.name}？已经发布的版本快照不受影响。`, '删除配置', { type: 'warning' }).then(() => {
        return projectConfigurationDelete(this.orgId, this.groupId, this.projectId, row.id)
      }).then(() => { this.$message.success('配置已删除'); this.load() })
    },
    modeText (mode) { return `0${Number(mode || 0).toString(8).padStart(3, '0')}` },
    scopeTitle (envId) {
      if (Number(envId) === 0) return '全局默认'
      const environment = this.environments.find(item => Number(item.id) === Number(envId))
      return environment ? environment.title : `环境 #${envId}`
    },
    preview (value) { return String(value || '').replace(/\s+/g, ' ').slice(0, 160) || '（空文件）' }
  }
}
</script>

<style lang="scss" scoped>
.toolbar { display: flex; align-items: center; gap: 12px; margin: 18px 0 8px; }
.scope-filter { width: 210px; }
.summary { margin-left: auto; }
.scope-help { color: #909399; font-size: 12px; line-height: 20px; }
.summary, .preview { color: #909399; }
code { word-break: break-all; }
</style>
