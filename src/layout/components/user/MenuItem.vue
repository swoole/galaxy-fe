<template>
  <li class="menu-item" :class="{ 'menu-item-active': active }">
    <project-link :to="to">
      <svg-icon :icon-class="icon" />
      <span>{{ title }}</span>
    </project-link>
  </li>
</template>

<script>
import ProjectLink from '../Link'

export default {
  name: 'UserMenuItem',
  props: {
    to: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      default: null
    },
    title: {
      type: String,
      default: null
    }
  },
  components: {
    ProjectLink
  },
  computed: {
    active () {
      return this.$route.fullPath == this.to || this.$route.meta['user-nav']
    }
  }
}
</script>

<style lang="scss" scoped>
.menu-item {
  list-style: none;
  font-size: 13px;
  line-height: 32px;
  color: #909399;
  :hover {
    color: rgba(0, 0, 0, 0.755);
  }
  svg {
    margin-right: 8px;
  }
  a {
    display: block;
  }
}
.menu-item-active {
  color: rgba(0, 0, 0, 0.755);
}
</style>
