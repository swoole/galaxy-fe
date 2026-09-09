<template>
  <div class="logo-component">
    <div class="logo-container">
      <transition name="sidebarLogoFade">
        <router-link v-if="false" key="collapse" class="logo-link" to="/">
          <img :src="logo" class="logo">
        </router-link>
        <router-link v-else key="expand" class="logo-link" :to="orgId ? '/' : { name: 'UserMyOrg' }">
          <img :src="logo" class="logo">
          <h1 class="logo-title oneline-ellipsis" :title="title">{{ title }} </h1>
        </router-link>
      </transition>
    </div>
  </div>
</template>

<script>
import { orgLogo } from '@/utils/filters'

export default {
  name: 'HeaderLogo',
  computed: {
    // 组织LOGO
    logo () {
      return orgLogo(this.$store.state.user.lastOrg.logo)
    },
    // 组织名称
    title () {
      return this.$store.state.user.lastOrg.title || '请选择组织'
    },
    // 组织ID
    orgId () {
      return this.$store.getters.orgId
    }
  },
  watch: {
    orgId () {
      this.updateOrgProfile()
    }
  },
  created () {
    // 更新组织信息
    this.updateOrgProfile()
  },
  methods: {
    // 更新组织信息
    updateOrgProfile () {
      if (this.$store.state.user.token && this.orgId) {
        this.$store.dispatch('user/orgProfile', this.orgId)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.logo-component {
  display: flex;
  padding-left: 15px;
  width: 210px;
  height: 100%;
  .logo-container {
    position: relative;
    .logo-link {
      .logo {
        width: 32px;
        height: 32px;
        margin-bottom: 8px;
        border-radius: 3px;
      }
      .logo-title {
        display: inline-block;
        margin: 0 0 0 12px;
        font-size: 16px;
        font-weight: 400;
        color: #fff;
        width: 150px;
      }
    }
  }
}
</style>
