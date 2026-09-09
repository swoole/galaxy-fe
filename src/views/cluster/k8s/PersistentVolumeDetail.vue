<template>
  <storage-detail kind="pv" title="持久卷" :org-id="orgId" :cluster-id="clusterId" :cluster="cluster" />
</template>

<script>
import StorageDetail from './components/StorageDetail'

export default {
  name: 'ClusterK8sPersistentVolumeDetail',
  components: { StorageDetail },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  }
}
</script>
