<template>
  <div class="user-main box-shadow">
    <easy-title title="组织" margin-set="0 20" />

    <div class="table-operator">
      <template v-if="canCreateOrg">
        <router-link :to="{ path: '/user/myorg/create' }">
          <el-button size="small" type="primary">新建组织</el-button>
        </router-link>
      </template>
      <template v-else>
        <el-tooltip class="item" effect="dark" content="您已无资格创建组织" placement="bottom-start">
          <el-button size="small" type="primary" :disabled="true">新建组织</el-button>
        </el-tooltip>
      </template>
    </div>

    <el-table
      v-if="orgs.length > 0"
      class="my-orgs"
      :data="orgs">
      <el-table-column
        prop="title"
        label="名称">
        <template #default="{ row }">
          <div class="org-name">
            <img :src="row.logo | orgLogo" alt="组织LOGO" class="org-logo" />
            <span class="org-title">
              <el-link type="primary" :underline="false" @click="enterOrg(row)">{{ row.title }}</el-link>
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="alias"
        label="别名"
        width="160">
        <template #default="{ row }">
          <el-tag v-if="!row.alias" size="mini" type="warning" style="cursor: pointer;" @click="gotoOrgProfile(row)">未设置</el-tag>
          <template v-else>
            <el-link type="primary" :underline="false" @click="gotoOrgProfile(row)">{{ row.alias }}</el-link>
          </template>
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
      <el-table-column
        prop="join_at"
        label="加入时间"
        width="160"
        align="center">
        <template #default="{ row }">
          {{ row.join_at | formatDate }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="160"
        align="center">
        <template #default="{ row }">
          <el-link type="primary" @click="enterOrg(row)">进入组织</el-link>
          <el-divider direction="vertical"></el-divider>
          <el-link type="danger" @click="exitOrg(row)">退出组织</el-link>
        </template>
      </el-table-column>
    </el-table>
    <div v-else class="no-org-tips">
      您当前不在任何组织内，请
      <router-link :to="{ name: 'UserMyOrgCreate' }">
        <el-link type="primary" style="vertical-align: inherit; font-size: 13px;">
          创建组织
        </el-link>
      </router-link>
      或者让组织管理员添加您
    </div>
  </div>
</template>

<script>
import { orgs, orgSwitch, orgExit } from '@/api/org'
import EasyTitle from '@/views/components/EasyTitle'
import OrgMemberRole from '@/views/components/OrgMemberRole'
import { orgLogo, formatDate } from '@/utils/filters'

export default {
  name: 'UserMyOrg',
  components: {
    EasyTitle,
    OrgMemberRole
  },
  filters: {
    orgLogo,
    formatDate
  },
  data () {
    return {
      // 我的组织列表
      orgs: [],
      // 是否可以创建组织
      canCreateOrg: true
    }
  },
  created () {
    this.loadOrgs()
  },
  methods: {
    // 加载组织列表
    loadOrgs () {
      orgs().then(res => {
        this.orgs = res.data.orgs
      })
    },
    // 进入组织
    enterOrg (org, cb = null) {
      orgSwitch(org.id).then(res => {
        this.$store.dispatch('user/changeOrg', org).then(() => {
          if (cb) {
            cb()
          } else {
            this.$router.push({ name: 'Home' })
          }
        })
      })
    },
    // 前往组织详情
    gotoOrgProfile (org) {
      this.enterOrg(org, () => {
        this.$router.push({ name: 'OrgProfile' })
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
  background: #fff;
  padding: 25px 15px;
  .table-operator {
    margin-bottom: 15px;
  }
  .my-orgs {
    .org-name {
      line-height: 32px;
      .org-logo {
        float: left;
        width: 32px;
        height: 32px;
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

.box-shadow {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

</style>
