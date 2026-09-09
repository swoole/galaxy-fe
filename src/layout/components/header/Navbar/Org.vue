<template>
  <div class="myapp-layout-container">
    <div class="myapp-layout-nav" :style="{ top: paddingTop }">
      <el-menu
        :default-active="activeMenu"
        class="nav-menu-container">
        <menu-item :to="r('profile')" index="OrgProfile" icon="org" title="组织" />
        <menu-item :to="r('member')" index="OrgMember" icon="users" title="成员" />
        <menu-item :to="{ name: 'Group' }" index="Group" icon="group" title="项目组" />
      </el-menu>
    </div>
    <div class="myapp-layout-main">
      <router-view :key="routerKey" :orgId="orgId" />
    </div>
  </div>
</template>

<script>
import MenuItem from '@/layout/components/header/MenuItem'

export default {
  name: 'OrgLayout',
  components: {
    MenuItem
  },
  props: {
    paddingTop: {
      type: String,
      required: true
    }
  },
  computed: {
    routerKey () {
      return this.$route.fullPath
    },
    // 组织ID
    orgId () {
      return this.$store.getters.orgId
    },
    orgRole () {
      return this.$store.state.user.lastOrg.role
    },
    // 高亮菜单
    activeMenu () {
      const name = this.$route.name
      // 项目组子页统一高亮「项目组」
      if (name && typeof name === 'string' && name.indexOf('Group') === 0) {
        return 'Group'
      }
      return this.$route.meta.appNav || name
    },
    isAdminOrg () {
      return this.$store.state.user.lastOrg.is_admin_org
    }
  },
  data () {
    return {
    }
  },
  created () {
  },
  methods: {
    // 解析路径
    r (suffix) {
      return `/org/${suffix}`
    }
  }
}
</script>

<style lang="scss" scoped>
.myapp-layout-container {
  position: relative;
  height: 100%;
  .myapp-layout-nav {
    position: fixed;
    bottom: 0;
    width: 210px;
    .nav-menu-container {
      width: 210px;
      height: 100%;
      background: #fff;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      overflow-y: auto;
      overflow-x: hidden;
    }
  }
  .myapp-layout-main {
    margin-left: 210px;
  }
}
</style>

<style lang="scss">
.myapp-layout-container {
  .myapp-layout-nav {
    .nav-menu-container {
      .el-menu-item svg, .el-submenu svg {
        margin-right: 5px;
        width: 24px;
        text-align: center;
        font-size: 14px;
        vertical-align: middle;
      }
    }
  }
}
</style>
