<template>
  <el-tag :size="size" :type="type" :effect="effect">
    {{ label }}
  </el-tag>
</template>

<script>
import {
  ROLES_WITH_DIRECTOR
} from '@/consts/group'

export default {
  name: 'GroupMemberRole',
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
    },
    effect () {
      if (!ROLES_WITH_DIRECTOR[this.role]) {
        return 'light'
      }

      return ROLES_WITH_DIRECTOR[this.role].effect
    }
  }
}
</script>
