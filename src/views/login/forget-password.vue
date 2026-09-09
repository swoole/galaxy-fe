<template>
  <div class="wrapper-forgetpassword">
    <div class="container">
      <project-login-header></project-login-header>
      <el-form
        ref="main-form"
        :model="mainForm"
        :rules="mainFormRules"
        label-width="100px"
        class="form-wrapper"
        @submit.native.prevent="forgetPassword">
        <el-form-item prop="account">
          <el-input
            v-model="mainForm.account"
            placeholder="邮箱"
            name="account"
            type="text"
          >
            <svg-icon slot="prefix" icon-class="user" />
          </el-input>
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
        <el-form-item prop="smscode" class="form-smscode">
          <el-input
            v-model="mainForm.smscode"
            class="form-smscode-input"
            placeholder="邮件验证码"
            name="smscode"
            type="text"
            @keyup.native.enter="forgetPassword"
          >
            <svg-icon slot="prefix" icon-class="password" />
          </el-input>
          <el-button
            class="form-smscode-btn"
            type="primary"
            @click="sendCode"
            :disabled="codeSleep > 0"
            :loading="codeFormLoading || !captchaReady">
            {{ codeSleep > 0 ? `${codeSleep} s` : (captchaReady ? '获取验证码' : '验证码加载中') }}
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="medium" class="login-btn" :loading="formLoading" @click="forgetPassword">提交</el-button>
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
    <union-captcha ref="captcha" @ready="() => captchaReady = true" />
  </div>
</template>

<script>
import { sendCode, forgetPassword } from '@/api/auth'
import ProjectLoginHeader from './components/LoginHeader'
import UnionCaptcha from '@/views/components/UnionCaptcha.vue'

export default {
  name: 'ForgetPassword',
  components: { ProjectLoginHeader, UnionCaptcha },
  data () {
    return {
      mainForm: {
        account: null,
        password: null,
        password_retry: null,
        smscode: null
      },
      formLoading: false,
      mainFormRules: {
        account: [
          { required: true, message: '邮箱不能为空', trigger: 'change' }
        ],
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
        smscode: [
          { required: true, message: '邮件验证码不能为空', trigger: 'change' }
        ]
      },
      // 验证码休眠时间
      codeSleep: 0,
      // 验证码按钮loading
      codeFormLoading: false,
      captchaReady: false
    }
  },
  computed: {
    title () {
      return this.$store.state.settings.title
    }
  },
  methods: {
    // 获取邮件验证码
    sendCode () {
      if (!this.mainForm.account) {
        return this.$message.error('邮箱不能为空')
      }

      this.codeFormLoading = true
      this.$refs.captcha.execute(captcha => {
        sendCode(
          this.mainForm.account,
          captcha,
          'forgetpassword'
        ).then(res => {
          this.codeSleep = 60
          const timer = setInterval(() => {
            this.codeSleep--
            if (this.codeSleep === 0) {
              clearInterval(timer)
            }
          }, 1000)
          this.$message.success('验证码发送成功，请于3分钟内完成验证')
        }).finally(() => {
          this.codeFormLoading = false
        })
      }, 'forgetpassword')
    },
    // 忘记密码
    forgetPassword () {
      this.formLoading = true
      this.$refs['main-form'].validate((valid) => {
        if (!valid) {
          this.formLoading = false
          return false
        }
        forgetPassword(
          this.mainForm.account,
          this.mainForm.password,
          this.mainForm.password_retry,
          this.mainForm.smscode
        ).then(res => {
          this.$message.success('密码重置成功，请重新登录')
          this.$router.push({ path: '/login' })
        }).finally(() => {
          this.formLoading = false
        })
      })
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss">
.wrapper-forgetpassword {
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
    height: 450px;
    position: absolute;
    top: -100px;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    .header {
      padding-bottom: 30px;
      .logo {
        img {
          width: 200px;
          display: block;
          margin: 0 auto 15px;
        }
      }
      .desc {
        font-size: 13px;
        color: #909399;
        text-align: center;
      }
    }
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
      .form-smscode {
        .form-smscode-input {
          width: 180px;
        }
        .form-smscode-btn {
          width: 135px;
          float: right;
        }
      }
    }
  }
}

</style>
