<template>
  <div class="myapp-breadcrumb-container">
    <el-breadcrumb class="myapp-breadcrumb" separator-class="el-icon-arrow-right">
      <el-breadcrumb-item
        v-for="(item, index) in breadcrumb"
        :key="index"
        :to="parseTo(item.to)">
        {{ item.title }}
      </el-breadcrumb-item>
    </el-breadcrumb>

    <div class="myapp-info">
      <h2 class="myapp-title">{{ project.title }}</h2>
      <span class="myapp-type">{{ Number(project.develop) ? '源码项目' : '镜像项目' }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectBreadcrumb',
  props: {
    breadcrumb: {
      type: Array,
      required: true
    },
    project: {
      type: Object,
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
.myapp-breadcrumb-container {
  background: #fff;
  border-bottom: 1px solid #e7ecf2;
  padding: 4px 24px 18px;
  .myapp-breadcrumb {
    height: 40px;
    line-height: 40px;
    font-size: 12px;
  }
  .myapp-info {
    .myapp-title {
      display: inline-block;
      margin: 0 5px 0 0;
      padding: 0;
      font-size: 20px;
      color: rgba(0, 0, 0, 0.755);
    }
    .myapp-type {
      margin-left: 10px;
      font-size: 12px;
      color: #8893a3;
    }
  }
}
</style>
