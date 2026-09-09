<template>
  <div class="myapp-layout-container" v-loading="profileLoading">
    <div class="myapp-layout-nav" :style="{ top: paddingTop }">
      <el-menu
        :default-active="activeMenu"
        :default-openeds="defaultOpened"
        unique-opened
        class="nav-menu-container"
        ref="menu">
        <menu-item :to="navTo('ProjectOverview')" index="ProjectOverview" icon="dashboard" title="概览" />
        <menu-item :to="navTo('ProjectProfile')" index="ProjectProfile" icon="template" title="详情" />
        <el-submenu v-show="Number(projectProfile.develop)" index="sub-code">
          <template slot="title">
            <svg-icon icon-class="code2" />
            <span>代码</span>
          </template>
          <menu-item :to="navTo('ProjectGitRepoProfile')" index="ProjectGitRepoProfile" icon="git-branch" title="代码仓库" />
          <menu-item :to="navTo('ProjectWorkspaceOpen')" index="ProjectWorkspaceOpen" icon="experimentation" title="Workspace" />
        </el-submenu>
        <el-submenu index="sub-build">
          <template slot="title">
            <svg-icon icon-class="package" />
            <span>构建</span>
          </template>
          <menu-item v-show="Number(projectProfile.develop)" :to="navTo('ProjectPipeline')" index="ProjectPipeline" icon="workflow" title="流水线" />
          <menu-item :to="navTo('ProjectBuild')" index="ProjectBuild" icon="task" title="构建记录" />
          <menu-item :to="navTo('ProjectArtifacts')" index="ProjectArtifacts" icon="layers" title="镜像产物" />
        </el-submenu>
        <el-submenu index="sub-deploy">
          <template slot="title">
            <svg-icon icon-class="server" />
            <span>部署</span>
          </template>
          <menu-item :to="navTo('ProjectConfiguration')" index="ProjectConfiguration" icon="sliders-horizontal" title="配置中心" />
          <menu-item :to="navTo('ProjectDeploy')" index="ProjectDeploy" icon="server" title="部署记录" />
          <menu-item :to="navTo('ProjectInstance')" index="ProjectInstance" icon="docker" title="实例" />
          <menu-item :to="navTo('ProjectMonitoring')" index="ProjectMonitoring" icon="monitoring" title="监控" />
          <menu-item :to="navTo('ProjectRoutes')" index="ProjectRoutes" icon="route" title="路由规则" />
        </el-submenu>
        <el-submenu index="sub-work" v-if="false">
          <template slot="title">
            <svg-icon icon-class="tree-table" />
            <span>协作</span>
          </template>
          <menu-item :to="navTo('ProjectWorkTodo')" index="ProjectWorkTodo" icon="clipboard-check" title="待办事项" />
          <menu-item :to="navTo('ProjectWorkTask')" index="ProjectWorkTask" icon="task" title="工作任务" />
          <menu-item :to="navTo('ProjectWorkRequirement')" index="ProjectWorkRequirement" icon="list" title="需求清单" />
          <menu-item :to="navTo('ProjectWorkCalendar')" index="ProjectWorkCalendar" icon="clock-fill" title="日历视图" />
        </el-submenu>
        <el-submenu v-show="canManageProject" index="sub-settings">
          <template slot="title">
            <svg-icon icon-class="settings" />
            <span>设置</span>
          </template>
          <menu-item :to="navTo('ProjectProfileEdit')" index="ProjectProfileEdit" icon="edit" title="设置" />
          <menu-item :to="navTo('ProjectMember')" index="ProjectMember" icon="users" title="成员" />
          <menu-item :to="navTo('ProjectGovernance')" index="ProjectGovernance" icon="clipboard-check" title="操作记录" />
          <menu-item v-show="Number(projectProfile.develop)" :to="navTo('ProjectGithook')" index="ProjectGithook" icon="webhook" title="Git 钩子" />
        </el-submenu>
      </el-menu>
    </div>
    <div class="myapp-layout-main">
      <router-view :key="routerKey" :project="projectProfile" :projectId="projectId" :groupId="groupId" :orgId="orgId" />
    </div>
  </div>
</template>

<script>
import MenuItem from '@/layout/components/header/MenuItem'
import { projectBasicProfile } from '@/api/project'

