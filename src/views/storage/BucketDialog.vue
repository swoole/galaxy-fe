<template>
  <el-dialog
    :title="isEdit ? '编辑存储桶' : '添加存储桶'"
    :visible.sync="show"
    width="560px"
    @close="resetForm"
    @opened="clearValidation"
    :close-on-click-modal="false">
    <el-form
      ref="form"
      :model="form"
      :rules="rules"
      :validate-on-rule-change="false"
      label-width="100px"
      size="small">
      <el-form-item label="名称" prop="title">
        <el-input v-model="form.title" placeholder="例如：生产环境存储" maxlength="120" />
      </el-form-item>

      <el-form-item label="云账户" prop="cloudAccountId">
        <el-select v-model="form.cloudAccountId" filterable placeholder="选择云账户" style="width:100%">
          <el-option
            v-for="account in accounts"
            :key="account.id"
            :label="`${account.title} · ${accountProviderText(account.provider)} · ${account.access_key_hint}`"
            :value="account.id">
            <span class="cloud-account-option">
              <svg-icon :icon-class="accountProviderIcon(account.provider)" class="cloud-account-icon" />
              <span>{{ account.title }} · {{ accountProviderText(account.provider) }} · {{ account.access_key_hint }}</span>
            </span>
          </el-option>
        </el-select>
        <div class="form-help">请先在“资源 → 云账户管理”中维护账号凭证。</div>
      </el-form-item>

      <!-- COS 字段 -->
      <template v-if="storageProvider === 'cos'">
        <el-form-item label="Region">
          <el-input v-model="form.cosRegion" disabled placeholder="选择 Bucket 后自动填写" />
        </el-form-item>
      </template>

      <!-- OSS 字段 -->
      <template v-if="storageProvider === 'oss'">
        <el-form-item label="Region">
          <el-input v-model="form.ossRegion" disabled placeholder="选择 Bucket 后自动填写" />
        </el-form-item>
        <el-form-item label="Endpoint" prop="ossEndpoint">
          <el-input v-model="form.ossEndpoint" placeholder="oss-cn-hangzhou.aliyuncs.com" />
        </el-form-item>
      </template>

      <!-- S3 字段 -->
      <template v-if="storageProvider === 's3'">
        <el-form-item label="Region" prop="s3Region">
          <el-input v-model="form.s3Region" placeholder="us-east-1" />
        </el-form-item>
        <el-form-item label="Endpoint">
          <el-input v-model="form.s3Endpoint" placeholder="可选，MinIO 等兼容 S3 服务地址" />
        </el-form-item>
      </template>

      <el-form-item label="Bucket" prop="bucket">
        <div class="bucket-select">
          <el-select v-model="form.bucket" filterable placeholder="选择云账户下的存储桶" style="width:100%" @change="applyDiscoveredBucket">
            <el-option v-for="item in discoveredBuckets" :key="item.name" :label="bucketOptionLabel(item)" :value="item.name" />
          </el-select>
          <el-button icon="el-icon-refresh" :loading="loadingBuckets" :disabled="!form.cloudAccountId" @click="loadDiscoveredBuckets">刷新</el-button>
        </div>
      </el-form-item>
      <el-form-item label="Base URL">
        <el-input v-model="form.baseUrl" placeholder="CDN 加速域名或公开访问地址，如 https://cdn.example.com" />
      </el-form-item>
    </el-form>

    <div slot="footer" class="dialog-footer">
      <el-button size="small" @click="show = false">取消</el-button>
      <el-button size="small" type="primary" :loading="saving" @click="save">保存</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { createStorageBucket, updateStorageBucket, getStorageBucket, discoverStorageBuckets } from '@/api/storage'
import { cloudAccounts } from '@/api/cloud-account'

const defaultForm = () => ({
  title: '',
  cloudAccountId: null,
  bucket: '',
  baseUrl: '',
  cosRegion: '',
  ossRegion: '',
  ossEndpoint: '',
  s3Region: '',
  s3Endpoint: ''
})

