<template>
  <div>
    <el-alert type="info" :closable="false" show-icon class="description">
      这是系统为您个人生成的 SSH 密钥对。Workspace 是可选功能；仅当您使用 Workspace 时，才需要把此公钥添加到 Git 平台，以便容器执行 Clone、Pull 和 Push。它与项目组构建密钥相互独立；页面仅展示公钥，私钥不会在 Web 页面中返回。
    </el-alert>
    <el-descriptions v-loading="loading" direction="vertical" :column="1" :colon="false">
      <el-descriptions-item label="个人公钥">
        <el-input type="textarea" :value="sshkey.pubkey" autosize readonly />
      </el-descriptions-item>
      <el-descriptions-item label="指纹">
        <code>{{ sshkey.fingerprint.sha256 || '-' }}</code>
      </el-descriptions-item>
      <el-descriptions-item label="生成时间">{{ sshkey.generate_at | formatDate }}</el-descriptions-item>
    </el-descriptions>
    <div class="operator">
      <el-button type="success" size="small" v-clipboard:copy="sshkey.pubkey" v-clipboard:success="copySuccess">复制公钥</el-button>
      <el-button type="danger" size="small" @click="dialogVisible = true">重置个人密钥对</el-button>
    </div>

    <el-dialog title="重置个人 SSH 密钥对" :visible.sync="dialogVisible" :close-on-click-modal="false">
      <el-alert type="error" :closable="false" show-icon class="description">重置后所有依赖旧个人公钥的授权都会失效。</el-alert>
      <el-radio-group v-model="algo">
        <el-radio label="ed25519">ED25519（推荐）</el-radio>
        <el-radio label="rsa">RSA 4096</el-radio>
        <el-radio label="ecdsa">ECDSA</el-radio>
      </el-radio-group>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="danger" @click="reset">确认重置</el-button>
      </div>
    </el-dialog>
    <id-confirm ref="id-confirm" />
  </div>
</template>

<script>
import { userSshkey, userSshkeyReset } from '@/api/user'
import { formatDate } from '@/utils/filters'
import clipboard from '@/directive/clipboard/index.js'
import IdConfirm from '@/views/components/IdConfirm'

export default {
  name: 'UserSshKeypair',
  components: { IdConfirm },
  directives: { clipboard },
  filters: { formatDate },
  data () {
    return {
      loading: false,
      dialogVisible: false,
      algo: 'ed25519',
      sshkey: { pubkey: '', generate_at: 0, fingerprint: { sha256: '' } }
    }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      userSshkey().then(res => { this.sshkey = res.data.sshkey }).finally(() => { this.loading = false })
    },
    reset () {
      this.$refs['id-confirm'].confirm('重置个人 SSH 密钥对', token => {
        userSshkeyReset(this.algo, token).then(res => {
          this.sshkey = res.data.sshkey
          this.dialogVisible = false
          this.$refs['id-confirm'].finish()
          this.$message.success('个人 SSH 密钥对已重置')
        })
      })
    },
    copySuccess () { this.$message.success('个人公钥已复制') }
  }
}
</script>

<style lang="scss" scoped>
.description { margin-bottom: 20px; }
.operator { margin-top: 20px; }
</style>
