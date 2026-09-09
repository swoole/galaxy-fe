<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="project-main">
      <!-- 组织信息头 -->
      <div class="org-header-card">
        <div class="org-header-main">
          <img class="org-logo" :src="profile.logo | orgLogo('72x72')" alt="组织LOGO" />
          <div class="org-head-meta">
            <div class="org-head-title-row">
              <span class="org-head-title">{{ profile.title }}</span>
              <el-tag v-if="profile.alias" size="mini" type="warning">{{ profile.alias }}</el-tag>
              <el-tag size="mini" effect="plain">{{ roleLabel }}</el-tag>
            </div>
            <div class="org-head-desc">{{ profile.desc || '暂无组织描述' }}</div>
          </div>
        </div>
        <div class="org-header-side">
          <div class="org-stat">
            <span class="org-stat-value">{{ groupCount }}</span>
            <span class="org-stat-label">项目组</span>
          </div>
          <div class="org-stat">
            <span class="org-stat-value">{{ projectCount }}</span>
            <span class="org-stat-label">项目</span>
          </div>
          <div class="org-stat">
            <span class="org-stat-value">{{ memberCount }}</span>
            <span class="org-stat-label">成员</span>
          </div>
          <el-button
            v-if="$p('org.update', profile.role)"
            type="primary"
            size="small"
            icon="el-icon-edit"
            @click="goEdit">编辑</el-button>
        </div>
      </div>

      <!-- 快捷分区 -->
      <div class="org-panels">
        <div class="org-panel">
          <div class="org-panel-head">
            <span class="org-panel-title">项目组</span>
            <router-link class="org-panel-more" :to="{ name: 'Group' }">查看全部</router-link>
          </div>
          <ul class="org-panel-list">
            <li v-for="p in recentGroups" :key="p.id">
              <router-link class="org-panel-link" :to="{ name: 'GroupProfile', params: { groupId: p.alias || p.id } }">
                <span class="org-panel-item-title">{{ p.title }}</span>
                <span class="org-panel-item-sub">{{ p.desc || '暂无描述' }}</span>
              </router-link>
            </li>
            <li v-if="!recentGroups.length" class="org-panel-empty">暂无项目组</li>
          </ul>
        </div>

        <div class="org-panel">
          <div class="org-panel-head">
            <span class="org-panel-title">项目</span>
            <router-link class="org-panel-more" :to="{ name: 'Project' }">查看全部</router-link>
          </div>
          <ul class="org-panel-list">
            <li v-for="project in recentProjects" :key="project.id">
              <router-link
                class="org-panel-link"
                :to="{ name: 'ProjectProfile', params: { groupId: (project.group && (project.group.alias || project.group.id)), projectId: project.alias || project.id } }">
                <span class="org-panel-item-title">{{ project.title }}</span>
                <span class="org-panel-item-sub">
                  <el-tag v-if="project.develop" size="mini" type="success" effect="plain">源码</el-tag>
                  <el-tag v-else size="mini" effect="plain">镜像</el-tag>
                  {{ project.desc || '暂无描述' }}
                </span>
              </router-link>
            </li>
            <li v-if="!recentProjects.length" class="org-panel-empty">暂无项目</li>
          </ul>
        </div>

        <div class="org-panel">
          <div class="org-panel-head">
            <span class="org-panel-title">管理员</span>
            <router-link class="org-panel-more" :to="{ name: 'OrgMember' }">成员列表</router-link>
          </div>
          <ul class="org-panel-list">
            <li v-for="m in recentAdmins" :key="m.uid">
              <div class="org-panel-link">
                <span class="org-panel-item-title">{{ m.realname || m.username || m.uid }}</span>
                <span class="org-panel-item-sub">{{ memberRoleLabel(m) }}</span>
              </div>
            </li>
            <li v-if="!recentAdmins.length" class="org-panel-empty">暂无管理员</li>
          </ul>
        </div>

        <div class="org-panel">
          <div class="org-panel-head">
            <span class="org-panel-title">设置</span>
          </div>
          <ul class="org-panel-list org-panel-links">
            <li v-if="canManageOrg">
              <router-link class="org-panel-link" :to="{ name: 'OrgProfileEdit' }">组织信息编辑</router-link>
            </li>
            <li>
              <router-link class="org-panel-link" :to="{ name: 'OrgMember' }">{{ canManageOrg ? '成员管理' : '查看成员' }}</router-link>
            </li>
            <li v-if="$p('org.exit', profile.role)">
              <a class="org-panel-link org-panel-danger" @click="exitOrg">退出组织</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { formatDate, orgLogo } from '@/utils/filters'
import { orgProfile, orgExit } from '@/api/org'
import { projects } from '@/api/project'
import { groupList } from '@/api/group'
import { orgMember } from '@/api/org-member'
import Breadcrumb from '@/views/components/Breadcrumb'
import { routeBreadcrumb } from '@/utils/helpers'
import { ROLE_MANAGER, ROLES_WITH_DIRECTOR } from '@/consts/org'

