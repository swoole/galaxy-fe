<template>
  <div :class="['metric-card', type && `metric-card--${type}`]">
    <div class="title">{{ title }}</div>
    <div :class="['value', { compact }]">
      <router-link v-if="to" :to="to">{{ value }}</router-link>
      <span v-else>{{ value }}</span>
    </div>
    <div class="footer">{{ footer }}</div>
  </div>
</template>

<script>
export default {
  name: 'ProjectMetricCard',
  props: {
    title: { type: String, required: true },
    value: { type: [String, Number], required: true },
    footer: { type: String, default: '' },
    to: { type: String, default: '' },
    compact: { type: Boolean, default: false },
    type: {
      type: String,
      default: '',
      validator: value => ['', 'success', 'warning', 'danger'].includes(value)
    }
  }
}
</script>

<style lang="scss" scoped>
.metric-card { padding: 16px; border: 1px solid #e4e7ed; border-radius: 6px; background: #fff; }
.metric-card--success { border-top-color: #67c23a; }
.metric-card--warning { border-top-color: #e6a23c; }
.metric-card--danger { border-top-color: #f56c6c; }
.title { color: #909399; font-size: 14px; }
.value { height: 54px; margin-top: 8px; color: #303133; font-size: 30px; line-height: 54px; border-bottom: 1px solid #ebeef5; }
.metric-card--success .value, .metric-card--success .value a { color: #67c23a; }
.metric-card--warning .value, .metric-card--warning .value a { color: #e6a23c; }
.metric-card--danger .value, .metric-card--danger .value a { color: #f56c6c; }
.value.compact { font-size: 20px; }
.value a { color: #409eff; }
.footer { min-height: 20px; padding-top: 10px; color: #909399; font-size: 12px; }
</style>
