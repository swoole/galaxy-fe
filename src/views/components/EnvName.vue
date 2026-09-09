<template>
  <component :is="wrapper" class="env-name">
    {{ name }}
  </component>
</template>

<script>

export default {
  name: 'EnvName',
  props: {
    env: {
      type: Object,
      required: true
    },
    wrapper: {
      type: String,
      default: 'div'
    }
  },
  computed: {
    name () {
      return `${this.env.title || '已删除'}`
    }
  }
}
</script>

<style lang="scss" scoped>
.env-name {
  display: inline;
}
</style>
