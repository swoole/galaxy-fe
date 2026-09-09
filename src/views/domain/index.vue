<template>
  <div class="project-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" />
    <div class="content">
      <el-alert type="info" :closable="false" show-icon title="项目网关只能使用管理员在这里登记并分配给项目组的域名。" />
      <div class="toolbar">
        <el-input v-model.trim="keyword" clearable placeholder="搜索域名" @keyup.enter.native="load" />
        <el-button @click="load">搜索</el-button><span class="spacer" />
        <el-button type="primary" icon="el-icon-plus" @click="edit()">添加域名</el-button>
      </div>
      <el-table :data="rows" border stripe empty-text="暂无域名资产">
        <el-table-column prop="hostname" label="域名" min-width="260"><template #default="{ row }"><code>{{ row.hostname }}</code></template></el-table-column>
        <el-table-column label="子域名" width="130" align="center"><template #default="{ row }"><el-tag :type="row.allow_subdomains ? 'success' : 'info'" size="small">{{ row.allow_subdomains ? '允许' : '不允许' }}</el-tag></template></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="220" />
        <el-table-column label="操作" width="210" align="center">
          <template #default="{ row }">
            <el-button type="text" @click="grant(row)">分配项目组</el-button>
            <el-button type="text" @click="edit(row)">编辑</el-button>
            <el-popconfirm title="确定删除该域名？" @confirm="remove(row)"><el-button slot="reference" type="text" class="danger">删除</el-button></el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <el-dialog :title="form.id ? '编辑域名' : '添加域名'" :visible.sync="editVisible" width="520px">
      <el-form ref="form" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="域名" prop="hostname"><el-input v-model.trim="form.hostname" placeholder="app.example.com" /></el-form-item>
        <el-form-item label="子域名"><el-switch v-model="form.allow_subdomains" /><span class="form-help">开启后项目组可使用
          <code>*.{{ form.hostname || 'app.example.com' }}</code></span></el-form-item>
        <el-form-item label="备注"><el-input v-model.trim="form.remark" maxlength="255" /></el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="editVisible=false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></span>
    </el-dialog>
    <el-dialog :title="`分配项目组 · ${granting ? granting.hostname : ''}`" :visible.sync="grantVisible" width="560px">
      <el-checkbox-group v-model="selectedGroups"><div v-for="group in groups" :key="group.id" class="group-row"><el-checkbox :label="group.id">{{ group.title }}（{{ group.alias }}）</el-checkbox></div></el-checkbox-group>
      <span slot="footer"><el-button @click="grantVisible=false">取消</el-button><el-button type="primary" :loading="grantSaving" @click="saveGrants">保存分配</el-button></span>
    </el-dialog>
  </div>
</template>
<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import { routeBreadcrumb } from '@/utils/helpers'
import { domains, domainCreate, domainUpdate, domainDelete, domainGroups, domainGroupsSave } from '@/api/domain'
export default {
  name: 'DomainManagement',
  components: { Breadcrumb },
  props: { orgId: { type: [Number, String], required: true } },
  data: () => ({ loading: false, saving: false, keyword: '', rows: [], editVisible: false, form: { id: null, hostname: '', allow_subdomains: false, remark: '' }, grantVisible: false, granting: null, groups: [], selectedGroups: [], grantSaving: false, rules: { hostname: [{ required: true, message: '请输入完整域名', trigger: 'blur' }] } }),
  computed: { breadcrumb () { return [...routeBreadcrumb(this), { title: '域名管理', to: '' }] } },
  created () { this.load() },
  methods: {
    async load () { this.loading = true; try { const res = await domains(this.orgId, 1, 100, this.keyword || null); this.rows = res.data.data || [] } finally { this.loading = false } },
    edit (row = null) { this.form = row ? { id: row.id, hostname: row.hostname, allow_subdomains: Boolean(row.allow_subdomains), remark: row.remark || '' } : { id: null, hostname: '', allow_subdomains: false, remark: '' }; this.editVisible = true },
    async save () { const valid = await new Promise(resolve => this.$refs.form.validate(resolve)); if (!valid) return; this.saving = true; try { if (this.form.id) await domainUpdate(this.orgId, this.form.id, this.form); else await domainCreate(this.orgId, this.form); this.editVisible = false; this.$message.success('已保存'); await this.load() } finally { this.saving = false } },
    async remove (row) { await domainDelete(this.orgId, row.id); this.$message.success('已删除'); await this.load() },
    async grant (row) { this.granting = row; const res = await domainGroups(this.orgId, row.id); this.groups = res.data.groups || []; this.selectedGroups = this.groups.filter(item => item.granted).map(item => item.id); this.grantVisible = true },
    async saveGrants () { this.grantSaving = true; try { await domainGroupsSave(this.orgId, this.granting.id, this.selectedGroups); this.grantVisible = false; this.$message.success('分配已更新') } finally { this.grantSaving = false } }
  }
}
</script>
<style lang="scss" scoped>.content{padding:20px}.toolbar{display:flex;gap:10px;margin:16px 0}.toolbar .el-input{width:280px}.spacer{flex:1}.danger{color:#f56c6c}.group-row{padding:8px 0;border-bottom:1px solid #ebeef5}.form-help{margin-left:12px;color:#909399;font-size:12px}</style>
