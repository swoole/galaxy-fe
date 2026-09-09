import Vue from 'vue'
import { Storage, StorageKeys } from '@/utils/storage'
import TryCreateOrg from '@/views/login/components/TryCreateOrg.vue'
import { orgs } from '@/api/org'

export default {
  created () {
    if (Storage.get(StorageKeys.jwtToken)) {
      this.redirectForLogin()
    } else {
      // 保存重定向地址到vuex中
      if (this.$route.query.redirect) {
        Storage.set(StorageKeys.loginRedirect, decodeURIComponent(this.$route.query.redirect))
      }
    }
  },
  computed: {
    user () {
      return this.$store.state.user.user
    }
  },
  methods: {
    redirectForLogin () {
      // 重定向地址
      let redirect
      if (this.$route.query.redirect) {
        redirect = decodeURIComponent(this.$route.query.redirect)
      } else if (Storage.get(StorageKeys.loginRedirect)) {
        redirect = Storage.get(StorageKeys.loginRedirect)
      }

      // 清理登录重定向存储
      Storage.remove(StorageKeys.loginRedirect)

      // 可信域名匹配，外域跳转
      if (redirect && /^https?:\/\//.test(redirect)) {
        const url = new URL(redirect)
        const domain = url.host
        for (const trustedDomain of this.$store.state.settings.trustedDomains) {
          if (new RegExp(`^${trustedDomain.replace('*', '.*')}$`).test(domain)) {
            // 匹配到可信域名，带上token跳转回去
            url.searchParams.append('access_token', Storage.get(StorageKeys.jwtToken))
            url.searchParams.append('uid', this.user.id)
            url.searchParams.append('email', this.user.email)
            url.searchParams.append('nickname', this.user.nickname)
            location.href = url
            return
          }
        }

        // 未匹配到可信域名，抛出错误，跳转页面
        this.$message.error('重定向域名不可信，跳转失败')
        this.$router.push({ name: 'Home' })
        return
      }

      if (!this.$store.getters.orgId) {
        this.$router.push({ name: 'UserMyOrg' })
      } else if (redirect) {
        this.$router.push(redirect)
      } else {
        this.$router.push({ name: 'Home' })
      }

      this.$nextTick(() => {
        this.tryCreateOrg()
      })
    },
    // 尝试创建组织
    tryCreateOrg () {
      orgs().then(res => {
        // 不为空不提示创建组织
        if (res.data.orgs.length > 0) {
          return
        }

        // 预判断没有组织才注入组件
        const Component = Vue.extend(TryCreateOrg)
        const instance = new Component({ el: document.createElement('div') })
        document.body.appendChild(instance.$el)
        Vue.nextTick(() => {
          instance.vm = this
          instance.try()
        })
      })
    }
  }
}
