<template>
  <el-tag :size="size" :type="tag.type" :effect="tag.effect || 'light'">{{ tag.label }}</el-tag>
</template>

<script>
export default {
  name: 'UniversalTag',
  props: {
    data: {
      type: Object,
      required: true
    },
    field: {
      type: [String, Number],
      required: true
    },
    size: {
      type: String,
      default: 'mini'
    }
  },
  computed: {
    tag () {
      return this.data[this.field] || { type: 'danger', label: this.field }
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
