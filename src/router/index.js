import Vue from 'vue'
import Router from 'vue-router'

/* Layout */
import Layout from '@/layout'
import UserLayout from '@/layout/User'
import ProjectLayout from '@/layout/Project'
import settings from '../settings'
import SwarmClusterLayout from '@/views/cluster/swarm/Layout'
import KubernetesClusterLayout from '@/views/cluster/k8s/Layout'
import DevelopLayout from '@/layout/components/header/Navbar/Develop.vue'
import OrgLayout from '@/layout/components/header/Navbar/Org.vue'
import ResourceLayout from '@/layout/components/header/Navbar/Resource.vue'
// import EmptyRouterView from '@/layout/components/EmptyRouterView'

Vue.use(Router)

/**
 * Note: sub-menu only appear when route children.length >= 1
 * Detail see: https://panjiachen.github.io/vue-element-admin-site/guide/essentials/router-and-nav.html
 *
 * hidden: true                   if set true, item will not show in the sidebar(default is false)
 * alwaysShow: true               if set true, will always show the root menu
 *                                if not set alwaysShow, when item has more than one children route,
 *                                it will becomes nested mode, otherwise not show the root menu
 * redirect: noRedirect           if set noRedirect will no redirect in the breadcrumb
 * name:'router-name'             the name is used by <keep-alive> (must set!!!)
 * meta : {
    roles: ['admin','editor']    control the page roles (you can set multiple roles)
    title: 'title'               the name show in sidebar and breadcrumb (recommend set)
    icon: 'svg-name'             the icon show in the sidebar
    breadcrumb: false            if set false, the item will hidden in breadcrumb(default is true)
    activeMenu: '/example/list'  if set path, the sidebar will highlight the path you set
  }
 */

/**
 * constantRoutes
 * a base page that does not have permission requirements
 * all roles can be accessed
 */
