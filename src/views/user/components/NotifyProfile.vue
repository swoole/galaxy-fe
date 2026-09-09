<template>
  <!-- 通知详情 -->
  <el-dialog title="通知详情" :modal-append-to-body="false" :visible.sync="dialogProfileVisible">
    <el-form
      class="dialog-form"
      label-width="120px"
      size="mini"
      @submit.native.prevent
    >
      <el-form-item label="消息ID">
        {{ profileForm.id }}
      </el-form-item>
      <el-form-item label="消息类型">
        <template v-if="NOTIFY_SCENES[profileForm.scene]">
          <span :class="`text-${NOTIFY_SCENES[profileForm.scene].type}`">
            {{ NOTIFY_SCENES[profileForm.scene].label }}
          </span>
        </template>
        <template v-else>
          {{ profileForm.scene }}
        </template>
      </el-form-item>
      <el-form-item label="标题">
        {{ profileForm.title }}
      </el-form-item>
      <el-form-item label="接收时间">
        {{ profileForm.created_at | formatDate }}
      </el-form-item>
      <el-form-item label="内容">
        <div v-html="profileForm.content"></div>
      </el-form-item>
    </el-form>
  </el-dialog>
</template>

<script>
import {
  // notifyNext,
  // notifyPrev,
  notifyProfile
} from '@/api/user'
import { formatDate } from '@/utils/filters'
import {
  NOTIFY_SCENES
} from '@/consts/user'

export default {
  name: 'NotifyProfile',
  data () {
    return {
      dialogProfileVisible: false,
      profileForm: {
        id: null
      },
      // 常量
      NOTIFY_SCENES
    }
  },
  filters: {
    formatDate
  },
  methods: {
    // 消息详情
    handleDetail (row) {
      const loading = this.$loading()
      notifyProfile(row.id).then(res => {
        if (row.read_at == 0) {
          row.read_at = parseInt(Date.now() / 1000)
        }
        this.profileForm = res.data.notify
        this.dialogProfileVisible = true
      }).finally(() => {
        loading.close()
      })
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
