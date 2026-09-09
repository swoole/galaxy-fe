<template>
  <div class="wrapper-login">
    <div class="container">
      <project-login-header></project-login-header>
      <el-form
        ref="main-form"
        :model="mainForm"
        :rules="mainFormRules"
        label-width="100px"
        class="form-wrapper"
        @submit.native.prevent="login">
        <el-form-item prop="account">
          <el-input
            v-model="mainForm.account"
            placeholder="邮箱"
            name="account"
            type="text"
            @keyup.native.enter="login"
          >
            <svg-icon slot="prefix" icon-class="user" />
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="mainForm.password"
            type="password"
            placeholder="密码"
            name="password"
            :show-password="true"
            aria-autocomplete="off"
            autocomplete="off"
            @keyup.native.enter="login"
          >
            <svg-icon slot="prefix" icon-class="password" />
          </el-input>
        </el-form-item>
        <div class="form-opts form-opts-remem-me">
          <div class="opts-left">
            <el-checkbox v-model="mainForm.rememMe">记住登录</el-checkbox>
          </div>
        </div>
        <el-form-item>
          <el-button
            type="primary"
            size="medium"
            class="login-btn"
            :loading="formLoading || !captchaReady"
            @click="login">
            {{ captchaReady ? '登录' : '验证码加载中' }}
          </el-button>
        </el-form-item>
        <div class="form-opts form-opts-forget-pwd">
          <div class="opts-left">
            <router-link :to="{ path: '/forgetpassword' }">
              <el-link type="info">忘记密码</el-link>
            </router-link>
          </div>
          <div class="opts-right">
            <router-link :to="{ path: '/register' }">
              <el-link type="primary">注册</el-link>
            </router-link>
          </div>
        </div>
      </el-form>
    </div>
    <union-captcha ref="captcha" @ready="() => captchaReady = true" />
  </div>
</template>

<script>
import MixinLogin from './mixins/login'
import ProjectLoginHeader from './components/LoginHeader'
import UnionCaptcha from '@/views/components/UnionCaptcha.vue'

export default {
  name: 'Login',
  components: { ProjectLoginHeader, UnionCaptcha },
  mixins: [MixinLogin],
  data () {
    return {
      mainForm: {
        account: null,
        password: null,
        rememMe: true
      },
      formLoading: false,
      mainFormRules: {
        account: [
          { required: true, message: '邮箱不能为空', trigger: 'change' }
        ],
        password: [
          { required: true, message: '密码不能为空', trigger: 'change' }
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
  watch: {
    $route: {
      handler: function (route) {
        this.redirect = route.query && route.query.redirect
      },
      immediate: true
    }
  },
  methods: {
    // 帐号密码登录
    login () {
      this.formLoading = true
      this.$refs['main-form'].validate((valid) => {
        if (!valid) {
          this.formLoading = false
          return false
        }
        this.$refs.captcha.execute(captcha => {
          this.formLoading = false
          this.$store.dispatch('user/login', {
            account: this.mainForm.account,
            password: this.mainForm.password,
            captcha
          }).then((res) => {
            this.redirectForLogin()
          }).finally(() => {
            this.formLoading = false
          })
        }, 'login')
      })
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss">
.wrapper-login {
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
    height: 380px;
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
        //&.form-opts-remem-me {
        //  margin: -15px 0 20px;
        //}
        //&.form-opts-forget-pwd {
        //  margin: -15px 0 25px;
        //}
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
      .form-divider {
        color: #909399;
      }
    }
  }
}

</style>