export default {
  name: 'ProjectLayout',
  components: {
    MenuItem
  },
  props: {
    paddingTop: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      // 项目基本信息
      projectProfile: {},
      profileLoading: false,
      // 各二级导航分组对应的 submenu 索引
      submenuMap: {
        ProjectPipeline: 'sub-build',
        ProjectBuild: 'sub-build',
        ProjectArtifacts: 'sub-build',
        ProjectGitRepoProfile: 'sub-code',
        ProjectWorkspaceOpen: 'sub-code',
        ProjectConfiguration: 'sub-deploy',
        ProjectDeploy: 'sub-deploy',
        ProjectInstance: 'sub-deploy',
        ProjectSwarmServiceDetail: 'sub-deploy',
        ProjectSwarmContainerDetail: 'sub-deploy',
        ProjectMonitoring: 'sub-deploy',
        ProjectRoutes: 'sub-deploy',
        ProjectProfileEdit: 'sub-settings',
        ProjectMember: 'sub-settings',
        ProjectGovernance: 'sub-settings',
        ProjectGithook: 'sub-settings',
        ProjectWorkTodo: 'sub-work',
        ProjectWorkTask: 'sub-work',
        ProjectWorkRequirement: 'sub-work',
        ProjectWorkCalendar: 'sub-work'
      }
    }
  },
  computed: {
    routerKey () {
      return this.$route.fullPath
    },
    // 组织ID
    orgId () {
      return this.$store.getters.orgId
    },
    // 项目组ID
    groupId () {
      return this.$route.params['groupId']
    },
    // 项目ID
    projectId () {
      return this.$route.params['projectId']
    },
    // 高亮菜单：取 meta.appNav 或路由名
    activeMenu () {
      return this.$route.meta.appNav || this.$route.name
    },
    // 当前路由所属的二级分组
    currentSubmenu () {
      return this.submenuMap[this.activeMenu] || null
    },
    // 初始展开的分组
    defaultOpened () {
      return this.currentSubmenu ? [this.currentSubmenu] : []
    },
    // 是否有项目管理权限（控制“设置”分组显隐）
    canManageProject () {
      return this.$p('project.update', this.projectProfile.org_role, this.projectProfile.group_role, this.projectProfile.role)
    }
  },
  watch: {
    groupId () {
      this.loadProjectProfile()
    },
    projectId () {
      this.loadProjectProfile()
    },
    projectProfile () {
      this.$nextTick(this.openActiveSubmenu)
    },
    '$route' () {
      this.openActiveSubmenu()
    }
  },
  created () {
    this.loadProjectProfile()
  },
  mounted () {
    this.$nextTick(this.openActiveSubmenu)
  },
  methods: {
    // 构建子页面跳转对象
    navTo (name) {
      return { name, params: { groupId: this.groupId, projectId: this.projectId } }
    },
    // 加载项目信息
    loadProjectProfile () {
      if (!this.groupId || !this.projectId) return
      this.profileLoading = true
      projectBasicProfile(this.orgId, this.groupId, this.projectId).then(res => {
        this.projectProfile = res.data.project
        this.redirectUnsupportedRoute()
      }).catch(() => {
        this.projectProfile = {}
      }).finally(() => {
        this.profileLoading = false
      })
    },
    // 无权限或源码类路由不可用时，回退到概览
    redirectUnsupportedRoute () {
      const managementRoutes = ['ProjectProfileEdit', 'ProjectGovernance']
      if (!this.canManageProject && managementRoutes.includes(this.$route.name)) {
        this.$router.replace(this.navTo('ProjectOverview'))
        return
      }
      if (Number(this.projectProfile.develop)) return
      const sourceRoutes = [
        'ProjectGitRepoProfile', 'ProjectWorkspaceOpen', 'ProjectPipeline', 'ProjectPipelineCreate',
        'ProjectPipelineEdit', 'ProjectPipelineProfile', 'ProjectGithook'
      ]
      if (sourceRoutes.includes(this.$route.name)) {
        this.$router.replace(this.navTo('ProjectOverview'))
      }
    },
    // 展开当前激活分组
    openActiveSubmenu () {
      const sub = this.currentSubmenu
      if (sub && this.$refs.menu) {
        this.$refs.menu.open(sub)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.myapp-layout-container {
  position: relative;
  height: 100%;
  .myapp-layout-nav {
    position: fixed;
    bottom: 0;
    width: 210px;
    .nav-menu-container {
      width: 210px;
      height: 100%;
      background: #fff;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      overflow-y: auto;
      overflow-x: hidden;
    }
  }
  .myapp-layout-main {
    margin-left: 210px;
  }
}
</style>

<style lang="scss">
.myapp-layout-container {
  .myapp-layout-nav {
    .nav-menu-container {
      .el-menu-item svg, .el-submenu svg {
        margin-right: 5px;
        width: 24px;
        text-align: center;
        font-size: 14px;
        vertical-align: middle;
      }
    }
  }
}
</style>
