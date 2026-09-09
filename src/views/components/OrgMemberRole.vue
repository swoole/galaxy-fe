<template>
  <el-tag :size="size" :type="type">
    {{ label }}
  </el-tag>
</template>

<script>
import {
  ROLES_WITH_DIRECTOR
} from '@/consts/org'

export default {
  name: 'OrgMemberRole',
  props: {
    role: {
      type: Number || String,
      required: true
    },
    size: {
      type: String,
      default: 'mini'
    }
  },
  computed: {
    label () {
      if (!ROLES_WITH_DIRECTOR[this.role]) {
        return '未知角色'
      }

      return ROLES_WITH_DIRECTOR[this.role].label
    },
    type () {
      if (!ROLES_WITH_DIRECTOR[this.role]) {
        return 'warning'
      }

      return ROLES_WITH_DIRECTOR[this.role].style
    }
  }
}
</script>
