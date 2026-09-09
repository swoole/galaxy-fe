<template>
  <container-detail-base
    :org-id="orgId"
    :group-id="groupId"
    :project-id="projectId"
    :project="project"
    :cluster-id="clusterId"
    :can-operate="canOperate"
    mode="project" />
</template>

<script>
import ContainerDetailBase from '@/views/cluster/swarm/components/ContainerDetailBase.vue'

export default {
  name: 'ProjectSwarmContainerDetail',
  components: { ContainerDetailBase },
  props: {
    project: { type: Object, default: () => ({}) },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  computed: {
    clusterId () {
      return Number(this.$route.query.cluster_id)
    },
    canOperate () {
      return this.$p('project.no_viewer', this.project.org_role, this.project.group_role, this.project.role)
    }
  }
}
</script>
