<template>
  <div class="wrapper-thirdparty">
    页面将会自动跳转，如果未跳转说明您的第三方登录出现异常，请联系管理员，或者您
    <router-link :to="{ path: '/login' }">
      <el-link type="primary">重新登录</el-link>
    </router-link>
  </div>
</template>

<script>
import {
  TP_WECHAT
} from '@/consts/user'
import MixinLogin from './mixins/login'

export default {
  name: 'LoginThirdparty',
  mixins: [MixinLogin],
  created () {
    const channel = Number(this.$route.query.channel)
    const token = this.$route.query.token
    if (isNaN(channel) || !token) {
      this.$message.error('参数错误，请返回登录')
      this.$router.push({ path: '/login' })
      return null
    }

    this.tryLogin(channel, token)
  },
  methods: {
    // 尝试登录
    tryLogin (channel, token) {
      const loading = this.$loading({
        text: '正在尝试第三方登录，请您耐心等待'
      })
      const ext = {}
      if (channel == TP_WECHAT) {
        ext['openid'] = this.$route.query.openid
      }
      this.$store.dispatch('user/loginThirdparty', {
        token,
        channel,
        ext
      }).then(res => {
        if (res.data.register_key) {
          this.$router.push({ path: '/thirdparty/bindaccount', query: { register_key: res.data.register_key } })
        } else {
          this.redirectForLogin()
        }
      }).finally(() => {
        loading.close()
      })
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss">
.wrapper-thirdparty {
  padding: 15px;
}
</style>
