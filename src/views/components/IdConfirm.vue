<template>
  <el-dialog title="帐号安全验证" width="600px" :visible.sync="dialogVisible" class="id-confirm" :before-close="handleBeforeClose">
    <div class="id-confirm-operator universal-label">
      您正在进行<span class="text-danger">{{ operator }}</span>操作，请验证您的身份
    </div>

    <el-form
      :model="mainForm"
      ref="main-form"
      class="dialog-form"
      label-width="120px"
      label-position="top"
      :rules="mainFormRules"
      @submit.native.prevent="submit"
    >
      <el-form-item prop="password">
        <template #label>
          密码验证
        </template>
        <el-input
          v-model="mainForm.password"
          type="password"
          :show-password="true"
          placeholder="请输入当前帐号密码" />
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button size="medium" @click="handleCancel">取消</el-button>
      <el-button size="medium" type="primary" @click="submit">验证</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { actIdConfirm } from '@/api/account'

export default {
  name: 'IdConfirm',
  data () {
    return {
      dialogVisible: false,
      mainForm: {
        password: null
      },
      mainFormRules: {
        password: [
          { required: true, message: '请输入当前帐号密码', trigger: ['change'] }
        ]
      },
      operator: '',
      callback: null,
      cancel: null
    }
  },
  methods: {
    // 确认，唤起密码验证
    confirm (operator, cb, cancel = null) {
      this.operator = operator
      this.callback = cb
      this.cancel = cancel
      this.mainForm = {
        password: null
      }
      if (this.$refs['main-form']) {
        this.$refs['main-form'].resetFields()
      }

      this.dialogVisible = true
    },
    // 提交表单
    submit () {
      this.$refs['main-form'].validate((valid) => {
        if (valid) {
          actIdConfirm(this.mainForm.password).then(res => {
            this.callback(res.data.confirm_token)
          })
        }
      })
    },
    // 完成验证
    finish () {
      this.dialogVisible = false
    },
    // 取消
    handleCancel () {
      this.dialogVisible = false
      this.cancel && this.cancel()
    },
    handleBeforeClose (done) {
      this.cancel && this.cancel()
      done()
    }
  }
}
</script>

<style lang="scss" scoped>
.id-confirm {
  .id-confirm-operator {
    margin-bottom: 10px;
  }
}
</style>
<style scoped>
.id-confirm >>> .el-form-item__label {
  padding: 0;
}
</style>
