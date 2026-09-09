<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="project-main">
      <easy-title title="项目组信息" margin-set="0 20" />
      <div style="margin-bottom: 10px">
        <router-link v-if="$p('group.update', orgRole, profile.role)" :to="{ name: 'GroupEdit', params: { groupId } }">
          <el-button type="primary" size="small">编辑</el-button>
        </router-link>
        <router-link :to="{ name: 'GroupSshKey', params: { groupId } }">
          <el-button type="primary" size="small">Git 平台密钥</el-button>
        </router-link>
        <template v-if="false">
          <router-link :to="{ name: 'WorkTodo', params: { groupId } }">
            <el-button type="primary" size="small">待办事项</el-button>
          </router-link>
          <router-link :to="{ name: 'WorkTask', params: { groupId } }">
            <el-button type="primary" size="small">工作任务</el-button>
          </router-link>
          <router-link :to="{ name: 'WorkRequirement', params: { groupId } }">
            <el-button type="primary" size="small">需求清单</el-button>
          </router-link>
          <router-link :to="{ name: 'WorkCalendar', params: { groupId } }">
            <el-button type="primary" size="small">协作日历</el-button>
          </router-link>
        </template>
      </div>

      <el-descriptions direction="vertical" :column="1" :colon="false" labelClassName="desc-label" contentClassName="desc-content">
        <el-descriptions-item label="项目组ID">
          {{ profile.id }}
        </el-descriptions-item>
        <el-descriptions-item label="项目组名称">
          {{ profile.title }}
        </el-descriptions-item>
        <el-descriptions-item label="别名">
          <el-tag v-if="!profile.alias" size="mini" type="warning">未设置</el-tag>
          <template v-else>{{ profile.alias }}</template>
        </el-descriptions-item>
        <el-descriptions-item label="项目组描述">
          {{ profile.desc }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ profile.created_at | formatDate }}
        </el-descriptions-item>
        <el-descriptions-item label="创建人">
          <org-user :user="profile.creator_info" />
        </el-descriptions-item>
      </el-descriptions>

      <template v-if="$p('group.exit', orgRole, profile.role)">
        <easy-title title="退出项目组" margin-set="20 20" />
        <div class="desc-normal" style="margin-bottom: 10px">
          退出当前项目组后，将不再拥有该项目组的权限，请谨慎操作。
        </div>
        <el-button type="danger" size="small" @click="exitGroup">
          退出当前项目组
        </el-button>
      </template>

      <template v-if="$p('group.delete', orgRole, profile.role)">
        <easy-title title="删除项目组" margin-set="20 20" />
        <div class="desc-normal" style="margin-bottom: 10px">
          永久删除项目组，不可恢复，请谨慎操作。
        </div>
        <el-button type="danger" size="small" @click="deleteGroup">
          删除当前项目组
        </el-button>
      </template>
    </div>

  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import OrgUser from '@/views/components/OrgUser'
import { formatDate } from '@/utils/filters'
import { groupProfile, groupDelete, groupExit } from '@/api/group'
import { routeBreadcrumb, routeBreadcrumbFind } from '@/utils/helpers'

export default {
  name: 'GroupProfile',
  components: {
    EasyTitle,
    Breadcrumb,
    OrgUser
  },
  filters: {
    formatDate
  },
  computed: {
    orgId () {
      return this.$store.getters.orgId
    },
    orgRole () {
      return this.$store.state.user.lastOrg.role
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        routeBreadcrumbFind(this, { name: 'Group' }),
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  data () {
    return {
      profile: {
        id: null,
        title: null,
        desc: null,
        created_at: null,
        creator_info: {}
      },
      groupId: 0
    }
  },
  created () {
    this.groupId = this.$route.params.groupId

    this.getGroupProfile()
  },
  methods: {
    getGroupProfile () {
      groupProfile(
        this.orgId,
        this.groupId
      ).then(res => {
        this.profile = res.data.group
      })
    },
    // 退出项目组
    exitGroup () {
      this.$confirm(`您确定要退出当前项目组？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loading = this.$loading()
        groupExit(this.orgId, this.groupId).then(res => {
          this.$message.success('您已退出当前项目组')
          this.$router.push({ name: 'Group' })
        }).finally(() => {
          loading.close()
        })
      })
    },
    // 删除项目组
    deleteGroup () {
      this.$confirm(`您确定要删除当前项目组，删除项目组将导致项目组内所有数据被清理，不可恢复，您确定知晓此风险？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$confirm(`您确定您已知晓删除项目组带来的风险并能承担此风险？`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          const loading = this.$loading()
          groupDelete(
            this.orgId,
            this.groupId
          ).then(res => {
            this.$message.success('您已删除当前项目组')
            this.$router.push({ name: 'Group' })
          }).finally(() => {
            loading.close()
          })
        })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.el-button--primary {
  margin-right: 20px;
}
</style>
