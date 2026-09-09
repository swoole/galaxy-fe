<template>
  <storage-detail kind="pvc" title="PVC" :org-id="orgId" :cluster-id="clusterId" :cluster="cluster" />
</template>

<script>
import StorageDetail from './components/StorageDetail'

export default {
  name: 'ClusterK8sPersistentVolumeClaimDetail',
  components: { StorageDetail },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  }
}
</script>