export default {
  name: 'BucketDialog',
  props: {
    visible: { type: Boolean, default: false },
    bucket: { type: Object, default: null },
    orgId: { type: [Number, String], required: true }
  },
  data () {
    return {
      saving: false,
      loadingDetail: false,
      loadingBuckets: false,
      accounts: [],
      discoveredBuckets: [],
      form: defaultForm()
    }
  },
  computed: {
    show: {
      get () { return this.visible },
      set (val) { this.$emit('update:visible', val) }
    },
    isEdit () {
      return !!this.bucket
    },
    selectedAccount () {
      return this.accounts.find(account => account.id === this.form.cloudAccountId) || null
    },
    storageProvider () {
      return { tencent_cloud: 'cos', aliyun: 'oss', aws_s3: 's3' }[this.selectedAccount?.provider] || ''
    },
    rules () {
      const base = {
        title: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        bucket: [{ required: true, message: '请输入 Bucket 名称', trigger: 'blur' }],
        cloudAccountId: [{ required: true, message: '请选择云账户', trigger: 'change' }]
      }
      if (this.storageProvider === 'oss') {
        return { ...base, ossEndpoint: [{ required: true, message: '请输入 Endpoint', trigger: 'blur' }] }
      }
      if (this.storageProvider === 's3') {
        return { ...base, s3Region: [{ required: true, message: '请输入 Region', trigger: 'blur' }] }
      }
      return base
    }
  },
  watch: {
    'form.cloudAccountId' (value, oldValue) {
      if (value !== oldValue) {
        if (oldValue !== null) this.form.bucket = ''
        this.discoveredBuckets = []
        if (value) this.loadDiscoveredBuckets()
      }
    },
    visible (val) {
      if (val) this.loadAccounts()
      if (val && this.bucket) {
        this.loadBucketDetail()
      } else if (val) {
        this.form = defaultForm()
      }
    }
  },
  methods: {
    clearValidation () {
      this.$nextTick(() => this.$refs.form?.clearValidate())
    },
    async loadAccounts () {
      const res = await cloudAccounts(this.orgId)
      this.accounts = res.data.accounts || []
    },
    async loadBucketDetail () {
      this.loadingDetail = true
      try {
        const res = await getStorageBucket(this.orgId, this.bucket.id)
        this.populate(res.data.bucket)
      } catch (err) {
        this.$message.error('加载存储桶详情失败')
        this.show = false
      } finally {
        this.loadingDetail = false
      }
    },
    async loadDiscoveredBuckets () {
      if (!this.form.cloudAccountId) return
      const cloudAccountId = this.form.cloudAccountId
      this.loadingBuckets = true
      try {
        const res = await discoverStorageBuckets(this.orgId, {
          cloud_account_id: cloudAccountId,
          region: this.storageProvider === 'cos' ? this.form.cosRegion : (this.storageProvider === 's3' ? this.form.s3Region : ''),
          endpoint: this.storageProvider === 'oss' ? this.form.ossEndpoint : (this.storageProvider === 's3' ? this.form.s3Endpoint : '')
        })
        if (cloudAccountId !== this.form.cloudAccountId) return
        this.discoveredBuckets = res.data.buckets || []
      } catch (err) {
        this.$message.error(err.response?.data?.msg || '读取云账户存储桶失败')
      } finally {
        this.loadingBuckets = false
      }
    },
    applyDiscoveredBucket (name) {
      const bucket = this.discoveredBuckets.find(item => item.name === name)
      if (!bucket) return
      if (this.storageProvider === 'oss') {
        this.form.ossRegion = bucket.region || this.form.ossRegion
        this.form.ossEndpoint = bucket.endpoint || this.form.ossEndpoint
      } else if (this.storageProvider === 'cos') {
        this.form.cosRegion = bucket.region || this.form.cosRegion
      } else if (this.storageProvider === 's3') {
        this.form.s3Region = bucket.region || this.form.s3Region
      }
    },
    populate (row) {
      this.form.title = row.title || ''
      this.form.cloudAccountId = Number(row.cloud_account_id || 0) || null
      this.form.bucket = row.bucket || ''
      this.form.baseUrl = row.base_url || ''
      const config = row.config || {}
      switch (row.provider) {
        case 'cos':
          this.form.cosRegion = config.region || row.region || ''
          break
        case 'oss':
          this.form.ossRegion = row.region || ''
          this.form.ossEndpoint = config.endpoint || row.endpoint || ''
          break
        case 's3':
          this.form.s3Region = config.region || row.region || ''
          this.form.s3Endpoint = config.endpoint || row.endpoint || ''
          break
      }
    },
    buildConfig () {
      const p = this.form
      switch (this.storageProvider) {
        case 'cos':
          return { region: p.cosRegion }
        case 'oss':
          return { region: p.ossRegion, endpoint: p.ossEndpoint }
        case 's3':
          return { region: p.s3Region, endpoint: p.s3Endpoint }
      }
      return {}
    },
    buildPayload () {
      return {
        title: this.form.title,
        cloud_account_id: this.form.cloudAccountId,
        config: this.buildConfig(),
        bucket: this.form.bucket,
        region: this.storageProvider === 'cos' ? this.form.cosRegion : (this.storageProvider === 'oss' ? this.form.ossRegion : (this.storageProvider === 's3' ? this.form.s3Region : '')),
        endpoint: this.storageProvider === 'oss' ? this.form.ossEndpoint : (this.storageProvider === 's3' ? this.form.s3Endpoint : ''),
        base_url: this.form.baseUrl
      }
    },
    async save () {
      try {
        await this.$refs.form.validate()
      } catch { return }

      this.saving = true
      const payload = this.buildPayload()
      try {
        if (this.isEdit) {
          await updateStorageBucket(this.orgId, this.bucket.id, payload)
        } else {
          await createStorageBucket(this.orgId, payload)
        }
        this.$message.success(this.isEdit ? '已更新' : '已创建')
        this.$emit('saved')
      } catch (err) {
        this.$message.error(err.response?.data?.msg || '保存失败')
      } finally {
        this.saving = false
      }
    },
    resetForm () {
      this.form = defaultForm()
      if (this.$refs.form) {
        this.$refs.form.clearValidate()
      }
    },
    accountProviderText (provider) {
      return ({ tencent_cloud: '腾讯云', aliyun: '阿里云', aws_s3: 'AWS' })[provider] || provider
    },
    accountProviderIcon (provider) {
      return ({ tencent_cloud: 'qcloud', aliyun: 'aliyun', aws_s3: 'aws' })[provider] || 'cloud'
    },
    bucketOptionLabel (bucket) {
      return bucket.region ? `${bucket.name} · ${bucket.region}` : bucket.name
    }
  }
}
</script>

<style lang="scss" scoped>
.form-help { margin-top: 4px; color: #909399; font-size: 12px; }
.bucket-select { display: flex; gap: 8px; }
.cloud-account-option { display: inline-flex; align-items: center; gap: 8px; }
.cloud-account-icon { width: 60px; height: 18px; flex: 0 0 60px; }
</style>
