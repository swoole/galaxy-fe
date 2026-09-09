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
      <h2 class="myapp-title">{{ cluster.title }}</h2>
      <el-tag
        type="primary"
        size="mini">Docker Swarm</el-tag>
    </div>
  </div>
</template>

<script>

export default {
  name: 'ClusterBreadcrumb',
  components: {},
  props: {
    breadcrumb: {
      type: Array,
      required: true
    },
    cluster: {
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
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 6px 20px 12px 20px;
  .myapp-breadcrumb {
    height: 48px;
    line-height: 48px;
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
    }
  }
}
</style>
