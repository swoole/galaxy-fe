<template>
  <div class="project-breadcrumb-container">
    <el-breadcrumb class="project-breadcrumb" separator-class="el-icon-arrow-right">
      <el-breadcrumb-item
        v-for="(item, index) in breadcrumb"
        :key="index"
        :to="parseTo(item.to)">
        {{ item.title }}
      </el-breadcrumb-item>
    </el-breadcrumb>
  </div>
</template>

<script>
import ProjectLink from '@/layout/components/Link'

export default {
  name: 'Breadcrumb',
  components: {
    ProjectLink
  },
  props: {
    breadcrumb: {
      type: Array,
      required: true
    }
  },
  methods: {
    parseTo (to) {
      if (!to) {
        return null
      } else if (typeof to == 'string') {
        return { path: to }
      } else {
        return to
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.project-breadcrumb-container {
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  .project-breadcrumb {
    height: 60px;
    line-height: 60px;
    padding: 0 20px;
  }
}
</style>
