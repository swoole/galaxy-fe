<template>
  <div>
    <el-dialog title="创建组织提醒" :visible.sync="visible" :close-on-click-modal="false">
      <el-form
        :model="form"
        class="dialog-form"
        label-width="120px"
        @submit.native.prevent
      >
        <el-form-item>
          <el-alert
            class="clear-line-height"
            type="warning"
            :closable="false">
            您未创建或者加入任何组织，为了不影响您的正常使用，请及时创建或者加入组织
          </el-alert>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="medium"
            @click="handleForwardCreateOrg">创建组织</el-button>
          <el-button
            type="warning"
            size="medium"
            @click="handleJoinOrg">加入现有组织</el-button>
          <el-button size="medium" @click="visible = false">暂不创建</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
    <a ref="hidden-link" target="_blank" style="display: none;"></a>
  </div>
</template>

<script>
import { manual } from '@/settings'

export default {
  name: 'TryCreateOrg',
  components: {

  },
  data () {
    return {
      visible: false,
      form: {},
      submitLoading: false,
      vm: null
    }
  },
  methods: {
    try () {
      this.visible = true
    },
    // 前往自定义创建
    handleForwardCreateOrg () {
      this.visible = false

      if (this.vm.$route.name != 'UserMyOrgCreate') {
        this.vm.$router.push({ name: 'UserMyOrgCreate' })
      }
    },
    // 加入现有组织
    handleJoinOrg () {
      this.$refs['hidden-link'].href = manual + '/manual/orgmanage/member/join.html'
      this.$refs['hidden-link'].click()

      this.vm.$confirm('已为您打开加入现有组织的文档，请您按照文档操作完成加入', '提示', {
        confirmButtonText: '关闭提示',
        cancelButtonText: '关闭所有对话框',
        type: 'info'
      }).then(() => {
        // do nothing
      }).catch(() => {
        this.visible = false
      })
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
