<template>
  <div class="myapp-layout-container">
    <div class="myapp-layout-nav" :style="{ top: paddingTop }">
      <el-menu
        :default-active="activeMenu"
        class="nav-menu-container">
        <menu-item :to="{ name: 'ClusterSwarmList' }" index="ClusterSwarmList" icon="docker" title="Docker Swarm" />
        <menu-item :to="{ name: 'ClusterK8sList' }" index="ClusterK8sList" icon="cloud-control-service" title="Kubernetes" />
        <menu-item :to="{ name: 'Env' }" index="Env" icon="layers" title="部署环境" />
        <menu-item :to="{ name: 'ResourceUsageRanking' }" index="ResourceUsageRanking" icon="analytics" title="资源排行" />
        <menu-item :to="{ name: 'SystemConfigRegistry' }" index="SystemConfigRegistry" icon="package" title="镜像仓库" />
        <menu-item :to="{ name: 'CloudAccount' }" index="CloudAccount" icon="key" title="云账户" />
        <menu-item :to="{ name: 'Domains' }" index="Domains" icon="route" title="域名" />
        <menu-item :to="{ name: 'Certificates' }" index="Certificates" icon="shield" title="SSL 证书" />
        <menu-item :to="{ name: 'Storage' }" index="Storage" icon="cloud" title="对象存储" />
        <menu-item :to="{ name: 'NetworkTunnels' }" index="NetworkTunnels" icon="connection" title="网络穿透" />
      </el-menu>
    </div>
    <div class="myapp-layout-main">
      <router-view :key="routerKey" :orgId="orgId" :paddingTop="paddingTop" />
    </div>
  </div>
</template>

<script>
import MenuItem from '@/layout/components/header/MenuItem.vue'

export default {
  name: 'ResourceLayout',
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
    // 高亮菜单
    activeMenu () {
      return this.$route.meta.appNav || this.$route.name
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
      .el-menu-item {
        position: relative;
        color: #303133;
        &.is-active {
          background-color: #ecf5ff;
          color: #409eff;
          &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 3px;
            background: #409eff;
          }
        }
      }
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
