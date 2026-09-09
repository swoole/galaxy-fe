<template>
  <!-- 暂时不要使用submenu组件，目前存在报警告问题，暂时因样式问题无法解决 -->
  <div class="menu-wrapper" style="float: left">
    <el-submenu :index="to">
      <slot name="title">
        <template slot="title">
          <svg-icon v-if="icon" :icon-class="icon" />
          <span>{{ title }}</span>
        </template>
      </slot>
      <slot></slot>
    </el-submenu>
  </div>
</template>

<script>
export default {
  name: 'Submenu',
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
  }
}
</script>

<style lang="scss" scoped>
</style>
