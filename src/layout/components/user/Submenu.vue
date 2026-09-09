<template>
  <div class="menu">
    <div class="menu-title">{{ title }}</div>
    <ul class="menu-list">
      <slot></slot>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'UserSubmenu',
  props: {
    title: {
      type: String,
      required: true
    }
  }
}
</script>

<style lang="scss" scoped>
.menu {
  padding: 10px;
  &:not(:first-child) {
    border-top: 1px solid #dcdfe6;
  }
  .menu-title {
    font-size: 16px;
    line-height: 36px;
  }
  .menu-list {
    margin: 0;
    padding: 0;
  }
}
</style>
