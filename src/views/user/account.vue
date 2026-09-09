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

    <div class="thirdparty-overview">
      <easy-title title="第三方帐号绑定" margin-set="30 20" />
      <div class="desc-normal">
        建议您绑定第三方帐号，避免忘记帐号或者忘记密码，导致帐号无法登录。
      </div>
      <el-table
        class="thirdparty-list"
        :data="thirdparties">
        <el-table-column
          prop="channel"
          label="平台">
          <template #default="{ row }">
            <template v-if="row.channel_icon">
              <svg-icon class="tp-platform-icon" :icon-class="row.channel_icon" />
              <span class="tp-platform-name">{{ row.channel_name }}</span>
            </template>
            <template v-else>
              <span class="tp-platform-name">{{ row.channel_name }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column
          prop="nickname"
          label="帐号">
          <template #default="{ row }">
            <div class="account-name">
              <img :src="row.avatar | userAvatar" alt="用户头像" class="account-avatar" />
              <span class="account-nickname">{{ row.nickname }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="register_at"
          label="绑定时间"
          align="center">
          <template #default="{ row }">
            {{ row.register_at | formatDate }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          align="center">
          <template #default="{ row }">
            <el-link type="warning" @click="unbindThirdparty(row)">解绑</el-link>
          </template>
        </el-table-column>
      </el-table>
      <div class="desc-normal">
        您还可以绑定以下第三方帐号：
      </div>
      <div class="unbind-tp clearfix">
        <ul class="unbind-list">
          <li v-for="item in unbindThirdparties" :key="item.channel" class="unbind-item">
            <project-link class="unbind-item-link" :to="item.login_url">
              <svg-icon class="unbind-item-icon" :icon-class="item.channel_icon" />
              <span class="unbind-item-name">{{ item.channel_name }}</span>
            </project-link>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import EasyTitle from '../components/EasyTitle'
import { formatDate, userAvatar } from '@/utils/filters'
import { userSimpleProfile } from '@/api/user'
import { actThirdparties, actThirdpartyUnbind } from '@/api/account'
import { thirdpartySupports } from '@/api/auth'
import {
  TP_CONFIG
} from '@/consts/user'
import ProjectLink from '@/layout/components/Link'

export default {
  name: 'UserAccount',
  components: {
    EasyTitle,
    ProjectLink
  },
  filters: {
    formatDate,
    userAvatar
  },
  data () {
    return {
      // 用户基本信息
      profile: {},
      // 第三方登录帐号列表
      thirdparties: [],
      // 支持的第三方登录帐号列表
      thirdpartiesSupport: []
    }
  },
  computed: {
    // 未绑定的平台
    unbindThirdparties () {
      // 计算已绑定
      const bind = {}
      this.thirdparties.forEach(item => {
        bind[item.channel] = true
      })

      // 计算未绑定
      const unbinds = []
      this.thirdpartiesSupport.forEach(item => {
        if (!bind[item.channel] && TP_CONFIG[item.channel]) {
          unbinds.push({
            channel: item.channel,
            login_url: item.login_url,
            channel_name: TP_CONFIG[item.channel].name,
            channel_icon: TP_CONFIG[item.channel].icon
          })
        }
      })

      return unbinds
    }
  },
  created () {
    this.loadProfile()
    this.loadThirdparty()
  },
  methods: {
    // 加载用户信息
    loadProfile () {
      userSimpleProfile().then(res => {
        this.profile = res.data.user
      })
    },
    // 加载第三方登录帐号列表
    loadThirdparty () {
      actThirdparties().then(res => {
        const thirdparties = []
        const bind = {}
        res.data.thirdparties.forEach(item => {
          const newItem = {
            channel: item.channel,
            nickname: item.nickname,
            avatar: item.avatar,
            register_at: item.register_at
          }
          if (TP_CONFIG[item.channel]) {
            newItem['channel_name'] = TP_CONFIG[item.channel].name
            newItem['channel_icon'] = TP_CONFIG[item.channel].icon
          } else {
            newItem['channel_name'] = '未知平台'
            newItem['channel_icon'] = null
          }
          thirdparties.push(newItem)

          bind[item.channel] = true
        })
        this.thirdparties = thirdparties
      }).then(() => {
        // 拉取未支持列表
        thirdpartySupports().then(res => {
          this.thirdpartiesSupport = res.data.supports
        })
      })
    },
    // 解绑第三方登录帐号
    unbindThirdparty (act) {
      this.$confirm(`你确定要解绑【${act.channel_name}】第三方帐号吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loading = this.$loading()
        actThirdpartyUnbind(act.channel).then(res => {
          this.$message.success('解绑成功')
          // 移除数据
          this.thirdparties.forEach((item, index) => {
            if (item.channel == act.channel) {
              this.thirdparties.splice(index, 1)
            }
          })
        }).finally(() => {
          loading.close()
        })
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
  .thirdparty-list {
    margin-bottom: 20px;
    .tp-platform-icon {
      float: left;
      margin-right: 8px;
      font-size: 32px;
    }
    .tp-platform-name {
      line-height: 32px;
    }
    .account-name {
      .account-avatar {
        float: left;
        width: 32px;
        height: 32px;
        border-radius: 16px;
      }
      .account-nickname {
        margin-left: 10px;
        line-height: 32px;
      }
    }
  }
  .unbind-tp {
    .unbind-list {
      margin: 10px 0 0 0;
      padding: 0;
    }
    .unbind-item {
      float: left;
      margin-right: 20px;
      list-style: none;
      .unbind-item-link {
        display: block;
        width: 48px;
        text-align: center;
      }
      .unbind-item-icon {
        font-size: 32px;
      }
      .unbind-item-name {
        display: block;
        text-align: center;
        font-size: 13px;
        line-height: 24px;
        color: rgba(0, 0, 0, 0.755);
      }
    }
  }
}

.box-shadow {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
</style>