export const constantRoutes = [
  {
    path: '/login',
    component: () => import('@/views/login/index'),
    meta: { title: '登录' },
    hidden: true
  },
  {
    path: '/forgetpassword',
    component: () => import('@/views/login/forget-password'),
    meta: { title: '忘记密码' },
    hidden: true
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/login/register'),
    meta: { title: '注册' },
    hidden: true
  },
  {
    path: '/privacypolicy',
    name: 'PrivacyPolicy',
    component: () => import('@/views/login/privacy-policy'),
    meta: { title: '隐私政策' },
    hidden: true
  },
  {
    path: '/servicecontract',
    name: 'ServiceContract',
    component: () => import('@/views/login/service-contract'),
    meta: { title: '服务条款' },
    hidden: true
  },

  {
    path: '/404',
    component: () => import('@/views/404'),
    meta: { title: '未找到该页面' },
    hidden: true
  },

  {
    path: '/',
    component: Layout,
    redirect: { name: 'Project' },
    name: 'Home',
    children: [
      {
        path: '/userlayout',
        component: UserLayout,
        redirect: '/user',
        name: 'UserLayout',
        children: [
          {
            path: '/user',
            name: 'User',
            component: () => import('@/views/user/index'),
            meta: { title: '我的账户' }
          },
          {
            path: '/user/notification',
            name: 'UserNotification',
            component: () => import('@/views/user/notification'),
            meta: { title: '通知' }
          },
          {
            path: '/user/notification/setting',
            name: 'UserNotificationSetting',
            component: () => import('@/views/user/notification-setting'),
            meta: { title: '通知设置' }
          },
          {
            path: '/user/account',
            name: 'UserAccount',
            component: () => import('@/views/user/account'),
            meta: { title: '账户信息' }
          },
          {
            path: '/user/account/bindemail',
            name: 'UserAccountBindEmail',
            component: () => import('@/views/user/account/bind/email'),
            meta: { title: '绑定邮箱' }
          },
          {
            path: '/user/account/setpassword',
            name: 'UserAccountSetPassword',
            component: () => import('@/views/user/account/bind/set-password'),
            meta: { title: '设置密码' }
          },
          {
            path: '/user/profile',
            name: 'UserProfile',
            component: () => import('@/views/user/profile'),
            meta: { title: '个人信息' }
          },
          {
            path: '/user/myorg',
            name: 'UserMyOrg',
            component: () => import('@/views/user/my-org'),
            meta: { title: '我的组织' }
          },
          {
            path: '/user/myorg/create',
            name: 'UserMyOrgCreate',
            component: () => import('@/views/user/my-org/create'),
            meta: { title: '新建组织' }
          },
          {
            path: '/user/sshkey',
            name: 'UserSshkey',
            component: () => import('@/views/user/sshkey'),
            meta: { title: 'SSH密钥' }
          },
          {
            path: '/user/gitauth',
            name: 'UserGitAuth',
            component: () => import('@/views/user/git-auth'),
            meta: { title: 'Git授权访问' }
          },
          {
            path: '/user/login/history',
            name: 'UserLoginHistory',
            component: () => import('@/views/user/login/history'),
            meta: { title: '登录日志' }
          }
        ]
      },
      {
        path: '/developlayout',
        component: DevelopLayout,
        redirect: { name: 'Project' },
        name: 'DevelopLayout',
        meta: { title: '工作' },
        children: [
          {
            path: '/project',
            name: 'Project',
            component: () => import('@/views/project/index'),
            meta: { nav: 'DevelopLayout', appNav: 'Project', title: '项目' }
          },
          {
            path: '/project/create',
            name: 'ProjectCreate',
            component: () => import('@/views/project/create'),
            meta: { nav: 'DevelopLayout', appNav: 'Project', title: '新增项目', breadcrumbAfter: [{ name: 'Project' }] }
          },
          {
            path: '/devenv',
            name: 'DevEnv',
            component: () => import('@/views/work/devenv'),
            meta: { nav: 'DevelopLayout', appNav: 'DevEnv', title: '开发环境' }
          },
          {
            path: '/workspace/:groupId/:userId',
            name: 'Workspace',
            component: () => import('@/views/work/workspace'),
            props: route => ({ groupId: route.params.groupId, userId: Number(route.params.userId) }),
            meta: { nav: 'DevelopLayout', appNav: 'DevEnv', title: '开发环境' }
          }
        ]
      },
      {
        path: '/projectlayout',
        component: ProjectLayout,
        redirect: { name: 'Project' },
        name: 'ProjectLayout',
        meta: { title: '项目管理', breadcrumbIgnore: true, breadcrumbBefore: [{ name: 'DevelopLayout' }, { name: 'Project' }] },
        children: [
          {
            path: '/project/:groupId/:projectId/profile',
            name: 'ProjectProfile',
            component: () => import('@/views/project/profile'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectProfile', title: '项目详情' }
          },
          {
            path: '/project/:groupId/:projectId/edit',
            name: 'ProjectProfileEdit',
            component: () => import('@/views/project/edit'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectProfileEdit', title: '项目设置' }
          },
          {
            path: '/project/:groupId/:projectId/member',
            name: 'ProjectMember',
            component: () => import('@/views/project/member'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectMember', title: '成员' }
          },
          {
            path: '/project/:groupId/:projectId/pipeline',
            name: 'ProjectPipeline',
            component: () => import('@/views/project/pipeline/index'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectPipeline', title: '流水线' }
          },
          {
            path: '/project/:groupId/:projectId/pipeline/create',
            name: 'ProjectPipelineCreate',
            component: () => import('@/views/project/pipeline/create'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectPipeline', title: '创建流水线' }
          },
          {
            path: '/project/:groupId/:projectId/pipeline/:pipelineId(\\d+)/edit',
            name: 'ProjectPipelineEdit',
            component: () => import('@/views/project/pipeline/edit'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectPipeline', title: '编辑流水线' }
          },
          {
            path: '/project/:groupId/:projectId/pipeline/:pipelineId(\\d+)/profile',
            name: 'ProjectPipelineProfile',
            component: () => import('@/views/project/pipeline/profile'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectPipeline', title: '流水线详情' }
          },
          {
            path: '/project/:groupId/:projectId/githook',
            name: 'ProjectGithook',
            component: () => import('@/views/project/githook'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectGithook', title: 'Git钩子配置' }
          },
          {
            path: '/project/:groupId/:projectId/gitrepo/profile',
            name: 'ProjectGitRepoProfile',
            component: () => import('@/views/project/gitrepo/profile'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectGitRepoProfile', title: '代码仓库' }
          },
          {
            path: '/project/:groupId/:projectId/workspace/open',
            name: 'ProjectWorkspaceOpen',
            component: () => import('@/views/project/workspace/open'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectWorkspaceOpen', title: '打开 Workspace' }
          },
          {
            path: '/project/:groupId/:projectId/overview',
            name: 'ProjectOverview',
            component: () => import('@/views/project/overview'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectOverview', title: '项目概览' }
          },
          {
            path: '/project/:groupId/:projectId/build',
            name: 'ProjectBuild',
            component: () => import('@/views/project/build'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectBuild', title: '构建记录' }
          },
          {
            path: '/project/:groupId/:projectId/build/artifacts',
            name: 'ProjectArtifacts',
            component: () => import('@/views/project/build/artifacts'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectArtifacts', title: '产物列表' }
          },
          {
            path: '/project/:groupId/:projectId/build/images/:artifactId(\\d+)',
            name: 'ProjectImageDetail',
            component: () => import('@/views/project/build/image-detail'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectArtifacts', title: '镜像详情' }
          },
          {
            path: '/project/:groupId/:projectId/configuration',
            name: 'ProjectConfiguration',
            component: () => import('@/views/project/configuration'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectConfiguration', title: '配置中心' }
          },
          {
            path: '/project/:groupId/:projectId/deploy',
            name: 'ProjectDeploy',
            component: () => import('@/views/project/deploy'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectDeploy', title: '部署记录' }
          },
          {
            path: '/project/:groupId/:projectId/instance',
            name: 'ProjectInstance',
            component: () => import('@/views/project/deploy/instance'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectInstance', title: '实例' }
          },
          {
            path: '/project/:groupId/:projectId/instances/:runtimeId(\\d+)/swarm/services/:serviceId',
            name: 'ProjectSwarmServiceDetail',
            component: () => import('@/views/project/deploy/ProjectSwarmServiceDetail'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectInstance', title: '运行实例详情' }
          },
          {
            path: '/project/:groupId/:projectId/instances/:runtimeId(\\d+)/kubernetes/deployment',
            name: 'ProjectKubernetesDeploymentDetail',
            component: () => import('@/views/project/deploy/ProjectKubernetesDeploymentDetail'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectInstance', title: 'Deployment 详情' }
          },
          {
            path: '/project/:groupId/:projectId/instances/:runtimeId(\\d+)/kubernetes/services/create',
            name: 'ProjectKubernetesServiceCreate',
            component: () => import('@/views/project/deploy/ProjectKubernetesServiceCreate'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectInstance', title: '新增 Service' }
          },
          {
            path: '/project/:groupId/:projectId/instances/:runtimeId(\\d+)/kubernetes/ingresses/create',
            name: 'ProjectKubernetesIngressCreate',
            component: () => import('@/views/project/deploy/ProjectKubernetesIngressCreate'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectInstance', title: '新增 Ingress' }
          },
          {
            path: '/project/:groupId/:projectId/instances/:runtimeId(\\d+)/swarm/containers/:containerId',
            name: 'ProjectSwarmContainerDetail',
            component: () => import('@/views/project/deploy/ProjectSwarmContainerDetail'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectInstance', title: '运行副本详情' }
          },
          {
            path: '/project/:groupId/:projectId/monitoring',
            name: 'ProjectMonitoring',
            component: () => import('@/views/project/monitoring'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectMonitoring', title: '运行监控' }
          },
          {
            path: '/project/:groupId/:projectId/routes',
            name: 'ProjectRoutes',
            component: () => import('@/views/project/routes'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectRoutes', title: '域名路由' }
          },
          {
            path: '/project/:groupId/:projectId/routes/:clusterId(\\d+)/create',
            name: 'ProjectGatewayRouteCreate',
            component: () => import('@/views/cluster/swarm/WebGatewayRouteEditor'),
            props: route => ({ clusterId: Number(route.params.clusterId) }),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectRoutes', title: '添加项目路由', projectScope: true }
          },
          {
            path: '/project/:groupId/:projectId/routes/:clusterId(\\d+)/k8s/create',
            name: 'ProjectKubernetesRouteCreate',
            component: () => import('@/views/project/deploy/ProjectKubernetesIngressCreate'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectRoutes', title: '添加 Kubernetes 路由', projectScope: true }
          },
          {
            path: '/project/:groupId/:projectId/routes/:clusterId(\\d+)/k8s/:routeId(\\d+)',
            name: 'ProjectKubernetesRouteEdit',
            component: () => import('@/views/project/deploy/ProjectKubernetesIngressCreate'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectRoutes', title: '编辑 Kubernetes 路由', projectScope: true }
          },
          {
            path: '/project/:groupId/:projectId/routes/:clusterId(\\d+)/:source/:routeId(\\d+)',
            name: 'ProjectGatewayRouteEdit',
            component: () => import('@/views/cluster/swarm/WebGatewayRouteEditor'),
            props: route => ({ clusterId: Number(route.params.clusterId) }),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectRoutes', title: '编辑项目路由', projectScope: true }
          },
          {
            path: '/project/:groupId/:projectId/governance',
            name: 'ProjectGovernance',
            component: () => import('@/views/project/governance'),
            meta: { nav: 'DevelopLayout', appNav: 'ProjectGovernance', title: '操作记录' }
          }
        ]
      },
      {
        path: '/org',
        component: OrgLayout,
        redirect: '/org/profile',
        name: 'OrgLayout',
        meta: { title: '组织' },
        children: [
          {
            path: '/org/profile',
            name: 'OrgProfile',
            component: () => import('@/views/org/profile'),
            meta: { nav: '/org', appNav: 'OrgProfile', title: '组织设置' }
          },
          {
            path: '/org/profile/edit',
            name: 'OrgProfileEdit',
            component: () => import('@/views/org/profile/edit'),
            meta: { nav: '/org', appNav: 'OrgProfile', title: '编辑组织' }
          },
          {
            path: '/org/member',
            name: 'OrgMember',
            component: () => import('@/views/org/member'),
            meta: { nav: '/org', appNav: 'OrgMember', title: '成员' }
          },
          {
            path: '/group',
            name: 'Group',
            component: () => import('@/views/group/groupList'),
            meta: { nav: '/org', title: '项目组' }
          },
          {
            path: '/group/add',
            name: 'GroupAdd',
            component: () => import('@/views/group/groupAdd'),
            meta: { nav: '/org', title: '新增项目组' }
          },
          {
            path: '/group/:groupId',
            name: 'GroupProfile',
            component: () => import('@/views/group/groupProfile'),
            meta: { nav: '/org', title: '项目组详情' }
          },
          {
            path: '/group/:groupId/edit',
            name: 'GroupEdit',
            component: () => import('@/views/group/groupEdit'),
            meta: { nav: '/org', title: '项目组设置' }
          },
          {
            path: '/group/:groupId/sshkey',
            name: 'GroupSshKey',
            component: () => import('@/views/group/sshkey'),
            meta: { nav: '/org', title: 'Git 平台密钥' }
          },
          {
            path: '/group/:groupId/member',
            name: 'GroupMember',
            component: () => import('@/views/group/member'),
            meta: { nav: '/org', title: '项目组成员' }
          }
        ]
      },
      {
        path: '/resourcelayout',
        component: ResourceLayout,
        redirect: { name: 'ClusterSwarmList' },
        name: 'ResourceLayout',
        meta: { title: '资源' },
        children: [
          {
            path: '/cluster',
            name: 'Cluster',
            redirect: { name: 'ClusterSwarmList' },
            meta: { nav: 'ResourceLayout', title: '集群' }
          },
          {
            path: '/cluster/swarm',
            name: 'ClusterSwarmList',
            component: () => import('@/views/cluster/swarm/List'),
            meta: { nav: 'ResourceLayout', title: 'Docker Swarm' }
          },
          {
            path: '/cluster/swarm/create',
            name: 'ClusterSwarmCreate',
            component: () => import('@/views/cluster/swarm/Create'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmList', title: '创建 Docker Swarm 集群' }
          },
          {
            path: '/cluster/create',
            redirect: { name: 'ClusterSwarmCreate' }
          },
          {
            path: '/cluster/k8s',
            name: 'ClusterK8sList',
            component: () => import('@/views/cluster/k8s/List'),
            meta: { nav: 'ResourceLayout', title: 'Kubernetes' }
          },
          {
            path: '/cluster/k8s/create',
            name: 'ClusterK8sCreate',
            component: () => import('@/views/cluster/k8s/Create'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sList', title: '接入 Kubernetes 集群' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/agent',
            name: 'ClusterSwarmAgent',
            component: () => import('@/views/cluster/swarm/AgentConnection'),
            props: route => ({ clusterId: Number(route.params.clusterId) }),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmList', title: 'Galaxy Agent 连接' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/agent',
            redirect: route => ({ name: 'ClusterSwarmAgent', params: { clusterId: route.params.clusterId } })
          },
          {
            path: '/env',
            name: 'Env',
            component: () => import('@/views/env/index'),
            meta: { nav: 'ResourceLayout', title: '部署环境' }
          },
          {
            path: '/resource-usage',
            name: 'ResourceUsageRanking',
            component: () => import('@/views/resource-usage/index'),
            meta: { nav: 'ResourceLayout', title: '资源消耗排行' }
          },
          {
            path: '/env/create',
            name: 'EnvCreate',
            component: () => import('@/views/env/create'),
            meta: { nav: 'ResourceLayout', appNav: 'Env', title: '新增部署环境' }
          },
          {
            path: '/env/:envId(\\d+)/edit',
            name: 'EnvEdit',
            component: () => import('@/views/env/edit'),
            meta: { nav: 'ResourceLayout', appNav: 'Env', title: '编辑部署环境' }
          },
          {
            path: '/systemconfig/registry',
            name: 'SystemConfigRegistry',
            component: () => import('@/views/system-config/registry'),
            meta: { nav: 'ResourceLayout', title: '镜像仓库' }
          },
          {
            path: '/certificates',
            name: 'Certificates',
            component: () => import('@/views/cluster/swarm/Certificates'),
            meta: { nav: 'ResourceLayout', title: 'SSL 证书' }
          },
          {
            path: '/cloud-account',
            name: 'CloudAccount',
            component: () => import('@/views/cloud-account/index'),
            meta: { nav: 'ResourceLayout', title: '云账户管理' }
          },
          {
            path: '/domains',
            name: 'Domains',
            component: () => import('@/views/domain/index'),
            meta: { nav: 'ResourceLayout', title: '域名管理' }
          },
          {
            path: '/storage',
            name: 'Storage',
            component: () => import('@/views/storage/index'),
            meta: { nav: 'ResourceLayout', title: '对象存储' }
          },
          {
            path: '/network-tunnels',
            name: 'NetworkTunnels',
            component: () => import('@/views/network-tunnel/index'),
            meta: { nav: 'ResourceLayout', title: '网络穿透' }
          }
        ]
      },
      {
        path: '/cluster/:clusterId(\\d+)',
        name: 'ClusterEntry',
        component: () => import('@/views/cluster/Entry'),
        meta: { title: '集群入口', breadcrumbIgnore: true }
      },
      {
        path: '/cluster/:clusterId(\\d+)/swarm',
        component: SwarmClusterLayout,
        redirect: route => ({ name: 'ClusterSwarmOverview', params: { clusterId: route.params.clusterId } }),
        name: 'ClusterSwarm',
        meta: { title: 'Docker Swarm 集群', breadcrumbIgnore: true, breadcrumbBefore: [{ name: 'ResourceLayout' }, { name: 'ClusterSwarmList' }] },
        children: [
          {
            path: '/cluster/:clusterId(\\d+)/swarm/overview',
            name: 'ClusterSwarmOverview',
            component: () => import('@/views/cluster/swarm/Overview'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmOverview', title: '概览' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/containers',
            name: 'ClusterSwarmContainers',
            component: () => import('@/views/cluster/swarm/Containers'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmOverview', title: '容器' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/containers/:containerId',
            name: 'ClusterSwarmContainerDetail',
            component: () => import('@/views/cluster/swarm/SwarmContainerDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmContainers', title: '容器详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/services',
            name: 'ClusterSwarmServices',
            component: () => import('@/views/cluster/swarm/Services'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmOverview', title: 'Services' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/services/:serviceId',
            name: 'ClusterSwarmServiceDetail',
            component: () => import('@/views/cluster/swarm/SwarmServiceDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmServices', title: 'Service 详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/images',
            name: 'ClusterSwarmImages',
            component: () => import('@/views/cluster/swarm/Images'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmOverview', title: '镜像' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/networks',
            name: 'ClusterSwarmNetworks',
            component: () => import('@/views/cluster/swarm/Networks'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmOverview', title: '网络' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/networks/:networkId/containers',
            name: 'ClusterSwarmNetworkContainers',
            component: () => import('@/views/cluster/swarm/NetworkContainers'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmOverview', title: '网络容器', breadcrumbBefore: [{ name: 'ClusterSwarmNetworks' }] }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/volumes',
            name: 'ClusterSwarmVolumes',
            component: () => import('@/views/cluster/swarm/Volumes'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmOverview', title: '数据卷' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/configs',
            name: 'ClusterSwarmConfigs',
            component: () => import('@/views/cluster/swarm/Configs'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmConfigs', title: 'Configs' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/configs/:configId',
            name: 'ClusterSwarmConfigDetail',
            component: () => import('@/views/cluster/swarm/ConfigDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmConfigs', title: 'Config 详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/configs/create',
            name: 'ClusterSwarmConfigCreate',
            component: () => import('@/views/cluster/swarm/ConfigCreate'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmConfigs', title: '新增 Config' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/secrets',
            name: 'ClusterSwarmSecrets',
            component: () => import('@/views/cluster/swarm/Secrets'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmSecrets', title: 'Secrets' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/secrets/create',
            name: 'ClusterSwarmSecretCreate',
            component: () => import('@/views/cluster/swarm/SecretCreate'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmSecrets', title: '新增 Secret' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/nodes',
            name: 'ClusterSwarmNodes',
            component: () => import('@/views/cluster/swarm/Nodes'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmNodes', title: '节点' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/nodes/:nodeId',
            name: 'ClusterSwarmNode',
            component: () => import('@/views/cluster/swarm/NodeDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmNodes', title: '节点详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/web-gateway',
            name: 'ClusterSwarmWebGateway',
            component: () => import('@/views/cluster/swarm/WebGateway'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmWebGateway', title: 'Web 网关' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/settings',
            name: 'ClusterSwarmSettings',
            component: () => import('@/views/cluster/swarm/ClusterSettings'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmSettings', title: '集群设置' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/web-gateway/routes/create',
            name: 'ClusterSwarmWebGatewayRouteCreate',
            component: () => import('@/views/cluster/swarm/WebGatewayRouteEditor'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmWebGateway', title: '添加网关路由' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/swarm/web-gateway/routes/:source/:routeId',
            name: 'ClusterSwarmWebGatewayRouteEdit',
            component: () => import('@/views/cluster/swarm/WebGatewayRouteEditor'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterSwarmWebGateway', title: '编辑网关路由' }
          }
        ]
      },
      {
        path: '/cluster/:clusterId(\\d+)/k8s',
        component: KubernetesClusterLayout,
        redirect: route => ({ name: 'ClusterK8sOverview', params: { clusterId: route.params.clusterId } }),
        name: 'ClusterK8s',
        meta: { title: 'Kubernetes 集群', breadcrumbIgnore: true, breadcrumbBefore: [{ name: 'ResourceLayout' }, { name: 'ClusterK8sList' }] },
        children: [
          {
            path: '/cluster/:clusterId(\\d+)/k8s/overview',
            name: 'ClusterK8sOverview',
            component: () => import('@/views/cluster/k8s/Overview'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sOverview', title: '概览' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/nodes',
            name: 'ClusterK8sNodes',
            component: () => import('@/views/cluster/k8s/Nodes'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sNodes', title: '节点' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/nodes/detail',
            name: 'ClusterK8sNodeDetail',
            component: () => import('@/views/cluster/k8s/NodeDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sNodes', title: '节点详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/pods',
            name: 'ClusterK8sPods',
            component: () => import('@/views/cluster/k8s/Pods'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sPods', title: 'Pods' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/deployments',
            name: 'ClusterK8sDeployments',
            component: () => import('@/views/cluster/k8s/Deployments'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sDeployments', title: 'Deployments' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/services',
            name: 'ClusterK8sServices',
            component: () => import('@/views/cluster/k8s/Services'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sServices', title: 'Services' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/namespaces',
            name: 'ClusterK8sNamespaces',
            component: () => import('@/views/cluster/k8s/Namespaces'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sNamespaces', title: 'Namespaces' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/namespaces/detail',
            name: 'ClusterK8sNamespaceDetail',
            component: () => import('@/views/cluster/k8s/NamespaceDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sNamespaces', title: 'Namespace 详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/configmaps',
            name: 'ClusterK8sConfigMaps',
            component: () => import('@/views/cluster/k8s/ConfigMaps'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sConfigMaps', title: 'ConfigMaps' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/configmaps/create',
            name: 'ClusterK8sConfigMapCreate',
            component: () => import('@/views/cluster/k8s/ConfigMapCreate'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sConfigMaps', title: '新增 ConfigMap' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/configmaps/edit',
            name: 'ClusterK8sConfigMapEdit',
            component: () => import('@/views/cluster/k8s/ConfigMapCreate'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sConfigMaps', title: '编辑 ConfigMap' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/secrets',
            name: 'ClusterK8sSecrets',
            component: () => import('@/views/cluster/k8s/Secrets'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sSecrets', title: 'Secrets' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/secrets/create',
            name: 'ClusterK8sSecretCreate',
            component: () => import('@/views/cluster/k8s/SecretCreate'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sSecrets', title: '新增 Secret' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/secrets/edit',
            name: 'ClusterK8sSecretEdit',
            component: () => import('@/views/cluster/k8s/SecretCreate'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sSecrets', title: '编辑 Secret' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/ingresses',
            name: 'ClusterK8sIngresses',
            component: () => import('@/views/cluster/k8s/Ingresses'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sIngresses', title: 'Ingresses' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/ingresses/create',
            name: 'ClusterK8sIngressCreate',
            component: () => import('@/views/cluster/k8s/IngressCreate'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sIngresses', title: '新增 Ingress' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/ingresses/edit',
            name: 'ClusterK8sIngressEdit',
            component: () => import('@/views/cluster/k8s/IngressCreate'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sIngresses', title: '编辑 Ingress' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/deployments/create',
            name: 'ClusterK8sDeploymentCreate',
            component: () => import('@/views/cluster/k8s/DeploymentCreate'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sDeployments', title: '新增 Deployment' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/deployments/edit',
            name: 'ClusterK8sDeploymentEdit',
            component: () => import('@/views/cluster/k8s/DeploymentCreate'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sDeployments', title: '编辑 Deployment' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/deployments/detail',
            name: 'ClusterK8sDeploymentDetail',
            component: () => import('@/views/cluster/k8s/DeploymentDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sDeployments', title: 'Deployment 详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/services/create',
            name: 'ClusterK8sServiceCreate',
            component: () => import('@/views/cluster/k8s/ServiceCreate'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sServices', title: '新增 Service' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/services/edit',
            name: 'ClusterK8sServiceEdit',
            component: () => import('@/views/cluster/k8s/ServiceCreate'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sServices', title: '编辑 Service' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/services/detail',
            name: 'ClusterK8sServiceDetail',
            component: () => import('@/views/cluster/k8s/ServiceDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sServices', title: 'Service 详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/pods/detail',
            name: 'ClusterK8sPodDetail',
            component: () => import('@/views/cluster/k8s/PodDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sPods', title: 'Pod 详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/statefulsets',
            name: 'ClusterK8sStatefulSets',
            component: () => import('@/views/cluster/k8s/StatefulSets'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sStatefulSets', title: 'StatefulSets' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/statefulsets/detail',
            name: 'ClusterK8sStatefulSetDetail',
            component: () => import('@/views/cluster/k8s/StatefulSetDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sStatefulSets', title: 'StatefulSet 详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/daemonsets',
            name: 'ClusterK8sDaemonSets',
            component: () => import('@/views/cluster/k8s/DaemonSets'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sDaemonSets', title: 'DaemonSets' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/daemonsets/detail',
            name: 'ClusterK8sDaemonSetDetail',
            component: () => import('@/views/cluster/k8s/DaemonSetDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sDaemonSets', title: 'DaemonSet 详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/jobs',
            name: 'ClusterK8sJobs',
            component: () => import('@/views/cluster/k8s/Jobs'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sJobs', title: 'Jobs' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/jobs/detail',
            name: 'ClusterK8sJobDetail',
            component: () => import('@/views/cluster/k8s/JobDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sJobs', title: 'Job 详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/cronjobs',
            name: 'ClusterK8sCronJobs',
            component: () => import('@/views/cluster/k8s/CronJobs'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sCronJobs', title: 'CronJobs' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/cronjobs/detail',
            name: 'ClusterK8sCronJobDetail',
            component: () => import('@/views/cluster/k8s/CronJobDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sCronJobs', title: 'CronJob 详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/persistentvolumes',
            name: 'ClusterK8sPersistentVolumes',
            component: () => import('@/views/cluster/k8s/PersistentVolumes'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sPersistentVolumes', title: '持久卷' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/persistentvolumes/detail',
            name: 'ClusterK8sPersistentVolumeDetail',
            component: () => import('@/views/cluster/k8s/PersistentVolumeDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sPersistentVolumes', title: '持久卷详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/persistentvolumeclaims',
            name: 'ClusterK8sPersistentVolumeClaims',
            component: () => import('@/views/cluster/k8s/PersistentVolumeClaims'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sPersistentVolumeClaims', title: 'PVC' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/persistentvolumeclaims/detail',
            name: 'ClusterK8sPersistentVolumeClaimDetail',
            component: () => import('@/views/cluster/k8s/PersistentVolumeClaimDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sPersistentVolumeClaims', title: 'PVC 详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/storageclasses',
            name: 'ClusterK8sStorageClasses',
            component: () => import('@/views/cluster/k8s/StorageClasses'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sStorageClasses', title: 'StorageClass' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/storageclasses/detail',
            name: 'ClusterK8sStorageClassDetail',
            component: () => import('@/views/cluster/k8s/StorageClassDetail'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sStorageClasses', title: 'StorageClass 详情' }
          },
          {
            path: '/cluster/:clusterId(\\d+)/k8s/events',
            name: 'ClusterK8sEvents',
            component: () => import('@/views/cluster/k8s/Events'),
            meta: { nav: 'ResourceLayout', appNav: 'ClusterK8sEvents', title: '事件' }
          }
        ]
      },
      {
        path: '/cluster/:clusterId(\\d+)/settings',
        redirect: route => ({ name: 'ClusterSwarmSettings', params: { clusterId: route.params.clusterId } })
      },
      {
        path: '/appmarket',
        name: 'AppMarket',
        component: () => import('@/views/app-market/index'),
        meta: { nav: 'AppMarket', title: '应用市场' }
      },
      {
        path: '/appmarket/:tplId(\\d+)/profile',
        name: 'AppMarketProfile',
        component: () => import('@/views/app-market/profile'),
        meta: { nav: 'AppMarket', title: '模板详情' }
      },
      {
        path: '/appmarket/installations',
        name: 'AppMarketInstallations',
        component: () => import('@/views/app-market/Installations'),
        meta: { nav: 'AppMarket', title: '安装记录' }
      }
    ]
  },

  // 404 page must be placed at the end !!!
  { path: '*', redirect: '/404', hidden: true }
]

const createRouter = () => new Router({
  mode: 'history', // require service support
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})

const router = createRouter()

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    window.document.title = to.meta.title + ' - ' + settings.title
  }
  next()
})

// Detail see: https://github.com/vuejs/vue-router/issues/1234#issuecomment-357941465
export function resetRouter () {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher // reset router
}

export default router
