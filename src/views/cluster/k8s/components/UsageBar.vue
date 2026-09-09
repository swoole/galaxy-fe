<template>
  <div v-if="value === null || value === undefined" class="usage-bar usage-bar--na">N/A</div>
  <div v-else class="usage-bar">
    <el-progress
      :percentage="displayPercent"
      :color="barColor"
      :stroke-width="10"
      :show-text="false" />
    <div class="usage-bar__meta">
      <span class="usage-bar__percent" :style="{ color: textColor }">{{ Math.round(value) }}%</span>
      <span class="usage-bar__detail">{{ usedText }} / {{ allText }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'K8sUsageBar',
  props: {
    value: { type: Number, default: null },
    usedText: { type: String, default: '' },
    allText: { type: String, default: '' }
  },
  computed: {
    displayPercent () {
      if (this.value === null || this.value === undefined) return 0
      return Math.max(0, Math.min(100, this.value))
    },
    textColor () {
      if (this.value >= 85) return '#f56c6c'
      if (this.value >= 60) return '#e6a23c'
      return '#67c23a'
    },
    barColor () {
      if (this.value >= 85) return '#f56c6c'
      if (this.value >= 60) return '#e6a23c'
      return '#67c23a'
    }
  }
}
</script>

<style lang="scss" scoped>
.usage-bar {
  min-width: 120px;
  &--na {
    color: #909399;
    font-size: 13px;
  }
  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
    font-size: 12px;
    color: #606266;
  }
  &__percent {
    font-weight: 600;
  }
  &__detail {
    color: #909399;
  }
}
</style>
