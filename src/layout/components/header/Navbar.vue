<template>
  <div class="navbar-component">
    <el-menu
      :default-active="activeNav"
      mode="horizontal"
      background-color="#2D384B"
      text-color="#fff"
      active-text-color="#589EF8">
      <!-- <menu-item to="/workspace" icon="workspace" title="工作台" /> -->
      <menu-item :to="{ name: 'DevelopLayout' }" index="DevelopLayout" :disabled="!orgId">
        <svg-icon icon-class="code2" />
        项目
      </menu-item>
      <menu-item to="/org" :disabled="!orgId">
        <svg-icon icon-class="users" />
        组织
      </menu-item>
      <menu-item v-if="$p('org.ops', orgRole)" :to="{ name: 'ResourceLayout' }" index="ResourceLayout" :disabled="!orgId">
        <svg-icon icon-class="server" />
        资源
      </menu-item>
      <menu-item :to="{ name: 'AppMarket' }" index="AppMarket">
        <svg-icon icon-class="store" />
        市场
      </menu-item>
    </el-menu>
    <navbar-search :orgId="orgId" />
  </div>
</template>

<script>
import MenuItem from './MenuItem'
// 暂时不要使用submenu组件，目前存在报警告问题，暂时因样式问题无法解决
// import Submenu from './Submenu'
import NavbarSearch from './Navbar/Search.vue'

export default {
  name: 'Navbar',
  components: {
    MenuItem,
    NavbarSearch
  },
  computed: {
    // 高亮菜单
    activeNav () {
      return this.$route.meta.nav
    },
    // 组织ID
    orgId () {
      return this.$store.getters.orgId
    },
    orgRole () {
      return this.$store.state.user.lastOrg.role
    }
  }
}
</script>

<style lang="scss" scoped>
.navbar-component {
  flex: 1 1 0%;
  height: 48px;
  display: flex;
  justify-content: space-between;
}
</style>

<style lang="scss">
.navbar-component {
  .el-menu-item, .el-submenu__title {
    height: 48px !important;
    line-height: 48px !important;
  }
  .el-menu-item svg, .el-submenu svg {
    margin-right: 5px;
    width: 24px;
    text-align: center;
    font-size: 14px;
    vertical-align: middle;
  }
}
</style>
