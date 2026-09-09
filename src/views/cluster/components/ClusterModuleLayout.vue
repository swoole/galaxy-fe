<template>
  <div class="myapp-layout-container">
    <div class="myapp-layout-nav" :style="{ top: paddingTop }">
      <el-menu :default-active="activeMenu" :default-openeds="['workloads', 'storage']" class="nav-menu-container">
        <template v-if="profileLoaded">
          <template v-for="item in navItems">
            <el-submenu v-if="item.children" :key="item.index" :index="item.index">
              <template #title>
                <svg-icon v-if="item.icon" :icon-class="item.icon" />
                <span>{{ item.title }}</span>
              </template>
              <menu-item
                v-for="child in item.children"
                :key="child.index"
                :to="routePath(child.suffix)"
                :index="child.index"
                :title="child.title"
                :icon="child.icon" />
            </el-submenu>
            <menu-item
              v-else
              :key="item.index"
              :to="routePath(item.suffix)"
              :index="item.index"
              :title="item.title"
              :icon="item.icon" />
          </template>
        </template>
      </el-menu>
    </div>
    <div class="myapp-layout-main">
      <router-view
        v-if="profileLoaded"
        :key="routerKey"
        :orgId="orgId"
        :clusterId="clusterId"
        :cluster="profile" />
    </div>
  </div>
</template>

<script>
import MenuItem from '@/layout/components/header/MenuItem'
import { clusterSimpleProfile } from '@/api/cluster'

export default {
  name: 'ClusterModuleLayout',
  components: { MenuItem },
  props: {
    paddingTop: { type: String, required: true },
    orchestratorType: { type: String, required: true },
    namespace: { type: String, required: true },
    listRoute: { type: String, required: true },
    navItems: { type: Array, required: true },
    requireReady: { type: Boolean, default: false },
    offlineMessage: { type: String, default: '集群当前不可用' }
  },
  data () {
    return { clusterId: null, profile: {}, profileLoaded: false }
  },
  computed: {
    routerKey () { return this.$route.fullPath },
    orgId () { return this.$store.getters.orgId },
    activeMenu () { return this.$route.meta.appNav || this.$route.name }
  },
  created () {
    this.clusterId = Number(this.$route.params.clusterId)
    this.loadProfile()
  },
  methods: {
    loadProfile () {
      clusterSimpleProfile(this.orgId, this.clusterId).then(res => {
        const profile = res.data.cluster || {}
        if (profile.orchestrator_type !== this.orchestratorType) {
          this.$router.replace({ name: 'ClusterEntry', params: { clusterId: this.clusterId } })
          return
        }
        if (this.requireReady && Number(profile.status) !== 3) {
          this.$message.warning(this.offlineMessage)
          this.$router.replace({ name: this.listRoute })
          return
        }
        this.profile = profile
        this.profileLoaded = true
      }).catch(() => {
        this.$router.replace({ name: this.listRoute })
      })
    },
    routePath (suffix) {
      return `/cluster/${this.clusterId}/${this.namespace}/${suffix}`
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
      overflow-x: hidden;
      overflow-y: auto;
      background: #fff;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, .1);
    }
  }
  .myapp-layout-main { margin-left: 210px; }
}
</style>

<style lang="scss">
.myapp-layout-container .myapp-layout-nav .nav-menu-container {
  .el-menu-item svg, .el-submenu svg {
    width: 24px;
    margin-right: 5px;
    font-size: 14px;
    text-align: center;
    vertical-align: middle;
  }
}
</style>
