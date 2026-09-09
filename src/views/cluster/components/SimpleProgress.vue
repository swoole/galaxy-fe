<template>
  <el-progress :percentage="percentage" :width="width" :type="type" :color="colors"></el-progress>
</template>

<script>
export default {
  name: 'SimpleProgress',
  props: {
    value: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    },
    width: {
      type: Number,
      default: 80
    },
    type: {
      type: String,
      default: 'line'
    }
  },
  computed: {
    colors () {
      const percentage = this.percentage
      if (percentage > 80) {
        return '#f56c6c'
      } else if (percentage > 50) {
        return '#e6a23c'
      }
      return '#5cb87a'
    },
    percentage () {
      return this.total == 0 ? 0 : Math.round(this.value / this.total * 100)
    }
  }
}
</script>

<style lang="scss" scoped>
.simple-process {
  display: block;
  height: 2px;
  border-radius: 2px;
}
</style>
