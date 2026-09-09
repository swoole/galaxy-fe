<template>
  <div class="user-layout-container">
    <div class="user-layout-nav">
      <div class="user-layout-nav-header">
        <router-link :to="{ path: '/user' }">
          <img class="user-avatar clearfix" :src="avatar" alt="用户头像">
          <div class="user-name">
            <span class="user-nickname oneline-ellipsis" :title="nickname">{{ nickname }}</span>
            <span class="user-email oneline-ellipsis" :title="email">{{ email }}</span>
          </div>
        </router-link>
      </div>
      <div class="user-layout-nav-main">
        <div class="menu-container">
          <user-submenu title="基本信息">
            <user-menu-item to="/user/account" icon="user" title="帐号信息" />
            <user-menu-item to="/user/profile" icon="user" title="个人信息" />
            <!-- <user-menu-item to="/user/notification" icon="user" title="隐私设置" /> -->
            <user-menu-item to="/user/myorg" icon="user" title="我的组织" />
          </user-submenu>
          <user-submenu title="消息中心">
            <user-menu-item to="/user/notification" icon="user" title="我的消息" />
            <user-menu-item to="/user/notification/setting" icon="user" title="通知设置" />
          </user-submenu>
          <user-submenu title="安全设置">
            <user-menu-item to="/user/sshkey" icon="user" title="私人 SSH 密钥" />
            <user-menu-item to="/user/gitauth" icon="user" title="Git授权访问" />
            <user-menu-item to="/user/login/history" icon="user" title="登录日志" />
          </user-submenu>
          <!-- <user-submenu title="其他">
            <user-menu-item to="/user/notification" icon="user" title="注销帐号" />
          </user-submenu> -->
        </div>
      </div>
    </div>
    <div class="user-layout-main">
      <router-view :key="routerKey" />
    </div>
  </div>
</template>

<script>
import UserSubmenu from './components/user/Submenu'
import UserMenuItem from './components/user/MenuItem'
import { userAvatar } from '@/utils/filters'

export default {
  name: 'UserLayout',
  components: {
    UserSubmenu,
    UserMenuItem
  },
  data () {
    return {

    }
  },
  computed: {
    routerKey () {
      return this.$route.fullPath
    },
    // 用户头像
    avatar () {
      return userAvatar(this.$store.state.user.user.avatar)
    },
    // 用户昵称
    nickname () {
      return this.$store.state.user.user.nickname || '未填写昵称'
    },
    // 用户邮箱
    email () {
      return this.$store.state.user.user.email || '未设置邮箱'
    }
  },
  created () {
  },
  methods: {

  }
}
</script>

<style lang="scss" scoped>
.user-layout-container {
  position: relative;
  margin: 25px auto 0 auto;
  max-width: 1400px;
  min-width: 1024px;
  .user-layout-nav {
    width: 260px;
    background: #fff;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    .user-layout-nav-header {
      padding: 15px;
      background: #F2F2F2;
      .user-avatar {
        float: left;
        width: 60px;
        height: 60px;
        border-radius: 30px;
        vertical-align: middle;
      }
      .user-name {
        margin-left: 70px;
        .user-nickname {
          display: inline-block;
          width: 160px;
          font-size: 14px;
          line-height: 32px;
          color: rgba(0, 0, 0, 0.755);
        }
        .user-email {
          display: block;
          width: 160px;
          font-size: 13px;
          line-height: 28px;
          color: #909399;
        }
      }
    }
    // .user-layout-nav-main {
    //   .menu-container {
    //   }
    // }
  }
  .user-layout-main {
    position: absolute;
    left: 280px;
    right: 0;
    top: 0;
  }
}
</style>
