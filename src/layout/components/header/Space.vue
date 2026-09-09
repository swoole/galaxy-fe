<template>
  <div class="space-component">
    <div class="header-space">
      <el-tooltip effect="dark" content="点击切换组织" placement="bottom-end">
        <div class="header-space-item" @click="showChangeOrg">
          <div class="space-item-change-org">
            <svg-icon icon-class="exchange" />
          </div>
        </div>
      </el-tooltip>

      <el-popover
        placement="top-end"
        width="360"
        v-model="popoverNotifyVisiable">
        <el-tabs v-model="activeNotifyTab" @tab-click="notifyChannelChange">
          <el-tab-pane label="站内信" name="notify">
            <div class="notify-container">
              <ul class="notify-list">
                <template v-if="notifys.length > 0">
                  <li
                    v-for="(notify, index) in notifys"
                    :key="index"
                    class="notify-item"
                    @click="handleNotifyProfile(notify)">
                    <div class="notify-title" :class="{ 'notify-unread': notify.read_at == 0 }">
                      <el-badge is-dot :hidden="notify.read_at > 0"></el-badge>
                      {{ notify.title }}
                      <div class="notify-tag">
                        <el-tag
                          v-if="NOTIFY_SCENES[notify.scene]"
                          size="mini"
                          :type="NOTIFY_SCENES[notify.scene].type">
                          {{ NOTIFY_SCENES[notify.scene].label }}
                        </el-tag>
                      </div>
                    </div>
                    <div class="notify-desc">
                      {{ notify.created_at | formatDate }}
                    </div>
                  </li>
                </template>
                <li v-else class="notify-item">
                  <div class="notify-title">没有此类未读消息</div>
                </li>
              </ul>
            </div>
            <el-button-group style="width: 100%">
              <el-button plain :disabled="notifys.length == 0" style="width: 50%" size="small" @click="handleNotifySetReadAll">
                全部设为已读
              </el-button>
              <el-button plain style="width: 50%" size="small" @click="handleNotifyMore">
                查看更多
              </el-button>
            </el-button-group>
          </el-tab-pane>
          <!-- <el-tab-pane label="站内信" name="message">着内心</el-tab-pane> -->
          <!-- <el-tab-pane label="待办" name="todo">角色管理</el-tab-pane> -->
        </el-tabs>
        <div slot="reference" class="header-space-item">
          <div class="space-item-notification">
            <el-badge is-dot style="line-height: initial;" :hidden="dotNotification">
              <svg-icon icon-class="notification" />
            </el-badge>
          </div>
        </div>
      </el-popover>

      <el-tooltip effect="dark" content="点击查看使用文档" placement="bottom-end">
        <project-link class="header-space-item" :to="manual">
          <div class="space-item-help">
            <svg-icon icon-class="help" />
          </div>
        </project-link>
      </el-tooltip>

      <el-tooltip effect="dark" content="返回官网" placement="bottom-end">
        <project-link class="header-space-item" :to="officialWebsite">
          <div class="space-item-home">
            <svg-icon icon-class="home" />
          </div>
        </project-link>
      </el-tooltip>

      <div class="header-space-item">
        <el-dropdown class="space-item-avatar" trigger="hover">
          <div class="avatar-wrapper">
            <img :src="avatar" class="user-avatar" alt="用户头像">
            <i class="el-icon-caret-bottom" style="color: #fff;" />
          </div>
          <el-dropdown-menu slot="dropdown" class="user-dropdown">
            <div class="account-wrapper">
              <img :src="avatar" class="user-avatar" alt="用户头像">
              <div class="user-name">
                <span class="user-nickname oneline-ellipsis" :title="nickname">{{ nickname }}</span>
                <span class="user-email oneline-ellipsis" :title="email">{{ email }}</span>
              </div>
            </div>
            <router-link :to="{ name: 'User' }">
              <el-dropdown-item divided >
                <svg-icon icon-class="user" /> 帐户设置
              </el-dropdown-item>
            </router-link>
            <router-link :to="{ name: 'AppMarketInstallations' }">
              <el-dropdown-item>
                <svg-icon icon-class="list" /> 安装记录
              </el-dropdown-item>
            </router-link>
            <el-dropdown-item @click.native="logout" divided>
              <svg-icon icon-class="logout" /> 退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </div>

    <!-- 切换组织 -->
    <el-dialog
      class="change-org"
      title="切换组织"
      :visible.sync="dialogChangeOrgVisible"
      width="550px"
      :append-to-body="true"
    >
      <div class="change-org-ctrl">
        <el-input v-model="orgFilterKeyword" class="change-org-ctrl-input" placeholder="请输入组织名称、标识进行搜索" size="small" />
      </div>
      <div class="change-org-list">
        <el-table
          v-if="orgs.length > 0"
          v-loading="orgsLoading"
          :data="filteredOrgs"
          style="width: 100%">
          <el-table-column
            prop="title"
            label="组织名称">
            <template #default="{ row }">
              <div class="org-name">
                <img :src="row.logo | orgLogo" alt="组织LOGO" class="org-logo" />
                <el-link class="org-title" type="primary" @click="changeOrg(row)">{{ row.title }}</el-link>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="role"
            label="角色"
            width="80"
            align="center">
            <template #default="{ row }">
              <org-member-role :role="row.role" />
            </template>
          </el-table-column>
        </el-table>
        <div v-else class="no-org-tips">
          您当前不在任何组织内，请
          <el-link type="primary" @click="handleCreateOrg" style="vertical-align: inherit; font-size: 13px;">
            创建组织
          </el-link>
          或者让组织管理员添加您
        </div>
      </div>

    </el-dialog>

    <notify-profile ref="notify-profile" />
  </div>
