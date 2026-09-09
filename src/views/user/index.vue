<template>
  <div class="user-main">
    <div class="overview box-shadow">
      <div class="basic-overview">
        <div class="account-wrapper">
          <img :src="profile.avatar | userAvatar" class="user-avatar" alt="用户头像">
          <div class="user-name">
            <span class="user-nickname oneline-ellipsis" :title="nickname">{{ nickname }}</span>
            <span class="user-email oneline-ellipsis" :title="email">{{ email }}</span>
          </div>
        </div>
        <div class="operator">
          <router-link :to="{ path: '/user/profile' }">
            <el-button plain type="primary" size="small">修改基本信息</el-button>
          </router-link>
        </div>
      </div>
      <div class="basic-desc">
        <el-descriptions direction="vertical" :column="6" :colon="false" labelClassName="desc-label" contentClassName="desc-content">
          <el-descriptions-item label="用户名">
            <div class="oneline-ellipsis" :title="profile.username">{{ profile.username }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="最近登录">{{ profile.last_login | formatDate }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ profile.register_at | formatDate }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <easy-title title="基本信息" margin-set="30 20" />

    <el-row class="basic-info" :gutter="15">
      <el-col :span="12">
        <div class="basic-info-item box-shadow">
          <div class="icon">
            <svg-icon icon-class="user" />
          </div>
          <div class="title">邮箱</div>
          <template v-if="profile.email">
            <div class="desc">
              已绑定邮箱：{{ profile.email }}
            </div>
            <div class="operator">
              <router-link :to="{ path: '/user/account/bindemail' }">
                <el-button plain type="primary" size="small">修改</el-button>
              </router-link>
            </div>
          </template>
          <template v-else>
            <div class="desc">
              未绑定邮箱，建议您绑定邮箱，绑定邮箱之后可以用于帐号登录。
            </div>
            <div class="operator">
              <router-link :to="{ path: '/user/account/bindemail' }">
                <el-button plain type="primary" size="small">去绑定</el-button>
              </router-link>
            </div>
          </template>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="basic-info-item box-shadow">
          <div class="icon">
            <svg-icon icon-class="user" />
          </div>
          <div class="title">密码</div>
          <template v-if="profile.has_password">
            <div class="desc">
              已设置密码
            </div>
            <div class="operator">
              <router-link :to="{ path: '/user/account/setpassword' }">
                <el-button plain type="primary" size="small">修改密码</el-button>
              </router-link>
            </div>
          </template>
          <template v-else>
            <div class="desc">
              未设置登录密码，建议您设置登录密码。
            </div>
            <div class="operator">
              <router-link :to="{ path: '/user/account/setpassword' }">
                <el-button plain type="primary" size="small">设置密码</el-button>
              </router-link>
            </div>
          </template>
        </div>
      </el-col>
    </el-row>

    <easy-title title="我的组织" margin-set="30 20" />

    <el-table
      class="my-orgs"
      :data="orgs">
      <el-table-column
        prop="title"
        label="名称">
        <template #default="{ row }">
          <div class="org-name">
            <img :src="row.logo | orgLogo" alt="组织LOGO" class="org-logo" />
            <span class="org-title">{{ row.title }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="role"
        label="角色"
        width="100"
        align="center">
        <template #default="{ row }">
          <org-member-role :role="row.role" />
        </template>
      </el-table-column>
      <el-table-column
        prop="join_at"
        label="加入时间"
        align="center">
        <template #default="{ row }">
          {{ row.join_at | formatDate }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        align="center">
        <template #default="{ row }">
          <el-link type="primary" @click="enterOrg(row)">进入组织</el-link>
          <el-divider direction="vertical"></el-divider>
          <el-link type="danger" @click="exitOrg(row)">退出组织</el-link>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import { orgExit, orgs, orgSwitch } from '@/api/org'
import { userSimpleProfile } from '@/api/user'
import EasyTitle from '../components/EasyTitle'
import OrgMemberRole from '../components/OrgMemberRole'
import { orgLogo, formatDate, userAvatar } from '@/utils/filters'

export default {
  name: 'User',
  components: {
    EasyTitle,
    OrgMemberRole
  },
  filters: {
    orgLogo,
    formatDate,
    userAvatar
  },
  data () {
    return {
      // 用户基本信息
      profile: {},
      // 我的组织列表
      orgs: []
    }
  },
  computed: {
    // 用户昵称
    nickname () {
      return this.profile.nickname || '未填写昵称'
    },
    // 用户邮箱
    email () {
      return this.profile.email || '未设置邮箱'
    }
  },
  created () {
    this.loadOrgs()
    this.loadProfile()
  },
  methods: {
    // 加载组织列表
    loadOrgs () {
      orgs().then(res => {
        this.orgs = res.data.orgs
      })
    },
    // 加载用户信息
    loadProfile () {
      userSimpleProfile().then(res => {
        this.profile = res.data.user
      })
    },
    // 进入组织
    enterOrg (org) {
      orgSwitch(org.id).then(res => {
        this.$store.dispatch('user/changeOrg', org).then(() => {
          this.dialogChangeOrgVisible = false
          this.$router.push({ name: 'Home' })
        })
      })
    },
    // 退出组织
    exitOrg (org) {
      if (this.$p('org.exit', org.role)) {
        this.$confirm(`您确定要退出组织【${org.title}】？`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          const loading = this.$loading()
          orgExit(org.id).then(res => {
            this.$message.success('您已退出当前组织')
            this.orgs.forEach((row, index) => {
              if (row.id == org.id) {
                this.orgs.splice(index, 1)
              }
            })
          }).finally(() => {
            loading.close()
          })
        })
      } else {
        this.$message.warning('负责人角色暂不支持退出组织')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.user-main {
  width: 100%;
  .overview {
    width: 100%;
    background: #fff;
    padding: 10px 15px;
    .basic-overview {
      position: relative;
      border-bottom: 1px solid #dcdfe6;
      padding-bottom: 10px;
      .account-wrapper {
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
      .operator {
        position: absolute;
        right: 0;
        top: 12px;
      }
    }
    .basic-desc {
      padding-top: 20px;
    }
  }
  .basic-info {
    .basic-info-item {
      background: #fff;
      padding: 10px 15px;
      .icon, .title {
        color: rgba(0, 0, 0, 0.755);
        font-size: 14px;
        line-height: 24px;
      }
      .desc {
        margin: 8px 0;
        color: #909399;
        font-size: 13px;
        line-height: 20px;
        min-height: 60px;
      }
    }
  }
  .my-orgs {
    padding: 10px 15px;
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
}

.box-shadow {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

</style>
