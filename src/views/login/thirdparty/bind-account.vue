<template>
  <div class="wrapper-bindaccount">
    <div class="container">
      <div class="project-title">绑定现有账户</div>
      <el-form
        ref="main-form"
        :model="mainForm"
        :rules="mainFormRules"
        label-width="100px"
        class="form-wrapper"
        @submit.native.prevent="loginPassword">
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
        <div class="form-opts clearfix" style="margin-bottom: 10px;">
          <div class="opts-left">
            <router-link :to="{ path: '/login' }">
              <el-link type="primary">返回登录</el-link>
            </router-link>
          </div>
        </div>
        <el-form-item>
          <el-button
            type="primary"
            size="medium"
            class="login-btn"
            :loading="formLoading"
            :disabled="!registerKey"
            @click="loginPassword">绑定账户</el-button>
        </el-form-item>
        <div class="form-opts clearfix">
          <div class="opts-text">
            <p>请输入已有 CodeGalaxy 账户的邮箱和密码，将第三方身份关联到该账户。</p>
            <p>如果尚未创建账户，请返回登录页并先使用邮箱完成注册。</p>
          </div>
        </div>
      </el-form>
    </div>
    <union-captcha ref="captcha" @ready="() => captchaReady = true" />
  </div>
</template>

<script>
import MixinLogin from '../mixins/login'
import UnionCaptcha from '@/views/components/UnionCaptcha.vue'

export default {
  name: 'ThirdPartyBindAccount',
  components: { UnionCaptcha },
  mixins: [MixinLogin],
  data () {
    return {
      mainForm: {
        account: null,
        password: null
      },
      formLoading: false,
      registerKey: null,
      captchaReady: false
    }
  },
  computed: {
    title () {
      return this.$store.state.settings.title
    },
    mainFormRules () {
      return {
        account: [
          { required: true, message: '邮箱不能为空', trigger: 'change' }
        ],
        password: [
          { required: true, message: '密码不能为空', trigger: 'change' }
        ]
      }
    }
  },
  created () {
    const registerKey = this.$route.query.register_key
    if (registerKey) {
      this.registerKey = registerKey
    } else {
      this.$message.error('缺少必要参数')
    }
  },
  methods: {
    // 帐号密码登录
    loginPassword () {
      this.formLoading = true
      this.$refs['main-form'].validate((valid) => {
        if (!valid) {
          this.formLoading = false
          return false
        }
        this.$refs.captcha.execute(captcha => {
          this.$store.dispatch('user/login', {
            account: this.mainForm.account,
            password: this.mainForm.password,
            captcha,
            register_key: this.registerKey
          }).then((res) => {
            this.$message.success('账户绑定成功')
            this.redirectForLogin()
          }).finally(() => {
            this.formLoading = false
          })
        })
      }, 'user/login')
    },
    // url跳转
    goto (url) {
      window.location.href = url
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss">
.wrapper-bindaccount {
  position: relative;
  width: 100%;
  height: 100%;
  background-image: url('../../../assets/img/background.png');
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
    height: 440px;
    position: absolute;
    top: -100px;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    .project-title {
      margin-bottom: 30px;
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
        .opts-left {
          display: inline-block;
        }
        .opts-right {
          float: right;
        }
        .opts-text {
          font-size: 13px;
          line-height: 1.5;
          color: #909399;
          p {
            margin: 8px 0;
          }
        }
      }
      .login-btn {
        width: 100%;
      }
      .form-divider {
        color: #909399;
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
