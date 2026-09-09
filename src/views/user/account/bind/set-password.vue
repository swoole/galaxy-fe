<template>
  <div class="user-main box-shadow">
    <easy-title title="修改密码" margin-set="0 20" />

    <el-steps :align-center="true" :active="activeStep" finish-status="finish">
      <el-step title="身份校验"></el-step>
      <el-step title="设置密码"></el-step>
      <el-step title="操作完成"></el-step>
    </el-steps>

    <div class="steps">
      <div v-if="activeStep === 1" class="step-idauth">
        <template v-if="idauthType == 'password'">
          <div class="desc-normal desc-idauth">
            <template v-if="profile.email">
              如果忘记旧密码，可以切换到使用
              <el-link type="primary" @click="idauthType = 'emailcode'">邮件验证码校验</el-link>。
            </template>
            <template v-else>
              当前账户没有可用邮箱，请联系系统管理员恢复账户。
            </template>
          </div>
          <idauth-password passwordLabel="旧密码" :goBack="goBack" @finish="finishIdauth('password')"></idauth-password>
        </template>
        <template v-if="idauthType == 'emailcode'">
          <div class="desc-normal desc-idauth">
            <template v-if="profile.has_password">
              您也可以切换到使用
              <el-link type="primary" @click="idauthType = 'password'">旧密码校验</el-link>。
            </template>
          </div>
          <idauth-emailcode :profile="profile" :goBack="goBack" @finish="finishIdauth('emailcode')"></idauth-emailcode>
        </template>
      </div>
      <div v-if="activeStep === 2" class="step-resetpasswd-check">
        <el-form
          class="resetpasswd-check-form"
          label-position="right"
          label-width="100px"
          :model="checkForm"
          @submit.native.prevent="resetPassword">
          <el-form-item label="新密码">
            <el-input
              v-model="checkForm.password"
              class="form-item-control"
              placeholder="请输入新密码"
              name="password"
              type="password"
              aria-autocomplete="off"
              autocomplete="off" />
          </el-form-item>
          <el-form-item label="确认密码">
            <el-input
              v-model="checkForm.password_retry"
              class="form-item-control"
              placeholder="请输入确认密码"
              name="password_retry"
              type="password"
              aria-autocomplete="off"
              autocomplete="off" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="resetPassword">设置密码</el-button>
            <el-button @click="goBack">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
      <div v-if="activeStep === 3" class="step-result">
        <el-result icon="success" title="绑定成功">
          <template slot="subTitle">
            您已成功设置新密码，旧密码将失效。
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
import IdauthEmailcode from './components/idauth-emailcode'
import { actResetPassword, actIdauthStatus } from '@/api/account'

export default {
  name: 'UserAccountSetPassword',
  components: {
    EasyTitle,
    IdauthPassword,
    IdauthEmailcode
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
      // 新密码验证
      checkForm: {
        password: null,
        password_retry: null
      },
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
        if (this.profile.has_password) {
          this.idauthType = 'password'
        } else if (this.profile.email) {
          this.idauthType = 'emailcode'
        }
      })
    },
    // 完成身份校验事件监听
    finishIdauth (idauthType) {
      this.activeStep = 2
    },
    // 重置密码
    resetPassword () {
      if (!this.checkForm.password) {
        return this.$message.error('请先填写新密码')
      }
      if (!this.checkForm.password_retry) {
        return this.$message.error('请先填写确认密码')
      }
      if (this.checkForm.password != this.checkForm.password_retry) {
        return this.$message.error('两次密码不一致')
      }

      const loading = this.$loading()
      actResetPassword(this.checkForm.password, this.checkForm.password_retry).then(res => {
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

.resetpasswd-check-form {
  .form-item-control {
    width: 240px;
  }
}

.box-shadow {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
</style>
