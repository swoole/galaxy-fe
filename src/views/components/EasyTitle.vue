<template>
  <div class="easy-title" :class="`easy-title-${level}`" :style="style">
    <slot>{{ title }}</slot>
    <div class="easy-title-options clearfix">
      <slot name="options"></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EasyTitle',
  props: {
    title: {
      type: String,
      default: null
    },
    marginSet: {
      type: String,
      default: ''
    },
    level: {
      type: String,
      default: 'h1'
    }
  },
  computed: {
    style () {
      const style = {}
      if (!this.marginSet) {
        return style
      }

      const margin = this.marginSet.trim().split(/\s+/)
      const length = margin.length
      if (margin[0] !== undefined && margin[0] !== '') {
        style.marginTop = this.spacing(margin[0])
      }
      const bottom = length >= 3 ? margin[2] : margin[1]
      if (bottom !== undefined && bottom !== '') {
        style.marginBottom = this.spacing(bottom)
      }

      return style
    }
  },
  methods: {
    spacing (value) {
      return /^-?\d+(\.\d+)?$/.test(value) ? `${value}px` : value
    }
  }
}
</script>

<style lang="scss" scoped>
.easy-title {
  margin: 18px 0 12px;
  font-weight: 600;
  line-height: 1.25;
}
.easy-title-h1 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-size: 24px;
  border-left: 4px solid #1890ff;
  padding-left: 10px;
}
.easy-title-h2 {
  margin-top: 20px;
  margin-bottom: 14px;
  font-size: 20px;
  border-left: 3px solid #1890ff;
  padding-left: 8px;
}
.easy-title-h3 {
  margin-top: 16px;
  margin-bottom: 10px;
  font-size: 16px;
  border-left: 2px solid #1890ff;
  padding-left: 6px;
}
.easy-title-h4 {
  // font-size: 1em;
  font-size: 14px;
}
.easy-title-h5 {
  // font-size: .875em;
  font-size: 14px;
  color: #57606a;
}
.easy-title-h6 {
  font-size: 13px;
  color: #57606a;
}
.easy-title-options {
  float: right;
}
</style>
