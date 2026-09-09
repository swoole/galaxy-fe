<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />
    <div class="project-main">
      <easy-title title="项目组 Git 平台密钥" margin-set="0 20" />
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="key-description">
        <div>
          此密钥由当前项目组的 Git 探测和 BuildKit 构建任务共用。
          请将下方公钥添加到 GitHub、GitLab、Gitee、Gitea 等 Git 平台中有权访问仓库的机器用户或 Deploy Key。
        </div>
        <div>平台只展示公钥；私钥加密保存在 Galaxy 数据库中，仅在执行 Git 操作时临时注入目标集群。</div>
      </el-alert>

      <el-descriptions v-loading="loading" direction="vertical" :column="1" :colon="false">
        <el-descriptions-item label="公钥">
          <el-input type="textarea" :value="sshkey.pubkey" autosize readonly />
        </el-descriptions-item>
        <el-descriptions-item label="指纹">
          <code>{{ sshkey.fingerprint.sha256 || '-' }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="算法">
          {{ (sshkey.algo || '').toUpperCase() }}
        </el-descriptions-item>
        <el-descriptions-item label="生成时间">
          {{ sshkey.generate_at | formatDate }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="operator">
        <el-button
          type="success"
          size="small"
          v-clipboard:copy="sshkey.pubkey"
          v-clipboard:success="copySuccess">
          复制公钥
        </el-button>
        <el-button v-if="canReset" type="danger" size="small" @click="dialogResetVisible = true">重置密钥</el-button>
      </div>

      <el-dialog title="重置项目组平台密钥" :visible.sync="dialogResetVisible" :close-on-click-modal="false">
        <el-alert type="error" :closable="false" show-icon class="reset-warning">
          重置后，旧公钥立即失效。项目组的 Git 检查和构建任务都将无法访问 SSH 仓库，直到新公钥被添加到 Git 平台。成员的个人 Workspace 不受影响。
        </el-alert>
        <el-form label-width="100px" @submit.native.prevent="submitReset">
          <el-form-item label="算法">
            <el-radio-group v-model="resetForm.algo">
              <el-radio label="ed25519">ED25519（推荐）</el-radio>
              <el-radio label="rsa">RSA 4096</el-radio>
              <el-radio label="ecdsa">ECDSA</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <div slot="footer">
          <el-button @click="dialogResetVisible = false">取消</el-button>
          <el-button type="danger" @click="submitReset">确认重置</el-button>
        </div>
      </el-dialog>
      <id-confirm ref="id-confirm" />
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import IdConfirm from '@/views/components/IdConfirm'
import clipboard from '@/directive/clipboard/index.js'
import { formatDate } from '@/utils/filters'
import { routeBreadcrumb, routeBreadcrumbFind } from '@/utils/helpers'
import { groupProfile, groupSshkey, groupSshkeyReset } from '@/api/group'

export default {
  name: 'GroupSshKey',
  components: { Breadcrumb, EasyTitle, IdConfirm },
  directives: { clipboard },
  filters: { formatDate },
  data () {
    return {
      loading: false,
      profile: { role: 0 },
      sshkey: { pubkey: '', algo: '', generate_at: 0, fingerprint: { sha256: '' } },
      dialogResetVisible: false,
      resetForm: { algo: 'ed25519' }
    }
  },
  computed: {
    orgId () { return this.$store.getters.orgId },
    groupId () { return this.$route.params.groupId },
    orgRole () { return this.$store.state.user.lastOrg.role },
    canReset () { return this.$p('group.update', this.orgRole, this.profile.role) },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        routeBreadcrumbFind(this, { name: 'Group' }),
        routeBreadcrumbFind(this, { name: 'GroupProfile' }, { groupId: this.groupId }),
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      Promise.all([
        groupProfile(this.orgId, this.groupId),
        groupSshkey(this.orgId, this.groupId)
      ]).then(([profile, key]) => {
        this.profile = profile.data.group
        this.sshkey = key.data.sshkey
      }).finally(() => { this.loading = false })
    },
    submitReset () {
      this.$refs['id-confirm'].confirm('重置项目组 Git 平台密钥', token => {
        groupSshkeyReset(this.orgId, this.groupId, this.resetForm.algo, token).then(res => {
          this.sshkey = res.data.sshkey
          this.dialogResetVisible = false
          this.$refs['id-confirm'].finish()
          this.$message.success('项目组平台密钥已重置，请立即更新 Git 平台中的公钥')
        })
      })
    },
    copySuccess () { this.$message.success('公钥已复制') }
  }
}
</script>

<style lang="scss" scoped>
.key-description, .reset-warning { margin-bottom: 20px; }
.operator { margin-top: 20px; }
</style>