</template>

<script>
import { orgsSimple, orgSwitch } from '@/api/org'
import ProjectLink from '../Link'
import { orgLogo, userAvatar, formatDate } from '@/utils/filters'
import OrgMemberRole from '@/views/components/OrgMemberRole'
import {
  notifyListen,
  notifySimple,
  notifySetReadAll
} from '@/api/user'
import {
  NOTIFY_SCENES
} from '@/consts/user'
import NotifyProfile from '@/views/user/components/NotifyProfile'

export default {
  name: 'Space',
  components: {
    ProjectLink,
    OrgMemberRole,
    NotifyProfile
  },
  filters: {
    orgLogo,
    formatDate
  },
  data () {
    return {
      // 是否显示切换组织对话框
      dialogChangeOrgVisible: false,
      // 组织筛选关键词
      orgFilterKeyword: null,
      // 组织列表加载装
      orgsLoading: false,
      // 组织列表
      orgs: [],
      // 是否显示通知框
      popoverNotifyVisiable: false,
      // 当前激活的通知渠道
      activeNotifyTab: 'notify',
      // 通知列表
      notifys: [],
      // 常量
      NOTIFY_SCENES
    }
  },
  computed: {
    // 关键词已过滤的组装列表
    filteredOrgs () {
      if (!this.orgFilterKeyword) {
        return this.orgs
      }

      const keyword = this.orgFilterKeyword.toLowerCase()
      return this.orgs.filter(
        item => item.title.toLowerCase().indexOf(keyword) > -1
      )
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
    },
    // 用户手册
    manual () {
      return this.$store.state.settings.manual
    },
    // 用户手册
    officialWebsite () {
      return this.$store.state.settings.officialWebsite
    },
    // 给通知增加小红点
    dotNotification () {
      return this.notifys.filter(notify => notify.read_at == 0).length == 0
    },
    orgRole () {
      return this.$store.state.user.lastOrg.role || 0
    }
  },
  created () {
    // 更新用户信息
    this.updateUserProfile()
    // 加载通知列表
    this.loadNotifys()
  },
  mounted () {
    if (process.env.VUE_APP_NOTIFY_LISTEN !== 'disabled') {
      // 监听消息
      this.startListenNotify()
    }
  },
  methods: {
    // 切换通知渠道
    notifyChannelChange (tab, even) {

    },
    // 显示切换组织对话框
    showChangeOrg () {
      this.dialogChangeOrgVisible = true

      // 选择加载组织列表
      if (this.orgs.length == 0) {
        this.orgsLoading = true
        orgsSimple().then(res => {
          this.orgs = res.data.orgs
        }).finally(() => {
          this.orgsLoading = false
        })
      }
    },
    // 切换组织
    changeOrg (org) {
      orgSwitch(org.id).then(res => {
        this.$store.dispatch('user/changeOrg', org).then(() => {
          this.dialogChangeOrgVisible = false

          // const query = JSON.parse(JSON.stringify(this.$route.query))
          // query['_t'] = Date.now()
          // this.$router.push({
          //   path: this.$route.path,
          //   params: this.$route.params,
          //   query
          // })
          // 切换组织强制跳转页面到项目列表页，并强制刷新页面（比如可能存在权限、页面数据缓存）
          this.$router.push({ name: 'Project', query: { _t: Date.now() } })
        })
      })
    },
    // 退出登录
    async logout () {
      await this.$store.dispatch('user/logout')
      this.$nextTick(function () {
        this.$router.push(`/login?redirect=${encodeURIComponent(this.$route.fullPath)}`)
      })
    },
    // 更新用户信息
    updateUserProfile () {
      if (this.$store.state.user.token) {
        this.$store.dispatch('user/userProfile')
      }
    },
    // 触发创建组织
    handleCreateOrg () {
      this.dialogChangeOrgVisible = false

      if (this.$route.name != 'UserMyOrgCreate') {
        this.$router.push({ name: 'UserMyOrgCreate' })
      }
    },
    // 监听消息
    startListenNotify (begin = null) {
      notifyListen(begin).then(res => {
        const messages = res.data.messages.sort((a, b) => a.notify_at - b.notify_at)
        if (messages.length > 0) {
          begin = messages[messages.length - 1].notify_at
          this.sendBrowserNotify(messages)
        }
      }).finally(() => {
        setTimeout(() => {
          this.startListenNotify(begin)
        }, 2000)
      })
    },
    // 浏览器通知
    sendBrowserNotify (messages) {
      if (!window.Notification || Notification.permission == 'denied') {
        return
      }

      Notification.requestPermission(status => {
        if (status == 'granted') {
          messages.forEach(message => {
            // eslint-disable-next-line no-new
            new Notification(message.title, { body: message.body })
          })
        }
      })
    },
    // 通知列表
    loadNotifys () {
      notifySimple().then(res => {
        this.notifys = res.data.notifys
      })
    },
    // 前往通知列表
    handleNotifyMore () {
      this.popoverNotifyVisiable = false
      if (this.$route.name != 'UserNotification') {
        this.$router.push({ name: 'UserNotification' })
      }
    },
    // 设置为已读
    handleNotifySetReadAll () {
      notifySetReadAll().then(res => {
        this.$message.success('操作成功')
        this.loadNotifys()
      })
    },
    // 通知详情
    handleNotifyProfile (row) {
      this.popoverNotifyVisiable = false
      this.$refs['notify-profile'].handleDetail(row)
    }
  }
}
</script>

