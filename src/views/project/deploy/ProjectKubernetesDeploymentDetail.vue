<template>
  <deployment-detail
    :org-id="orgId"
    :group-id="groupId"
    :project-id="projectId"
    :project="project"
    :cluster-id="clusterId"
    :can-operate="canOperate"
    :can-destroy="canDestroy"
    mode="project" />
</template>

<script>
import DeploymentDetail from '@/views/cluster/k8s/DeploymentDetail'

export default {
  name: 'ProjectKubernetesDeploymentDetail',
  components: { DeploymentDetail },
  props: {
    project: { type: Object, default: () => ({}) },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  computed: {
    clusterId () {
      return Number(this.$route.query.cluster_id || 0)
    },
    canOperate () {
      return this.$p(
        'project.no_viewer',
        this.project.org_role,
        this.project.group_role,
        this.project.role
      )
    },
    canDestroy () {
      return this.$p(
        'project.runtime.destroy',
        this.project.org_role,
        this.project.group_role,
        this.project.role
      )
    }
  }
}
</script>
