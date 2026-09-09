<template>
  <div class="form-container">
    <el-form
      class="auth-form"
      label-position="right"
      label-width="100px"
      :model="authForm"
      @submit.native.prevent="idauth">
      <el-form-item :label="passwordLabel">
        <el-input
          v-model="authForm.password"
          :type="passwordType"
          class="form-item-control"
          placeholder="请输入密码"
          name="password"
          aria-autocomplete="off"
          autocomplete="off">
          <template slot="suffix">
            <span class="show-pwd" @click="showPwd">
              <svg-icon :icon-class="passwordType === 'password' ? 'eye' : 'eye-open'" />
            </span>
          </template>
        </el-input>
      </el-form-item>
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
      <el-form-item>
        <el-button type="primary" @click="idauth">身份验证</el-button>
        <el-button @click="goBack">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { getCaptcha } from '@/api/auth'
import { actIdauthPassword } from '@/api/account'

export default {
  name: 'UserAccountIdauthPassword',
  props: {
    passwordLabel: {
      type: String,
      default: '密码'
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
        password: null,
        captcha: null
      },
      passwordType: 'password',
      captchaForm: {
        captchaid: null,
        captchasrc: null
      }
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
    showPwd () {
      this.passwordType = this.passwordType == 'password' ? 'text' : 'password'
    },
    // 身份验证
    idauth () {
      if (!this.authForm.password) {
        return this.$message.error('请先填写密码')
      }
      if (!this.authForm.captcha) {
        return this.$message.error('请先填写图片验证码')
      }

      const loading = this.$loading()
      actIdauthPassword(
        this.authForm.password,
        this.captchaForm.captchaid,
        this.authForm.captcha
      ).then(res => {
        this.$emit('finish')
      }).finally(() => {
        loading.close()
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.auth-form {
  .form-item-control {
    width: 240px;
  }
  .show-pwd {
    cursor: pointer;
  }
}

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
</style>
