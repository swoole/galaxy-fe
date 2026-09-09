<template>
  <i :class="iconClass"></i>
</template>

<script>
export default {
  name: '',
  props: {
    type: {
      type: String,
      default: 'success'
    }
  },
  computed: {
    iconClass () {
      switch (this.type) {
        case 'success':
          return ['el-icon-success', 'icon-status-success']
        case 'warning':
          return ['el-icon-warning', 'icon-status-warning']
        case 'error':
          return ['el-icon-error', 'icon-status-error']
        case 'info':
        default:
          return ['el-icon-info', 'icon-status-info']
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.icon-status-success {
  color: #6CBA40;
}
.icon-status-warning {
  color: #D99D40;
}
.icon-status-error {
  color: #E56A63;
}
.icon-status-info {
  color: #85888E;
}
</style>
