<template>
  <div class="user-main box-shadow">
    <easy-title title="绑定邮箱" margin-set="0 20" />

    <el-steps :align-center="true" :active="activeStep" finish-status="finish">
      <el-step title="身份校验"></el-step>
      <el-step title="新邮箱校验"></el-step>
      <el-step title="绑定成功"></el-step>
    </el-steps>

    <div class="steps">
      <div v-if="activeStep === 1" class="step-idauth">
        <template v-if="idauthType == 'password'">
          <div class="desc-normal desc-idauth">
            修改登录邮箱需要先验证当前密码，再验证新邮箱。
          </div>
          <idauth-password :goBack="goBack" @finish="finishIdauth('password')"></idauth-password>
        </template>
      </div>
      <div v-if="activeStep === 2" class="step-newemail-check">
        <el-form
          class="newemail-check-form"
          label-position="right"
          label-width="100px"
          :model="checkForm"
          @submit.native.prevent="newEmailcodeCheck">
          <el-form-item label="新邮箱">
            <el-input
              v-model="checkForm.email"
              class="form-item-control"
              placeholder="请输入要绑定的邮箱地址"
              name="email"
              aria-autocomplete="off"
              autocomplete="off" />
          </el-form-item>
          <el-form-item class="form-item-emailcode" label="邮件验证码">
            <el-input
              v-model="checkForm.emailcode"
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
            <el-button type="primary" @click="newEmailcodeCheck">绑定邮箱</el-button>
            <el-button @click="goBack">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
      <div v-if="activeStep === 3" class="step-result">
        <el-result icon="success" title="绑定成功">
          <template slot="subTitle">
            您已成功绑定邮箱{{ checkForm.email }}，该邮箱也将作为帐号使用，请您妥善保管此邮箱。
          </template>
          <template slot="extra">
            <router-link :to="{ path: '/user/account' }">
              <el-button type="primary" size="medium">返回帐号信息</el-button>
            </router-link>
          </template>
        </el-result>
      </div>
    </div>
  </div>
</template>

<script>
import EasyTitle from '../../../components/EasyTitle'
import { userSimpleProfile } from '@/api/user'
import IdauthPassword from './components/idauth-password'
import { actNewemailcodeSend, actIdauthNewemailcode, actIdauthStatus } from '@/api/account'

export default {
  name: 'UserAccountBindEmail',
  components: {
    EasyTitle,
    IdauthPassword
  },
  data () {
    return {
      // 当前身份验证状态
      authStatus: 0,
      // 当前step
      activeStep: 1,
      // 用户基本信息
      profile: {},
      // 用户身份校验方式
      idauthType: 'password',
      // 新邮箱验证
      checkForm: {
        email: null,
        emailcode: null
      },
      // 验证码休眠时间
      emailcodeSleep: 0,
      // 验证码按钮loading
      emailcodeFormLoading: false,
      // 绑定结果
      bindResult: null
    }
  },
  created () {
    this.actIdauthStatus()
    this.loadUserProfile()
  },
  methods: {
    // 获取验证状态
    actIdauthStatus () {
      actIdauthStatus().then(res => {
        this.authStatus = res.data.status
        this.$nextTick(function () {
          if (this.authStatus === 1) {
            this.activeStep = 2
          }
        })
      })
    },
    // 加载用户信息
    loadUserProfile () {
      userSimpleProfile().then(res => {
        this.profile = res.data.user
      })
    },
    // 完成身份校验事件监听
    finishIdauth (idauthType) {
      this.activeStep = 2
    },
    // 获取邮件验证码
    sendEmailCode () {
      if (!this.checkForm.email) {
        return this.$message.error('请先填写新邮箱')
      }

      this.emailcodeFormLoading = true
      actNewemailcodeSend(
        this.checkForm.email
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
    // 新邮件验证码校验
    newEmailcodeCheck () {
      if (!this.checkForm.email) {
        return this.$message.error('请先填写新邮箱')
      }
      if (!this.checkForm.emailcode) {
        return this.$message.error('请先填写邮件验证码')
      }

      const loading = this.$loading()
      actIdauthNewemailcode(this.checkForm.email, this.checkForm.emailcode).then(res => {
        this.bindResult = true
        this.activeStep = 3
      }).finally(() => {
        loading.close()
      })
    },
    // 取消
    goBack () {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push({ path: '/user/account' })
    }
  }
}
</script>

<style lang="scss" scoped>
.user-main {
  width: 100%;
  background: #fff;
  padding: 25px 15px;
  .steps {
    margin: 20px 14%;
    .step-idauth {
      .desc-idauth {
        margin-bottom: 20px;
      }
    }
  }
}

.newemail-check-form {
  .form-item-control {
    width: 240px;
  }
}

.form-item-emailcode {
  .form-item-emailcode-input {
    width: 110px;
    float: left;
    margin-right: 10px;
  }
}

.box-shadow {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
</style>
