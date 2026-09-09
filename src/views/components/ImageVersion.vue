<template>
  <el-tooltip class="item" effect="dark" :content="image" :placement="placement">
    <version-note :branch="branch" :commitid="commitid" />
  </el-tooltip>
</template>

<script>
import VersionNote from './VersionNote'

export default {
  name: 'ImageVersion',
  components: {
    VersionNote
  },
  props: {
    image: {
      type: String,
      required: true
    },
    branch: {
      type: String,
      default: ''
    },
    commitid: {
      type: String,
      default: ''
    },
    placement: {
      type: String,
      default: 'top'
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
