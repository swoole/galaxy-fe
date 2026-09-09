<template>
  <el-popover
    v-if="user"
    :placement="position"
    width="300"
    class="org-user"
    trigger="hover"
    :open-delay="100"
  >
    <div class="popover-info">
      <div class="account-wrapper">
        <img :src="profile.avatar" class="user-avatar" alt="用户头像">
        <div class="user-name">
          <span class="user-nickname oneline-ellipsis" :title="profile.nickname">
            {{ profile.nickname }}
          </span>
          <span class="user-email oneline-ellipsis" :title="profile.email">
            {{ profile.email }}
          </span>
        </div>
      </div>
      <div class="org-info">
        <div class="org-info-item">
          <span class="org-info-item-label">真实姓名：</span>
          <span class="org-info-item-content">{{ profile.realname || profile.nickname }}</span>
        </div>
        <div class="org-info-item">
          <span class="org-info-item-label">工号：</span>
          <span class="org-info-item-content">{{ profile.workcode }}</span>
        </div>
      </div>
    </div>
    <el-link
      slot="reference"
      class="org-user-name"
      type="primary"
      :underline="false">
      {{ profile.realname ? `${profile.realname}(${profile.nickname})` : profile.nickname }}
    </el-link>
  </el-popover>
  <span v-else>
    <slot name="empty">未知用户</slot>
  </span>
</template>

<script>
import { userAvatar } from '@/utils/filters'

export default {
  name: 'OrgUser',
  props: {
    position: {
      type: String,
      default: 'bottom'
    },
    user: {
      type: Object,
      required: false,
      default: null
    }
  },
  computed: {
    profile () {
      if (typeof this.user !== 'object' || this.user === null) {
        return {
          realname: '用户信息关联错误',
          nickname: '用户信息关联错误',
          email: '用户信息关联错误',
          workcode: '用户信息关联错误',
          avatar: null,
          id: 0
        }
      }

      const profile = {
        id: this.user.id
      }
      profile['realname'] = this.user.realname || ''
      profile['nickname'] = this.user.nickname || '未设置昵称'
      profile['email'] = this.user.email || '未绑定邮箱'
      profile['workcode'] = this.user.workcode || '未设置工号'
      profile['avatar'] = userAvatar(this.user.avatar)

      return profile
    }
  }
}
</script>

<style lang="scss" scoped>
.account-wrapper {
  padding-bottom: 10px;
  border-bottom: 1px solid #dcdfe6;
  .user-avatar {
    float: left;
    height: 48px;
    width: 48px;
    border-radius: 24px;
    vertical-align: middle;
  }
  .user-name {
    margin-left: 58px;
    .user-nickname {
      display: inline-block;
      width: 160px;
      font-size: 14px;
      line-height: 24px;
      color: rgba(0, 0, 0, 0.755);
    }
    .user-email {
      display: block;
      width: 160px;
      font-size: 12px;
      line-height: 20px;
      color: #909399;
    }
  }
}

.org-info {
  margin-top: 10px;
  .org-info-item {
    font-size: 14px;
    line-height: 28px;
    .org-info-item-label {
      display: inline-block;
      width: 72px;
      font-weight: 600;
      text-align: right;
    }
  }
}
</style>