export default {
  name: 'OrgProfile',
  components: {
    Breadcrumb
  },
  filters: {
    formatDate,
    orgLogo
  },
  data () {
    return {
      // 组织信息
      profile: {
        creator_info: {}
      },
      // 近期数据
      recentGroups: [],
      recentProjects: [],
      recentAdmins: [],
      groupCount: 0,
      projectCount: 0,
      memberCount: 0
    }
  },
  computed: {
    orgId () {
      return this.$store.getters.orgId
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: this.$route.meta.title, to: '' }
      ]
    },
    roleLabel () {
      return (ROLES_WITH_DIRECTOR[this.profile.role] || {}).label || this.profile.role || '成员'
    },
    canManageOrg () {
      return this.$p('org.member', this.profile.role)
    }
  },
  created () {
    this.loadOrgProfile()
  },
  methods: {
    loadOrgProfile () {
      orgProfile(this.orgId).then(res => {
        this.profile = res.data.org
        this.loadPanels()
      })
    },
    // 加载工作台各分区近期数据
    loadPanels () {
      groupList(this.orgId, null, 1, 6).then(res => {
        const d = res.data || {}
        this.recentGroups = (d.groups || d.data || []).slice(0, 6)
        this.groupCount = d.total || this.recentGroups.length
      })
      projects(this.orgId, null, null, 1, 6).then(res => {
        const d = res.data || {}
        this.recentProjects = (d.data || []).slice(0, 6)
        this.projectCount = d.total || this.recentProjects.length
      })
      orgMember(this.orgId, null, null, 1, 1).then(res => {
        const d = res.data || {}
        this.memberCount = Number(d.total) || 0
      })
      orgMember(this.orgId, ROLE_MANAGER, null, 1, 6).then(res => {
        const d = res.data || {}
        const admins = (d.members || d.data || []).slice(0, 6)
        const creator = this.profile.creator_info
        if (creator && creator.id && !admins.some(member => Number(member.uid) === Number(creator.id))) {
          admins.unshift({
            ...creator,
            uid: creator.id,
            role: ROLE_MANAGER
          })
        }
        this.recentAdmins = admins.slice(0, 6)
      })
    },
    memberRoleLabel (member) {
      if (Number(member.uid) === Number(this.profile.creator)) {
        return '组织负责人'
      }
      return (ROLES_WITH_DIRECTOR[member.role] || {}).label || member.role || '管理员'
    },
    goEdit () {
      this.$router.push({ name: 'OrgProfileEdit' })
    },
    // 退出组织
    exitOrg () {
      this.$confirm(`您确定要退出当前组织？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loading = this.$loading()
        orgExit(this.orgId).then(() => {
          this.$message.success('您已退出当前组织')
          this.$router.push({ path: '/user/myorg' })
        }).finally(() => {
          loading.close()
        })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.project-main {
  .org-logo {
    width: 72px;
    height: 72px;
    border-radius: 8px;
    object-fit: cover;
  }
}

.org-header-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .06);
  margin-bottom: 20px;
}
.org-header-main {
  display: flex;
  align-items: center;
  min-width: 0;
}
.org-head-meta { margin-left: 18px; min-width: 0; }
.org-head-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  .org-head-title { font-size: 22px; font-weight: 700; color: #303133; }
  .el-tag { margin-left: 8px; }
}
.org-head-desc {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
  max-width: 560px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.org-header-side {
  display: flex;
  align-items: center;
  gap: 26px;
  flex-shrink: 0;
}
.org-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
  .org-stat-value { font-size: 22px; font-weight: 700; color: #303133; }
  .org-stat-label { font-size: 12px; color: #909399; margin-top: 2px; }
}

.org-panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.org-panel {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .06);
  padding: 18px 20px;
}
.org-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  .org-panel-title { font-size: 15px; font-weight: 600; color: #303133; }
  .org-panel-more { font-size: 13px; color: #409eff; text-decoration: none; }
  .org-panel-more:hover { text-decoration: underline; }
}
.org-panel-list {
  list-style: none;
  margin: 0;
  padding: 0;
  li + li { border-top: 1px solid #f0f2f5; }
  .org-panel-link {
    display: flex;
    flex-direction: column;
    padding: 10px 4px;
    color: #303133;
    text-decoration: none;
    cursor: pointer;
    &:hover .org-panel-item-title { color: #409eff; }
  }
  &.org-panel-links .org-panel-link {
    flex-direction: row;
    align-items: center;
    color: #409eff;
  }
  .org-panel-item-title { font-size: 14px; font-weight: 600; }
  .org-panel-item-sub {
    margin-top: 2px;
    font-size: 12px;
    color: #909399;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    .el-tag { margin-right: 6px; }
  }
  .org-panel-empty {
    padding: 16px 4px;
    color: #c0c4cc;
    font-size: 13px;
    text-align: center;
  }
  .org-panel-danger { color: #f56c6c; }
}

@media (max-width: 900px) {
  .org-panels { grid-template-columns: 1fr; }
}
</style>
