<template>
  <div class="wrapper-register">
    <div class="container">
      <project-login-header></project-login-header>
      <el-form
        ref="main-form"
        :model="mainForm"
        :rules="mainFormRules"
        label-width="100px"
        class="form-wrapper"
        size="medium"
        @submit.native.prevent="register">
        <el-form-item prop="email">
          <el-input
            v-model="mainForm.email"
            placeholder="邮箱"
            name="email"
            type="text"
          >
            <svg-icon slot="prefix" icon-class="email" />
          </el-input>
        </el-form-item>
        <el-form-item prop="emailcode">
          <div class="form-emailcode">
            <el-input
              v-model="mainForm.emailcode"
              placeholder="邮件验证码"
              name="emailcode"
              type="text"
            />
            <el-button
              type="primary"
              plain
              :loading="emailcodeLoading"
              :disabled="emailcodeSleep > 0 || !captchaReady"
              @click="sendEmailCode">
              {{ emailcodeSleep > 0 ? `${emailcodeSleep} 秒后重试` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="mainForm.password"
            type="password"
            :show-password="true"
            placeholder="密码"
            name="password"
            aria-autocomplete="off"
            autocomplete="off"
          >
            <svg-icon slot="prefix" icon-class="password" />
          </el-input>
        </el-form-item>
        <el-form-item prop="password_retry">
          <el-input
            v-model="mainForm.password_retry"
            type="password"
            :show-password="true"
            placeholder="确认密码"
            name="password_retry"
            aria-autocomplete="off"
            autocomplete="off"
          >
            <svg-icon slot="prefix" icon-class="password" />
          </el-input>
        </el-form-item>
        <el-form-item prop="nickname">
          <el-input
            v-model="mainForm.nickname"
            placeholder="名称"
            name="nickname"
            type="text"
          >
            <svg-icon slot="prefix" icon-class="user" />
          </el-input>
        </el-form-item>
        <div class="form-opts form-opts-confirm-protocol" style="margin-top: 20px;">
          <div class="opts-left">
            <el-checkbox v-model="mainForm.confirmServiceContract">
              我已阅读并同意
              <router-link :to="{ name: 'ServiceContract' }" v-slot="{ href }">
                <a :href="href" class="text-link text-link-underline" target="_blank" style="vertical-align: unset">
                  《网站服务条款》
                </a>
              </router-link>
            </el-checkbox>
            <el-checkbox v-model="mainForm.confirmPrivacyPolicy">
              我已阅读并同意
              <router-link :to="{ name: 'PrivacyPolicy' }" v-slot="{ href }">
                <a :href="href" class="text-link text-link-underline" target="_blank" style="vertical-align: unset">
                  《法律声明及隐私权政策》
                </a>
              </router-link>
            </el-checkbox>
          </div>
        </div>
        <el-form-item>
          <el-button
            type="primary"
            size="medium"
            class="login-btn"
            :disabled="!captchaReady"
            :loading="formLoading"
            @click="register">
            {{ captchaReady ? '注册' : '验证组件加载中' }}
          </el-button>
        </el-form-item>
        <div class="form-opts form-opts-back-login">
          <div class="opts-left">
            <router-link :to="{ path: '/login' }">
              <el-link type="info">返回登录</el-link>
            </router-link>
          </div>
        </div>
      </el-form>
    </div>
    <union-captcha
      ref="captcha"
      @ready="() => captchaReady = true"
      @executing="handleCaptchaExecuting" />
  </div>
</template>

<script>
import MixinLogin from './mixins/login'
import ProjectLoginHeader from './components/LoginHeader'
import UnionCaptcha from '@/views/components/UnionCaptcha.vue'
import { sendRegisterEmailCode } from '@/api/auth'

export default {
  name: 'UserRegister',
  components: { ProjectLoginHeader, UnionCaptcha },
  mixins: [MixinLogin],
  data () {
    return {
      mainForm: {
        email: '',
        emailcode: '',
        password: null,
        password_retry: null,
        nickname: '',
        confirmServiceContract: true,
        confirmPrivacyPolicy: true
      },
      formLoading: false,
      emailcodeLoading: false,
      emailcodeSleep: 0,
      emailcodeTimer: null,
      sliderVerifiedEmail: '',
      sliderVerifiedUntil: 0,
      mainFormRules: {
        password: [
          { required: true, message: '密码不能为空', trigger: 'change' }
        ],
        password_retry: [
          { required: true, message: '确认密码不能为空', trigger: 'change' },
          {
            validator: (rule, value, cb) => {
              if (value !== this.mainForm.password) {
                cb(new Error())
              } else {
                cb()
              }
            },
            message: '两次密码输入不一样',
            trigger: 'blur'
          }
        ],
        nickname: [
          { required: true, message: '昵称不能为空', trigger: 'change' }
        ],
        email: [
          { required: true, message: '邮箱不能为空', trigger: 'change' },
          { type: 'email', message: '邮箱不合法', trigger: 'change' }
        ],
        emailcode: [
          { required: true, message: '邮件验证码不能为空', trigger: 'change' }
        ]
      },
      captchaReady: false
    }
  },
  computed: {
    title () {
      return this.$store.state.settings.title
    }
  },
  beforeDestroy () {
    if (this.emailcodeTimer) window.clearInterval(this.emailcodeTimer)
  },
  methods: {
    sendEmailCode () {
      this.$refs['main-form'].validateField('email', error => {
        if (error) return
        this.emailcodeLoading = true
        if (this.sliderVerifiedEmail === this.mainForm.email && Date.now() < this.sliderVerifiedUntil) {
          this.requestEmailCode()
          return
        }
        this.$refs.captcha.execute(captcha => {
          this.requestEmailCode(captcha)
        })
      })
    },
    requestEmailCode (captcha = null) {
      sendRegisterEmailCode(this.mainForm.email, captcha).then(() => {
        this.sliderVerifiedEmail = this.mainForm.email
        this.sliderVerifiedUntil = Date.now() + 30 * 60 * 1000
        this.$message.success('邮件验证码已发送，3分钟内有效')
        this.startEmailCodeCountdown()
      }).finally(() => {
        this.emailcodeLoading = false
      })
    },
    startEmailCodeCountdown () {
      this.emailcodeSleep = 60
      if (this.emailcodeTimer) window.clearInterval(this.emailcodeTimer)
      this.emailcodeTimer = window.setInterval(() => {
        this.emailcodeSleep--
        if (this.emailcodeSleep <= 0) {
          window.clearInterval(this.emailcodeTimer)
          this.emailcodeTimer = null
        }
      }, 1000)
    },
    // 注册
    register () {
      if (!this.mainForm.confirmServiceContract) {
        return this.$message.error('请先同意网站服务条款')
      }
      if (!this.mainForm.confirmPrivacyPolicy) {
        return this.$message.error('请先同意法律声明及隐私权政策')
      }

      this.formLoading = true
      this.$refs['main-form'].validate((valid) => {
        if (!valid) {
          this.formLoading = false
          return false
        }
        this.$store.dispatch('user/register', this.mainForm).then(() => {
          this.$message.success('帐号注册成功')
          this.redirectForLogin()
        }).finally(() => {
          this.formLoading = false
        })
      })
    },
    handleCaptchaExecuting (executing) {
      if (!executing) this.emailcodeLoading = false
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss">
.wrapper-register {
  position: relative;
  width: 100%;
  height: 100%;
  background-image: url('../../assets/img/background.png');
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  background-origin: content-box;
  background-clip: content-box;
  background-attachment: fixed;
  .container {
    display: inline-block;
    padding: 25px 30px 36px;
    position: relative;
    z-index: 2;
    background: #fff;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    border-radius: 3px;
    width: 380px;
    height: 590px;
    position: absolute;
    top: -100px;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    .form-wrapper {
      .el-form-item__content {
        margin-left: 0 !important;
        .el-input-group__append {
          padding: 0 10px;
        }
        .el-input__prefix {
          left: 10px !important;
        }
      }
      .form-opts {
        &.form-opts-confirm-protocol {
          margin: -15px 0 20px;
        }
        &.form-opts-back-login {
          margin: -15px 0 20px;
        }
        .opts-left {
          display: inline-block;
        }
        .opts-right {
          float: right;
        }
      }
      .login-btn {
        width: 100%;
      }
      .form-emailcode {
        display: flex;
        gap: 10px;
        .el-input {
          flex: 1;
        }
        .el-button {
          width: 125px;
          padding-right: 8px;
          padding-left: 8px;
        }
      }
    }
  }
}

</style>
