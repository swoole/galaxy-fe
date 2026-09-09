<template>
  <service-editor
    :org-id="orgId"
    :group-id="groupId"
    :project-id="projectId"
    :project="project"
    :cluster-id="clusterId"
    :can-operate="canOperate"
    mode="project" />
</template>

<script>
import ServiceEditor from '@/views/cluster/k8s/ServiceCreate'

export default {
  name: 'ProjectKubernetesServiceCreate',
  components: { ServiceEditor },
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
    }
  }
}
</script>
