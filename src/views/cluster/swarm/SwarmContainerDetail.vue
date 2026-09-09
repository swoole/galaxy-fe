<template>
  <container-detail-base
    :org-id="orgId"
    :cluster-id="clusterId"
    :cluster="cluster"
    mode="swarm" />
</template>

<script>
import ContainerDetailBase from './components/ContainerDetailBase.vue'

export default {
  name: 'SwarmContainerDetail',
  components: { ContainerDetailBase },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  }
}
</script>
