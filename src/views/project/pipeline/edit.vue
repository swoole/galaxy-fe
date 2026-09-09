<template>
  <pipeline-form
    :project="project"
    :orgId="orgId"
    :groupId="groupId"
    :projectId="projectId"
    :pipelineId="pipelineId" />
</template>

<script>
import PipelineForm from './components/PipelineForm'

export default {
  name: 'PipelineEdit',
  components: { PipelineForm },
  props: {
    project: { type: Object, default: null },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  computed: {
    pipelineId () {
      return Number(this.$route.params.pipelineId)
    }
  }
}
</script>
