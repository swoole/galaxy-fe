<template>
  <div class="project-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" />
    <div class="content">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="保存时会通过云厂商 STS 身份接口验证 AccessKey，不会访问 SSL、对象存储等资源。AccessKey Secret 加密保存且不会再次返回。" />
      <div class="toolbar">
        <el-button icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        <span class="spacer" />
        <el-button type="primary" icon="el-icon-plus" @click="openCreate">添加云账户</el-button>
      </div>
      <el-table :data="accounts" border stripe empty-text="暂无云账户">
        <el-table-column prop="title" label="名称" min-width="160" />
        <el-table-column label="厂商" width="120"><template #default="{ row }">{{ providerText(row.provider) }}</template></el-table-column>
        <el-table-column prop="access_key_hint" label="AccessKey" min-width="180" />
        <el-table-column label="状态" width="110" align="center"><template #default="{ row }"><el-tag size="small" :type="row.status === 'error' ? 'danger' : 'success'">{{ row.status === 'error' ? '异常' : '验证通过' }}</el-tag></template></el-table-column>
        <el-table-column prop="last_error" label="最近错误" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="90" align="center"><template #default="{ row }"><el-button type="text" class="danger" @click="remove(row)">删除</el-button></template></el-table-column>
      </el-table>
    </div>
    <el-dialog title="添加云账户" :visible.sync="visible" width="640px" @closed="reset">
      <el-form ref="account-form" :model="form" :rules="rules" label-width="135px">
        <el-form-item label="账号名称" prop="title"><el-input v-model.trim="form.title" /></el-form-item>
        <el-form-item label="云厂商" prop="provider"><el-select v-model="form.provider" style="width:100%"><el-option label="阿里云" value="aliyun" /><el-option label="腾讯云" value="tencent_cloud" /><el-option label="AWS" value="aws_s3" /></el-select></el-form-item>
        <el-form-item v-if="form.provider === 'tencent_cloud'" label="APPID" prop="app_id"><el-input v-model.trim="form.app_id" /></el-form-item>
        <el-form-item label="AccessKey ID" prop="access_key_id"><el-input v-model.trim="form.access_key_id" autocomplete="off" /></el-form-item>
        <el-form-item label="AccessKey Secret" prop="access_key_secret"><el-input v-model="form.access_key_secret" type="password" show-password autocomplete="new-password" /></el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="visible=false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存并验证</el-button></span>
    </el-dialog>
  </div>
</template>
<script>
import Breadcrumb from '@/views/components/Breadcrumb.vue'
import { routeBreadcrumb } from '@/utils/helpers'
import { cloudAccounts, cloudAccountCreate, cloudAccountDelete } from '@/api/cloud-account'

const emptyForm = () => ({ title: '', provider: 'aliyun', app_id: '', access_key_id: '', access_key_secret: '' })

export default {
  name: 'CloudAccountManagement',
  components: { Breadcrumb },
  props: { orgId: { type: [Number, String], required: true } },
  data () {
    return {
      loading: false,
      saving: false,
      visible: false,
      accounts: [],
      form: emptyForm(),
      rules: {
        title: [{ required: true, message: '请输入账号名称', trigger: 'blur' }],
        provider: [{ required: true, message: '请选择云厂商', trigger: 'change' }],
        app_id: [{ validator: (rule, value, done) => { if (this.form.provider === 'tencent_cloud' && !value) done(new Error('请输入腾讯云 APPID')); else done() }, trigger: 'blur' }],
        access_key_id: [{ required: true, message: '请输入 AccessKey ID', trigger: 'blur' }],
        access_key_secret: [{ required: true, message: '请输入 AccessKey Secret', trigger: 'blur' }]
      }
    }
  },
  computed: { breadcrumb () { return [...routeBreadcrumb(this), { title: '云账户管理', to: '' }] } },
  created () { this.load() },
  methods: {
    async load () { this.loading = true; try { const res = await cloudAccounts(this.orgId); this.accounts = res.data.accounts || [] } finally { this.loading = false } },
    openCreate () { this.reset(); this.visible = true },
    save () {
      this.$refs['account-form'].validate(async valid => {
        if (!valid) return
        this.saving = true
        try { await cloudAccountCreate(this.orgId, this.form); this.$message.success('云账户验证成功并已保存'); this.visible = false; await this.load() } finally { this.saving = false }
      })
    },
    remove (row) {
      this.$confirm(`删除云账户“${row.title}”？已经导入的证书不会被删除。`, '删除云账户', { type: 'warning' })
        .then(() => cloudAccountDelete(this.orgId, row.id))
        .then(() => { this.$message.success('云账户已删除'); this.load() }).catch(() => {})
    },
    reset () { this.form = emptyForm(); if (this.$refs['account-form']) this.$refs['account-form'].clearValidate() },
    providerText (provider) { return ({ aliyun: '阿里云', tencent_cloud: '腾讯云', aws_s3: 'AWS' })[provider] || provider }
  }
}
</script>
<style lang="scss" scoped>.content{padding:20px}.toolbar{display:flex;gap:10px;margin:16px 0}.spacer{flex:1}.danger{color:#f56c6c}</style>
