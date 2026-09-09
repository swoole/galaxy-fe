<template>
  <el-menu-item :index="index || to">
    <project-link :to="to" class="menu-link">
      <slot>
        <svg-icon v-if="icon" :icon-class="icon" />
        <span>{{ title }}</span>
      </slot>
    </project-link>
  </el-menu-item>
</template>

<script>
import ProjectLink from '../Link.vue'

export default {
  name: 'MenuItem',
  components: {
    ProjectLink
  },
  props: {
    to: {
      type: [String, Object],
      required: true
    },
    icon: {
      type: String,
      default: null
    },
    title: {
      type: String,
      default: null
    },
    index: {
      type: String,
      default: null
    }
  }
}
</script>

<style lang="scss" scoped>
.menu-link {
  display: block;
}
</style>
