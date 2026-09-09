<template>
  <workload-detail kind="statefulset" title="StatefulSet" :org-id="orgId" :cluster-id="clusterId" :cluster="cluster" />
</template>

<script>
import WorkloadDetail from './components/WorkloadDetail'

export default {
  name: 'ClusterK8sStatefulSetDetail',
  components: { WorkloadDetail },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  }
}
</script>
