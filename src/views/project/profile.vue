<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />

    <div class="project-main">
      <easy-title title="基本信息" margin-set="0 20" />
      <div style="margin-bottom: 10px">
        <router-link v-if="$p('project.update', project.org_role, project.group_role, project.role)" :to="{ name: 'ProjectProfileEdit', params: { groupId, projectId } }">
          <el-button type="primary" size="small">编辑</el-button>
        </router-link>
      </div>
      <el-descriptions direction="vertical" :column="3" :colon="false" labelClassName="desc-label" contentClassName="desc-content">
        <el-descriptions-item label="项目ID">
          {{ profile.id }}
        </el-descriptions-item>
        <el-descriptions-item label="项目名称">
          {{ profile.title }}
        </el-descriptions-item>
        <el-descriptions-item label="别名">
          <el-tag v-if="!profile.alias" size="mini" type="warning">未设置</el-tag>
          <template v-else>{{ profile.alias }}</template>
        </el-descriptions-item>
        <el-descriptions-item label="所属项目组">
          <router-link v-if="profile.group" :to="{ name: 'GroupProfile', params: { groupId: profile.group.alias || profile.group.id } }">
            <el-link type="primary">
              {{ profile.group.title }}
            </el-link>
          </router-link>
        </el-descriptions-item>
        <el-descriptions-item label="创建人">
          <org-user :user="profile.creator_info" />
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ profile.created_at | formatDate }}
        </el-descriptions-item>
      </el-descriptions>
      <el-descriptions direction="vertical" :column="1" :colon="false" labelClassName="desc-label" contentClassName="desc-content">
        <el-descriptions-item label="项目描述">
          {{ profile.desc }}
        </el-descriptions-item>
      </el-descriptions>

      <easy-title title="项目概览" margin-set="20 20" />
      <el-descriptions direction="vertical" :column="3" :colon="false" labelClassName="desc-label" contentClassName="desc-content">
        <el-descriptions-item label="成员数量">
          {{ profile.member_count }}
        </el-descriptions-item>
        <el-descriptions-item label="上次活跃时间">
          {{ profile.last_active | formatDate }}
        </el-descriptions-item>
        <el-descriptions-item label="实例">
          <router-link :to="{ name: 'ProjectInstance', params: { projectId, groupId } }" class="text-link">
            {{ profile.instances }}
          </router-link>
          个实例
        </el-descriptions-item>
      </el-descriptions>

      <easy-title title="运行配置" margin-set="20 20" />
      <el-descriptions direction="vertical" :column="3" :colon="false" labelClassName="desc-label" contentClassName="desc-content">
        <el-descriptions-item label="来源模式">
          {{ profile.develop ? 'Git 源码 + BuildKit 构建' : '已有 OCI 镜像' }}
        </el-descriptions-item>
        <el-descriptions-item label="默认端口">
          {{ profile.default_port }}
        </el-descriptions-item>
        <el-descriptions-item label="技术栈">
          <technology-badges v-if="buildTechnology" :template="buildTechnology" />
          <span v-else>{{ buildSourceLabel }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <easy-title title="镜像配置" margin-set="20 20" />
      <el-descriptions direction="vertical" :column="1" :colon="false" labelClassName="desc-label" contentClassName="desc-content">
        <el-descriptions-item :label="profile.develop ? '推送镜像仓库' : '镜像仓库'">
          <template v-if="profile.registries.length > 0">
            <code v-for="(registry, index) in profile.registries" :key="index">
              {{ registry.address || 'DockerHub' }}/{{ registry.namespace }}
            </code>
          </template>
          <el-tag v-if="profile.default_registry" size="mini" type="primary">
            组织默认：{{ profile.default_registry.address || 'DockerHub' }}/{{ profile.default_registry.namespace }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <el-descriptions direction="vertical" :column="3" :colon="false" labelClassName="desc-label" contentClassName="desc-content">
        <el-descriptions-item label="镜像名称">
          <template v-if="profile.image_name">
            {{ profile.image_name }}
          </template>
          <el-tag v-else type="primary" size="mini">自动生成</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <easy-title v-if="profile.develop" title="Git仓库配置" margin-set="20 20" />
      <el-descriptions
        v-if="profile.develop"
        direction="vertical"
        :column="3"
        :colon="false"
        labelClassName="desc-label"
        contentClassName="desc-content">
        <el-descriptions-item label="仓库地址">
          {{ profile.repository ? profile.repository.clone_url : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="Git 服务">
          {{ profile.repository && GIT_VENDORS[profile.repository.provider] ? GIT_VENDORS[profile.repository.provider].label : '未知 Git 服务' }}
        </el-descriptions-item>
      </el-descriptions>

      <template v-if="$p('project.exit', project.org_role, project.group_role, project.role)">
        <easy-title title="退出项目" margin-set="20 20" />
        <div class="desc-normal" style="margin-bottom: 10px">
          退出当前项目后，将不再拥有该项目的权限，请谨慎操作。
        </div>
        <el-button type="danger" size="small" @click="exitApp">
          退出当前项目
        </el-button>
      </template>

      <template v-if="$p('project.delete', project.org_role, project.group_role, project.role)">
        <easy-title title="删除项目" margin-set="20 20" />
        <div class="desc-normal" style="margin-bottom: 10px">
          永久删除 CodeGalaxy 中的项目及受管运行资源。外部 Git 仓库、Registry 镜像和运行时命名卷不会被删除。
        </div>
        <el-button type="danger" size="small" :loading="deleteLoading" @click="handleDeleteApp">
          删除当前项目
        </el-button>
      </template>
    </div>

    <el-dialog title="删除项目确认" :visible.sync="dialogDeleteVisible">
      <div class="universal-label text-danger" style="margin-bottom: 15px; line-height: 1.5em">
        删除后，CodeGalaxy 中的项目配置和历史记录无法恢复。独立的个人 Workspace、外部 Git 仓库、Registry 中的镜像及项目 Service 使用的命名卷会保留，需要您在对应模块自行管理。请确认以下实际影响。
      </div>
      <el-alert
        v-if="deleteOverview.gateway_routes"
        type="error"
        :closable="false"
        show-icon
        :title="`当前有 ${deleteOverview.gateway_routes} 条 Web 网关 VHost 引用项目 Service，暂时不能删除`"
        description="请先进入“资源 → 集群 → Web 网关”删除或改绑这些路由，再重新打开删除确认。" />
      <div v-if="deleteOverview.instances" class="delete-overview-confirm-item">
        <el-checkbox v-model="deleteOverviewForm.instances" :true-label="1" :false-label="0">
          确认删除所有（{{ deleteOverview.instances }} 个）项目实例及其 Swarm Service、项目内路由和 Docker Secret；运行时命名卷保留
        </el-checkbox>
      </div>
      <div v-if="deleteOverview.routes" class="delete-overview-confirm-item">
        <el-checkbox v-model="deleteOverviewForm.routes" :true-label="1" :false-label="0">
          确认移除所有（{{ deleteOverview.routes }} 条）项目域名路由
        </el-checkbox>
      </div>
      <div v-if="deleteOverview.artifacts" class="delete-overview-confirm-item">
        <el-checkbox v-model="deleteOverviewForm.artifacts" :true-label="1" :false-label="0">
          确认删除所有（{{ deleteOverview.artifacts }} 条）镜像制品元数据；Registry 中的镜像不会被删除
        </el-checkbox>
      </div>
      <div v-if="deleteOverview.pipelines" class="delete-overview-confirm-item">
        <el-checkbox v-model="deleteOverviewForm.pipelines" :true-label="1" :false-label="0">
          确认删除所有（{{ deleteOverview.pipelines }} 个）流水线
        </el-checkbox>
      </div>
      <div v-if="deleteOverview.githooks" class="delete-overview-confirm-item">
        <el-checkbox v-model="deleteOverviewForm.githooks" :true-label="1" :false-label="0">
          确认删除所有（{{ deleteOverview.githooks }} 个）流水线 Git 钩子配置；外部仓库中的 Webhook 需自行检查
        </el-checkbox>
      </div>
      <div v-if="deleteOverview.members" class="delete-overview-confirm-item">
        <el-checkbox v-model="deleteOverviewForm.members" :true-label="1" :false-label="0">
          确认移除所有（{{ deleteOverview.members }} 名）项目成员
        </el-checkbox>
      </div>
      <div v-if="deleteOverview.builds" class="delete-overview-confirm-item">
        <el-checkbox v-model="deleteOverviewForm.builds" :true-label="1" :false-label="0">
          确认删除所有（{{ deleteOverview.builds }} 条）构建记录与日志
        </el-checkbox>
      </div>
      <div v-if="deleteOverview.deploys" class="delete-overview-confirm-item">
        <el-checkbox v-model="deleteOverviewForm.deploys" :true-label="1" :false-label="0">
          确认删除所有（{{ deleteOverview.deploys }} 条）发布与部署记录
        </el-checkbox>
      </div>
      <div v-if="deleteOverview.monitoring_records" class="delete-overview-confirm-item">
        <el-checkbox v-model="deleteOverviewForm.monitoring_records" :true-label="1" :false-label="0">
          确认删除所有（{{ deleteOverview.monitoring_records }} 条）运行指标、事件、告警和审计记录
        </el-checkbox>
      </div>
      <div v-if="deleteOverview.secrets" class="delete-overview-confirm-item">
        <el-checkbox v-model="deleteOverviewForm.secrets" :true-label="1" :false-label="0">
          确认删除所有（{{ deleteOverview.secrets }} 条）Pipeline、Build 和 Release 加密 Secret 记录
        </el-checkbox>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button size="medium" @click="dialogDeleteVisible = false">取消</el-button>
        <el-button size="medium" type="danger" :disabled="deleteBlocked" @click="confirmDeleteApp">确认删除</el-button>
      </div>
    </el-dialog>

    <id-confirm ref="id-confirm" />
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import TechnologyBadges from '@/views/project/components/TechnologyBadges.vue'
import EasyTitle from '../components/EasyTitle'
import OrgUser from '../components/OrgUser'
import { projectProfile, projectExit, projectDelete, projectDeleteOverview } from '@/api/project'
import { formatDate } from '@/utils/filters'
import { GIT_VENDORS } from '@/consts/project'
import IdConfirm from '@/views/components/IdConfirm'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'ProjectProfile',
  components: {
    Breadcrumb,
    TechnologyBadges,
    EasyTitle,
    OrgUser,
    IdConfirm
  },
  props: {
    project: {
      type: Object,
      default: null
    },
    projectId: {
      type: [Number, String],
      required: true
    },
    groupId: {
      type: [Number, String],
      required: true
    },
    orgId: {
      type: [Number, String],
      required: true
    }
  },
  filters: {
    formatDate
  },
  data () {
    return {
      // 项目信息
      profile: {
        instances: 0,
        group: {
          id: 0
        },
        creator_info: {},
        framework: {},
        develop: false,
        registries: []
      },
      deleteLoading: false,
      deleteOverview: {},
      dialogDeleteVisible: false,
      deleteOverviewForm: {},
      // 常量定义
      GIT_VENDORS
    }
  },
  computed: {
    buildTechnology () {
      return this.profile.build_profile && this.profile.build_profile.technology
        ? this.profile.build_profile.technology
        : null
    },
    buildSourceLabel () {
      if (!this.profile.develop) return '已有 OCI 镜像'
      return this.profile.build_profile && this.profile.build_profile.dockerfile_source === 'repository'
        ? '仓库 Dockerfile'
        : '-'
    },
    deleteBlocked () {
      return Number(this.deleteOverview.gateway_routes || 0) > 0
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: '项目信息', to: '' },
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  created () {
    this.loadProfile()
  },
  methods: {
    // 加载项目详情
    loadProfile () {
      const loading = this.$loading()
      projectProfile(this.orgId, this.groupId, this.projectId, 1).then(res => {
        this.profile = res.data.project
      }).finally(() => {
        loading.close()
      })
    },
    // 退出项目
    exitApp () {
      this.$confirm(`您确定要退出当前项目？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loading = this.$loading()
        projectExit(this.orgId, this.groupId, this.projectId).then(res => {
          this.$message.success('您已退出当前项目')
          this.$router.push({ path: '/project' })
        }).finally(() => {
          loading.close()
        })
      })
    },
    // 触发删除项目
    handleDeleteApp () {
      // 使用已缓存概览
      if (typeof this.deleteOverview.instances !== 'undefined') {
        this.dialogDeleteVisible = true
        return
      }

      // 获取删除资源概览
      this.deleteLoading = true
      projectDeleteOverview(this.orgId, this.groupId, this.projectId).then(res => {
        this.deleteOverview = res.data
        this.dialogDeleteVisible = true
      }).finally(() => {
        this.deleteLoading = false
      })
    },
    // 确认删除项目
    confirmDeleteApp () {
      if (this.deleteBlocked) {
        return this.$message.error('请先在 Web 网关删除或改绑引用当前项目 Service 的 VHost')
      }
      for (const field in this.deleteOverview) {
        if (field === 'gateway_routes') continue
        if (!this.deleteOverview[field]) {
          continue
        }
        if (this.deleteOverviewForm[field] != 1) {
          return this.$message.error('请勾选所有复选框')
        }
      }

      const cb = token => {
        const loading = this.$loading()
        projectDelete(this.orgId, this.groupId, this.projectId, token).then(res => {
          this.$message.success('您已删除当前项目')

          // 完成验证
          this.$refs['id-confirm'].finish()

          this.$router.push({ path: '/project' })
        }).finally(() => {
          loading.close()
        })
      }
      this.$refs['id-confirm'].confirm(`删除当前项目`, cb.bind(this))
    }
  }
}
</script>

<style lang="scss" scoped>
.delete-overview-confirm-item {
  margin-bottom: 3px;
}
</style>