<style lang="scss" scoped>
.space-component {
  width: 315px;
  .header-space {
    float: right;
    font-size: 14px;
    color: #fff;
    .header-space-item {
      display: inline-block;
      padding: 0 12px;
      margin-right: 10px;
      cursor: pointer;
      &:hover {
        background: #242D3C;
      }
      .space-item-avatar {
        .avatar-wrapper {
          .user-avatar {
            height: 24px;
            width: 24px;
            border-radius: 12px;
            vertical-align: middle;
          }
        }
      }
    }
  }
}

// 用户下拉框
.user-dropdown {
  .account-wrapper {
    padding: 0 20px 0px 15px;
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
        line-height: 28px;
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
}

// 切换企业
.change-org {
  .change-org-ctrl {
    .change-org-ctrl-input {
      width: 300px;
    }
  }
  .change-org-list {
    .org-name {
      line-height: 32px;
      .org-logo {
        float: left;
        width: 32px;
        height: 32px;
        border-radius: 3px;
      }
      .org-title {
        margin-left: 10px;
      }
    }
  }
  .no-org-tips {
    margin-top: 15px;
    padding: 8px 5px;
    font-size: 13px;
  }
}

// 消息通知
.notify-container {
  .notify-list {
    margin: 0;
    padding: 0;
    .notify-item {
      list-style: none;
      padding: 8px 5px;
      border-bottom: 1px solid #F0F0F0;
      cursor: pointer;
      .notify-title {
        margin-bottom: 6px;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.755);
        .notify-tag {
          float: right;
        }
        &.notify-unread {
          font-weight: 600;
        }
      }
      .notify-desc {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}
</style>
