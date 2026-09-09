<template>
  <div class="user-main box-shadow">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="私人密钥对" name="keypair">
        <sshkey-keypair v-if="activeTab === 'keypair'" />
      </el-tab-pane>
      <el-tab-pane label="授权公钥" name="authorized">
        <sshkey-personal v-if="activeTab === 'authorized'" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import SshkeyPersonal from './sshkey/personal'
import SshkeyKeypair from './sshkey/keypair'

export default {
  name: 'UserSshKey',
  components: {
    SshkeyPersonal,
    SshkeyKeypair
  },
  data () {
    return { activeTab: this.$route.query.active || 'keypair' }
  }
}
</script>

<style lang="scss" scoped>
.user-main {
  width: 100%;
  background: #fff;
  padding: 10px 15px 25px 15px;
}

.box-shadow {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
</style>
