<template>
  <div v-loading="loading" class="cluster-entry" />
</template>

<script>
import { clusterSimpleProfile } from '@/api/cluster'
import { orchestratorModule } from '@/constants/orchestrators'

export default {
  name: 'ClusterEntry',
  data () {
    return { loading: true }
  },
  computed: {
    orgId () { return this.$store.getters.orgId },
    clusterId () { return Number(this.$route.params.clusterId) }
  },
  created () {
    clusterSimpleProfile(this.orgId, this.clusterId).then(res => {
      const cluster = res.data.cluster || {}
      const module = orchestratorModule(cluster.orchestrator_type)
      if (!module || !module.available) {
        this.$message.warning('该集群的容器编排模块尚未安装')
        this.$router.replace({ name: 'ClusterSwarmList' })
        return
      }
      this.$router.replace({ name: module.overviewRoute, params: { clusterId: this.clusterId } })
    }).catch(() => {
      this.$router.replace({ name: 'ClusterSwarmList' })
    }).finally(() => {
      this.loading = false
    })
  }
}
</script>

<style scoped>
.cluster-entry { min-height: 240px; }
</style>
