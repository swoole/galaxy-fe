<template>
  <cluster-module-layout
    :padding-top="paddingTop"
    orchestrator-type="docker_swarm"
    namespace="swarm"
    list-route="ClusterSwarmList"
    :nav-items="navItems"
    require-ready
    offline-message="集群当前离线，请先在集群列表进入连接设置并恢复 Galaxy Agent" />
</template>

<script>
import ClusterModuleLayout from '@/views/cluster/components/ClusterModuleLayout'

export default {
  name: 'SwarmClusterLayout',
  components: { ClusterModuleLayout },
  props: {
    paddingTop: { type: String, required: true }
  },
  data () {
    return {
      navItems: [
        { suffix: 'overview', index: 'ClusterSwarmOverview', title: '概览', icon: 'dashboard' },
        { suffix: 'services', index: 'ClusterSwarmServices', title: 'Services', icon: 'ops' },
        { suffix: 'nodes', index: 'ClusterSwarmNodes', title: '节点', icon: 'server' },
        { suffix: 'web-gateway', index: 'ClusterSwarmWebGateway', title: 'Web 网关', icon: 'webhook' },
        { suffix: 'networks', index: 'ClusterSwarmNetworks', title: '网络', icon: 'connection' },
        { suffix: 'configs', index: 'ClusterSwarmConfigs', title: 'Configs', icon: 'file' },
        { suffix: 'secrets', index: 'ClusterSwarmSecrets', title: 'Secrets', icon: 'key' },
        { suffix: 'settings', index: 'ClusterSwarmSettings', title: '集群设置', icon: 'settings' }
      ]
    }
  }
}
</script>
