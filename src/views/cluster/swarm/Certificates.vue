<template>
  <div class="project-container certificates" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" />
    <div class="content">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="证书属于组织，可在该组织的所有 Docker Swarm 集群中复用"
        description="私钥经加密保存，页面和 API 不会再次返回。域名路由引用证书后，平台会将密钥对部署为 Docker Secret，并滚动更新 Traefik。" />

      <div class="toolbar">
        <el-input v-model.trim="keyword" clearable prefix-icon="el-icon-search" placeholder="名称、域名或签发者" @keyup.enter.native="search" />
        <el-button @click="search">搜索</el-button>
        <div class="toolbar-spacer" />
        <el-button icon="el-icon-upload2" @click="openBackupSettings">备份设置</el-button>
        <el-button icon="el-icon-download" @click="openCloudSync">从云账户同步</el-button>
        <el-dropdown split-button type="primary" @click="openImport('manual')" @command="openCreate">
          导入证书
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="self_signed">OpenSSL 自签名</el-dropdown-item>
            <el-dropdown-item command="lets_encrypt">Let’s Encrypt</el-dropdown-item>
            <el-dropdown-item command="aliyun">导入阿里云证书</el-dropdown-item>
            <el-dropdown-item command="tencent_cloud">导入腾讯云证书</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>

      <el-table :data="rows" border stripe empty-text="暂无证书资产">
        <el-table-column label="证书" min-width="210">
          <template #default="{ row }">
            <div class="cert-title">{{ row.title }}</div>
            <div class="secondary">#{{ row.id }} · {{ sourceText(row) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="覆盖域名" min-width="260">
          <template #default="{ row }">
            <el-tag v-for="domain in (row.domains || []).slice(0, 3)" :key="domain" size="mini" effect="plain" class="domain-tag">{{ domain }}</el-tag>
            <span v-if="(row.domains || []).length > 3" class="secondary">+{{ row.domains.length - 3 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="签发者" min-width="190" show-overflow-tooltip>
          <template #default="{ row }">{{ row.issuer || '-' }}</template>
        </el-table-column>
        <el-table-column label="有效期" width="180">
          <template #default="{ row }">
            <template v-if="row.valid_to">
              <div>{{ formatTime(row.valid_from) }}</div>
              <div class="secondary">至 {{ formatTime(row.valid_to) }}</div>
            </template>
            <span v-else class="secondary">由 ACME 自动管理</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="95" fixed="right">
          <template #default="{ row }"><el-button type="text" class="danger" @click="remove(row)">删除</el-button></template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > pageSize" :total="total" :page.sync="page" :limit.sync="pageSize" @pagination="load" />
    </div>

    <el-dialog :title="dialogTitle" :visible.sync="visible" width="720px" @closed="reset">
      <el-form ref="certificate-form" :model="form" :rules="rules" label-width="135px">
        <el-form-item label="证书名称" prop="title"><el-input v-model.trim="form.title" maxlength="120" /></el-form-item>

        <template v-if="mode === 'self_signed' || mode === 'lets_encrypt'">
          <el-form-item label="覆盖域名" prop="domainsText">
            <el-input v-model="form.domainsText" type="textarea" :rows="4" placeholder="每行一个域名，例如：&#10;project.example.com&#10;*.example.com" />
            <div class="help">支持普通域名和泛域名；第一项作为证书 Common Name。</div>
          </el-form-item>
        </template>

        <template v-if="mode === 'self_signed'">
          <el-form-item label="有效天数"><el-input-number v-model="form.validity_days" :min="1" :max="3650" /></el-form-item>
          <el-form-item label="RSA 密钥长度">
            <el-radio-group v-model="form.key_bits"><el-radio :label="2048">2048</el-radio><el-radio :label="3072">3072</el-radio><el-radio :label="4096">4096</el-radio></el-radio-group>
          </el-form-item>
          <el-alert type="warning" :closable="false" show-icon title="自签名证书不会被浏览器默认信任，适合内网、开发环境或已分发自定义信任链的设备。" />
        </template>

        <template v-if="mode === 'lets_encrypt'">
          <el-alert type="info" :closable="false" show-icon title="创建后需要在项目域名路由中选择该证书；Traefik 将通过 HTTP-01 自动申请和续期。请确保域名已经解析到网关，且公网可以访问 80 端口。" />
        </template>

        <template v-if="mode === 'manual' || mode === 'cloud_import'">
          <el-form-item v-if="mode === 'cloud_import'" label="云厂商">
            <el-select v-model="form.provider" style="width: 100%"><el-option label="阿里云" value="aliyun" /><el-option label="腾讯云" value="tencent_cloud" /><el-option label="其他云厂商" value="other" /></el-select>
          </el-form-item>
          <el-form-item v-if="mode === 'cloud_import'" label="云证书 ID"><el-input v-model.trim="form.provider_ref" placeholder="选填，用于后续同步和追踪" /></el-form-item>
          <el-form-item label="证书链 PEM" prop="certificate_pem">
            <el-input v-model="form.certificate_pem" type="textarea" :rows="8" placeholder="-----BEGIN CERTIFICATE-----" />
            <input ref="certificate-file" type="file" class="hidden" accept=".pem,.crt,.cer" @change="readFile('certificate_pem', $event)">
            <el-button size="mini" @click="$refs['certificate-file'].click()">读取证书文件</el-button>
          </el-form-item>
          <el-form-item label="私钥 PEM" prop="private_key_pem">
            <el-input v-model="form.private_key_pem" type="textarea" :rows="8" placeholder="-----BEGIN PRIVATE KEY-----" />
            <input ref="private-key-file" type="file" class="hidden" accept=".pem,.key" @change="readFile('private_key_pem', $event)">
            <el-button size="mini" @click="$refs['private-key-file'].click()">读取私钥文件</el-button>
            <div class="help">只支持未加密私钥。提交后私钥不会再次展示。</div>
          </el-form-item>
        </template>
      </el-form>
      <span slot="footer"><el-button @click="visible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">创建证书资产</el-button></span>
    </el-dialog>

    <el-dialog title="从云账户同步已签发证书" :visible.sync="syncVisible" width="920px">
      <div class="sync-toolbar">
        <el-select v-model="syncAccountId" placeholder="选择云账户" style="width:260px" @change="loadRemoteCertificates">
          <el-option v-for="account in accounts" :key="account.id" :label="`${account.title} · ${providerText(account.provider)}`" :value="account.id" />
        </el-select>
        <el-input v-model.trim="remoteKeyword" clearable placeholder="云端证书名称、ID 或域名" @keyup.enter.native="loadRemoteCertificates" />
        <el-button :loading="remoteLoading" @click="loadRemoteCertificates">查询</el-button>
      </div>
      <el-table v-loading="remoteLoading" :data="remoteCertificates" border size="small" empty-text="请选择账号并查询">
        <el-table-column prop="title" label="证书" min-width="180" />
        <el-table-column prop="domain" label="主域名" min-width="180" />
        <el-table-column prop="issuer" label="签发者" min-width="150" show-overflow-tooltip />
        <el-table-column prop="ref" label="云证书 ID" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="90"><template #default="{ row }"><el-button type="text" :loading="importingRef === row.ref" @click="importRemote(row)">导入</el-button></template></el-table-column>
      </el-table>
      <span slot="footer"><el-button @click="syncVisible = false">关闭</el-button></span>
    </el-dialog>

    <el-dialog title="ACME 自动备份" :visible.sync="backupVisible" width="780px">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="备份文件包含 ACME 账户与证书私钥，上传前会使用 Galaxy 平台主密钥加密。"
        description="每个 Swarm 集群独立生成带日期的备份对象，不覆盖历史文件。恢复备份时仍需要当前平台的 SWARM_CREDENTIAL_KEY。" />

      <el-form ref="backup-form" class="backup-form" :model="backupForm" label-width="130px">
        <el-form-item label="自动备份">
          <el-switch v-model="backupForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="对象存储桶" required>
          <el-select v-model="backupForm.bucket_id" :disabled="!backupForm.enabled" filterable placeholder="请选择已添加的对象存储桶" style="width:100%">
            <el-option
              v-for="bucket in storageBuckets"
              :key="bucket.id"
              :label="`${bucket.title} · ${bucket.bucket} · ${storageProviderText(bucket.provider)}`"
              :value="bucket.id" />
          </el-select>
          <div v-if="!storageBuckets.length" class="help">尚未添加对象存储桶，请先前往“资源 → 对象存储”完成配置。</div>
        </el-form-item>
        <el-form-item label="备份目录" required>
          <el-input v-model.trim="backupForm.directory" :disabled="!backupForm.enabled" placeholder="galaxy/acme-backups" maxlength="512" />
          <div class="help">对象路径示例：目录/org-1/cluster-2/acme-20260725-120000-指纹.json.enc</div>
        </el-form-item>
        <el-form-item label="备份周期" required>
          <el-select v-model="backupForm.interval_seconds" :disabled="!backupForm.enabled" style="width:100%">
            <el-option v-for="item in backupIntervals" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>

      <div v-if="backupPolicy && backupPolicy.id" class="backup-status">
        <div class="backup-status-item"><span>最近尝试</span><strong>{{ formatDateTime(backupPolicy.last_attempt_at) }}</strong></div>
        <div class="backup-status-item"><span>最近成功</span><strong>{{ formatDateTime(backupPolicy.last_success_at) }}</strong></div>
        <div class="backup-status-item"><span>下次执行</span><strong>{{ backupPolicy.enabled ? formatDateTime(backupPolicy.next_backup_at) : '已停用' }}</strong></div>
      </div>
      <el-alert
        v-if="backupPolicy && backupPolicy.last_error"
        class="backup-error"
        type="error"
        :closable="false"
        show-icon
        :title="backupPolicy.last_error" />

      <div v-if="backupRecords.length" class="backup-records">
        <div class="backup-records-title">最近备份</div>
        <el-table :data="backupRecords" border size="small" max-height="260">
          <el-table-column label="时间" width="165"><template #default="{ row }">{{ formatDateTime(row.created_at) }}</template></el-table-column>
          <el-table-column label="集群" width="90"><template #default="{ row }">#{{ row.cluster_id }}</template></el-table-column>
          <el-table-column prop="object_key" label="对象路径" min-width="280" show-overflow-tooltip />
          <el-table-column label="大小" width="90" align="right"><template #default="{ row }">{{ formatBytes(row.backup_size) }}</template></el-table-column>
          <el-table-column label="结果" width="80" align="center">
            <template #default="{ row }"><el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="mini">{{ row.status === 'success' ? '成功' : '失败' }}</el-tag></template>
          </el-table-column>
        </el-table>
      </div>

      <span slot="footer">
        <el-button @click="backupVisible = false">关闭</el-button>
        <el-button :disabled="!backupForm.enabled" :loading="backupRunning" @click="saveBackup(true)">保存并立即备份</el-button>
        <el-button type="primary" :loading="backupSaving" @click="saveBackup(false)">保存设置</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb.vue'
import Pagination from '@/components/Pagination'
import { routeBreadcrumb } from '@/utils/helpers'
import {
  certificates, certificateImport, certificateSelfSigned,
  certificateLetsEncrypt, certificateDelete, acmeBackupSettings,
  saveAcmeBackupSettings, runAcmeBackup
} from '@/api/certificate'
import { cloudAccounts, cloudAccountCertificates, cloudAccountCertificateImport } from '@/api/cloud-account'
import { getStorageBuckets } from '@/api/storage'

const emptyForm = () => ({ title: '', domainsText: '', validity_days: 365, key_bits: 2048, provider: '', provider_ref: '', certificate_pem: '', private_key_pem: '' })

export default {
  name: 'CertificateManagement',
  components: { Breadcrumb, Pagination },
  props: {
    orgId: { type: [Number, String], required: true }
  },
  data () {
    return {
      loading: false,
      saving: false,
      rows: [],
      total: 0,
      page: 1,
      pageSize: 20,
      keyword: '',
      visible: false,
      mode: 'manual',
      form: emptyForm(),
      accounts: [],
      syncVisible: false,
      syncAccountId: null,
      remoteKeyword: '',
      remoteLoading: false,
      remoteCertificates: [],
      importingRef: null,
      backupVisible: false,
      backupSaving: false,
      backupRunning: false,
      storageBuckets: [],
      backupPolicy: null,
      backupRecords: [],
      backupForm: { enabled: false, bucket_id: null, directory: 'galaxy/acme-backups', interval_seconds: 86400 },
      backupIntervals: [
        { value: 3600, label: '每小时' },
        { value: 21600, label: '每 6 小时' },
        { value: 43200, label: '每 12 小时' },
        { value: 86400, label: '每天' },
        { value: 259200, label: '每 3 天' },
        { value: 604800, label: '每 7 天' }
      ],
      rules: {
        title: [{ required: true, message: '请输入证书名称', trigger: 'blur' }],
        domainsText: [{ required: true, message: '请输入至少一个域名', trigger: 'blur' }],
        certificate_pem: [{ required: true, message: '请输入或读取证书链 PEM', trigger: 'blur' }],
        private_key_pem: [{ required: true, message: '请输入或读取私钥 PEM', trigger: 'blur' }]
      }
    }
  },
  computed: {
    breadcrumb () { return [...routeBreadcrumb(this), { title: this.$route.meta.title, to: '' }] },
    dialogTitle () { return ({ manual: '导入 SSL 证书', cloud_import: '导入云厂商 SSL 证书', self_signed: '创建 OpenSSL 自签名证书', lets_encrypt: '创建 Let’s Encrypt 证书' })[this.mode] }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      certificates(this.orgId, this.page, this.pageSize, this.keyword || null).then(res => {
        this.rows = res.data.data || []; this.total = Number(res.data.total || 0); this.page = Number(res.data.page || 1)
      }).finally(() => { this.loading = false })
    },
    search () { this.page = 1; this.load() },
    openCreate (command) {
      if (command === 'aliyun' || command === 'tencent_cloud') return this.openImport(command)
      this.reset(); this.mode = command; this.visible = true
    },
    openImport (provider) {
      this.reset()
      this.mode = provider === 'manual' ? 'manual' : 'cloud_import'
      this.form.provider = provider === 'manual' ? '' : provider
      this.visible = true
    },
    save () {
      this.$refs['certificate-form'].validate(valid => {
        if (!valid) return
        const payload = { ...this.form }
        if (this.mode === 'self_signed' || this.mode === 'lets_encrypt') {
          payload.domains = this.form.domainsText.split(/[\n,]/).map(v => v.trim()).filter(Boolean)
          if (!payload.domains.length) return this.$message.error('请输入至少一个域名')
        }
        this.saving = true
        let req
        if (this.mode === 'self_signed') req = certificateSelfSigned(this.orgId, payload)
        else if (this.mode === 'lets_encrypt') req = certificateLetsEncrypt(this.orgId, payload)
        else req = certificateImport(this.orgId, { ...payload, source: this.mode })
        req.then(() => { this.$message.success('证书资产已创建'); this.visible = false; this.load() }).finally(() => { this.saving = false })
      })
    },
    remove (row) {
      this.$confirm(`确定删除证书“${row.title}”？正在被域名使用的证书无法删除。`, '删除证书', { type: 'warning' }).then(() => {
        return certificateDelete(this.orgId, row.id)
      }).then(() => { this.$message.success('证书已删除'); this.load() }).catch(() => {})
    },
    loadAccounts () {
      return cloudAccounts(this.orgId).then(res => {
        this.accounts = (res.data.accounts || []).filter(account => ['aliyun', 'tencent_cloud'].includes(account.provider))
      })
    },
    openCloudSync () {
      this.syncVisible = true; this.remoteCertificates = []
      this.loadAccounts().then(() => { if (!this.accounts.length) this.$message.warning('请先添加证书云厂商账号') })
    },
    loadRemoteCertificates () {
      if (!this.syncAccountId) return
      this.remoteLoading = true
      cloudAccountCertificates(this.orgId, this.syncAccountId, this.remoteKeyword || null).then(res => {
        this.remoteCertificates = res.data.certificates || []
      }).finally(() => { this.remoteLoading = false })
    },
    importRemote (row) {
      this.$prompt('请输入导入到 CodeGalaxy 后的证书名称', '导入云证书', {
        inputValue: row.title || row.domain || `cloud-${row.ref}`,
        inputPattern: /\S+/,
        inputErrorMessage: '证书名称不能为空'
      }).then(({ value }) => {
        this.importingRef = row.ref
        return cloudAccountCertificateImport(this.orgId, this.syncAccountId, row.ref, value.trim())
      }).then(() => { this.$message.success('云证书已下载、校验并加密保存'); this.load() }).finally(() => { this.importingRef = null }).catch(() => {})
    },
    openBackupSettings () {
      this.backupVisible = true
      Promise.all([
        getStorageBuckets(this.orgId, { page: 1, pagesize: 100 }),
        acmeBackupSettings(this.orgId)
      ]).then(([bucketRes, backupRes]) => {
        this.storageBuckets = bucketRes.data.data || []
        this.applyBackupProfile(backupRes.data)
      })
    },
    applyBackupProfile (data) {
      const defaults = data.defaults || { enabled: false, bucket_id: 0, directory: 'galaxy/acme-backups', interval_seconds: 86400 }
      this.backupPolicy = data.policy || null
      this.backupRecords = data.records || []
      const source = this.backupPolicy || defaults
      this.backupForm = {
        enabled: Boolean(source.enabled),
        bucket_id: Number(source.bucket_id || 0) || null,
        directory: source.directory || defaults.directory,
        interval_seconds: Number(source.interval_seconds || defaults.interval_seconds)
      }
    },
    saveBackup (runAfter) {
      if (this.backupForm.enabled && !this.backupForm.bucket_id) return this.$message.error('请选择对象存储桶')
      if (!this.backupForm.directory) return this.$message.error('请输入备份目录')
      const loadingKey = runAfter ? 'backupRunning' : 'backupSaving'
      this[loadingKey] = true
      saveAcmeBackupSettings(this.orgId, {
        ...this.backupForm,
        bucket_id: Number(this.backupForm.bucket_id || 0)
      }).then(res => {
        this.applyBackupProfile(res.data)
        if (!runAfter) {
          this.$message.success('ACME 备份设置已保存')
          return null
        }
        return runAcmeBackup(this.orgId).then(result => {
          const failed = Number(result.data.failed || 0)
          if (failed) this.$message.warning(`备份完成，${failed} 个集群失败`)
          else this.$message.success(`已备份 ${Number(result.data.success || 0)} 个集群`)
          return acmeBackupSettings(this.orgId).then(profile => this.applyBackupProfile(profile.data))
        })
      }).finally(() => { this[loadingKey] = false })
    },
    readFile (field, event) {
      const file = event.target.files[0]; event.target.value = ''
      if (!file) return
      if (file.size > 1024 * 1024) return this.$message.error('PEM 文件不能超过 1 MiB')
      const reader = new FileReader()
      reader.onload = () => { this.form[field] = String(reader.result || '').trim() }
      reader.onerror = () => this.$message.error('读取文件失败')
      reader.readAsText(file)
    },
    reset () { this.form = emptyForm(); if (this.$refs['certificate-form']) this.$refs['certificate-form'].clearValidate() },
    sourceText (row) { return ({ self_signed: 'OpenSSL 自签名', manual: '手动导入', cloud_import: ({ aliyun: '阿里云', tencent_cloud: '腾讯云', other: '云厂商' })[row.provider] || '云厂商', lets_encrypt: 'Let’s Encrypt' })[row.source] || row.source },
    statusText (status) { return ({ active: '有效', pending: '待签发', expired: '已过期', not_yet_valid: '未生效', error: '异常' })[status] || status },
    statusType (status) { return status === 'active' ? 'success' : (status === 'pending' ? 'warning' : 'danger') },
    providerText (provider) { return ({ aliyun: '阿里云', tencent_cloud: '腾讯云' })[provider] || provider },
    storageProviderText (provider) { return ({ oss: '阿里云 OSS', cos: '腾讯云 COS', s3: 'S3' })[provider] || provider },
    formatTime (value) { return value ? new Date(Number(value) * 1000).toLocaleDateString('zh-CN') : '-' },
    formatDateTime (value) { return value ? new Date(Number(value) * 1000).toLocaleString('zh-CN', { hour12: false }) : '-' },
    formatBytes (value) {
      const bytes = Number(value || 0)
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
      return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
    }
  }
}
</script>

<style lang="scss" scoped>
.content { padding: 20px; }
.toolbar { display: flex; gap: 10px; margin: 18px 0; .el-input { width: 320px; } }
.toolbar-spacer { flex: 1; }
.cert-title { font-weight: 600; color: #303133; }
.secondary, .help { color: #909399; font-size: 12px; margin-top: 4px; }
.domain-tag { margin: 2px 5px 2px 0; }
.danger { color: #f56c6c; }
.hidden { display: none; }
.sync-toolbar { display: flex; gap: 10px; margin-bottom: 16px; .el-input { width: 300px; } }
.backup-form { margin-top: 22px; }
.backup-status { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 8px 0 16px; }
.backup-status-item { padding: 12px 14px; border: 1px solid #ebeef5; border-radius: 6px; background: #fafafa; span { display: block; color: #909399; font-size: 12px; margin-bottom: 6px; } strong { color: #303133; font-size: 13px; } }
.backup-error { margin-bottom: 16px; }
.backup-records { margin-top: 18px; }
.backup-records-title { margin-bottom: 10px; font-weight: 600; color: #303133; }
::v-deep .el-textarea__inner { font-family: "SFMono-Regular", Consolas, monospace; }
</style>
