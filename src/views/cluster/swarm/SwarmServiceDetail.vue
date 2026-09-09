<template>
  <service-detail-base
    :org-id="orgId"
    :cluster-id="clusterId"
    :cluster="cluster"
    mode="swarm" />
</template>

<script>
import ServiceDetailBase from './components/ServiceDetailBase.vue'

export default {
  name: 'SwarmServiceDetail',
  components: { ServiceDetailBase },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  }
}
</script>
