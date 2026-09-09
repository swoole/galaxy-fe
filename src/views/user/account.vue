<template>
  <div class="user-main box-shadow">
    <div class="account-overview">
      <easy-title title="登录帐号" margin-set="0 20" />
      <el-descriptions direction="vertical" :column="1" :colon="false" labelClassName="desc-label" contentClassName="desc-content">
        <el-descriptions-item label="登录邮箱">
          <template v-if="profile.email">
            <span class="operator-desc">{{ profile.email }}</span>
            <router-link :to="{ path: '/user/account/bindemail' }">
              <el-button class="operator-btn" plain type="primary" size="small">更改邮箱</el-button>
            </router-link>
          </template>
          <template v-else>
            <span class="operator-desc">未绑定邮箱</span>
            <router-link :to="{ path: '/user/account/bindemail' }">
              <el-button class="operator-btn" plain type="primary" size="small">绑定邮箱</el-button>
            </router-link>
          </template>
        </el-descriptions-item>
        <el-descriptions-item label="登录密码">
          <template v-if="profile.has_password">
            <span class="operator-desc">**********</span>
            <router-link :to="{ path: '/user/account/setpassword' }">
              <el-button class="operator-btn" plain type="primary" size="small">修改密码</el-button>
            </router-link>
          </template>
          <template v-else>
            <span class="operator-desc">未设置密码</span>
            <router-link :to="{ path: '/user/account/setpassword' }">
              <el-button class="operator-btn" plain type="primary" size="small">设置密码</el-button>
            </router-link>
          </template>
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script>
import EasyTitle from '../components/EasyTitle'
import { userSimpleProfile } from '@/api/user'

export default {
  name: 'UserAccount',
  components: {
    EasyTitle
  },
  data () {
    return {
      // 用户基本信息
      profile: {}
    }
  },
  created () {
    this.loadProfile()
  },
  methods: {
    // 加载用户信息
    loadProfile () {
      userSimpleProfile().then(res => {
        this.profile = res.data.user
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.user-main {
  width: 100%;
  background: #fff;
  padding: 25px 15px;
  .account-overview {
    .operator-desc {
      display: inline-block;
      min-width: 180px;
      margin-right: 20px;
    }
    .operator-password {
      width: 180px;
      margin-right: 20px;
    }
  }
}

.box-shadow {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
</style>
