<template>
  <div class="form-container">
    <div class="desc-normal">
      邮件验证码将发送至当前绑定的邮箱{{ profile.email }}。
    </div>

    <el-form
      class="auth-form"
      label-position="right"
      label-width="100px"
      :model="authForm"
      @submit.native.prevent="idauth">
      <el-form-item class="form-item-captcha" label="图片验证码">
        <el-input
          v-model="authForm.captcha"
          class="form-item-captcha-input"
          placeholder="图片验证码"
          name="captcha"
          aria-autocomplete="off"
          autocomplete="off" />
        <img
          v-show="captchaForm.captchasrc"
          :src="captchaForm.captchasrc"
          class="form-item-captcha-image"
          alt="验证码"
          title="点击刷新验证码"
          @click="refreshCaptcha" />
      </el-form-item>
      <el-form-item class="form-item-emailcode" label="邮件验证码">
        <el-input
          v-model="authForm.emailcode"
          class="form-item-emailcode-input"
          placeholder="邮件验证码"
          name="captcha"
          aria-autocomplete="off"
          autocomplete="off" />
        <el-button
          class="form-item-emailcode-btn"
          type="primary"
          @click="sendEmailCode"
          :disabled="emailcodeSleep > 0"
          :loading="emailcodeFormLoading">
          {{ emailcodeSleep > 0 ? `${emailcodeSleep} s` : '获取验证码' }}
        </el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="idauth">身份验证</el-button>
        <el-button @click="goBack">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { getCaptcha } from '@/api/auth'
import { actIdauthEmailcode, actEmailcodeSend } from '@/api/account'

export default {
  name: 'UserAccountIdauthEmailcode',
  props: {
    profile: {
      type: Object,
      required: true
    },
    goBack: {
      type: Function,
      required: true
    }
  },
  data () {
    return {
      // 身份认证表单
      authForm: {
        captcha: null,
        emailcode: null
      },
      captchaForm: {
        captchaid: null,
        captchasrc: null
      },
      // 验证码休眠时间
      emailcodeSleep: 0,
      // 验证码按钮loading
      emailcodeFormLoading: false
    }
  },
  created () {
    this.refreshCaptcha()
  },
  methods: {
    // 获取验证码
    refreshCaptcha () {
      getCaptcha().then(res => {
        this.captchaForm = {
          captchaid: res.data.captchaid,
          captchasrc: res.data.captchasrc
        }
      })
    },
    // 获取邮件验证码
    sendEmailCode () {
      if (!this.authForm.captcha) {
        return this.$message.error('图形验证码不能为空')
      }

      this.emailcodeFormLoading = true
      actEmailcodeSend(
        this.captchaForm.captchaid,
        this.authForm.captcha
      ).then(res => {
        this.emailcodeSleep = 60
        const timer = setInterval(() => {
          this.emailcodeSleep--
          if (this.emailcodeSleep === 0) {
            clearInterval(timer)
          }
        }, 1000)
        this.$message.success('验证码发送成功，请于3分钟内完成验证')
      }).finally(() => {
        this.emailcodeFormLoading = false
      })
    },
    // 身份验证
    idauth () {
      if (!this.authForm.emailcode) {
        return this.$message.error('请先填写邮件验证码')
      }

      const loading = this.$loading()
      actIdauthEmailcode(this.authForm.emailcode).then(res => {
        this.$emit('finish')
      }).finally(() => {
        loading.close()
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.form-item-captcha {
  .form-item-captcha-input {
    width: 110px;
    float: left;
    margin-right: 10px;
  }
  .form-item-captcha-image {
    width: 120px;
    height: 40px;
    border-radius: 4px;
    cursor: pointer;
  }
}

.form-container {
  .desc-normal {
    margin-bottom: 15px;
  }
  .form-item-emailcode {
    .form-item-emailcode-input {
      width: 110px;
      float: left;
      margin-right: 10px;
    }
  }
}
</style>
