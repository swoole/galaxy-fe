<template>
  <el-tag :type="statusType" :size="size">{{ statusText }}</el-tag>
</template>

<script>
export default {
  name: 'ClusterStatusTag',
  props: {
    status: { type: [Number, String], default: 0 },
    size: { type: String, default: 'small' }
  },
  computed: {
    statusText () {
      return {
        0: '创建中',
        1: '接入中',
        2: '待连接',
        3: '在线',
        4: '离线',
        9: '异常'
      }[Number(this.status)] || '未知'
    },
    statusType () {
      return {
        0: 'info',
        1: 'warning',
        2: 'warning',
        3: 'success',
        4: 'info',
        9: 'danger'
      }[Number(this.status)] || 'info'
    }
  }
}
</script>
