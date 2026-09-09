<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />

    <div class="project-main">
      <el-steps :active="activeStep" finish-status="success" align-center class="project-wizard-steps">
        <el-step title="基本信息" description="名称与端口" />
        <el-step title="镜像配置" description="Registry 与 Repository" />
        <el-step title="代码与集群" description="Git 与 BuildKit" />
        <el-step title="构建方案" description="Dockerfile 与确认" />
      </el-steps>
      <el-form
        ref="main-form"
        class="main-form"
        label-position="right"
        label-width="100px"
        size="medium"
        :model="mainForm"
        :rules="mainFormRules"
        @submit.native.prevent="submit">
        <section v-show="activeStep === 0" class="wizard-panel">
        <easy-title title="基本信息" margin-set="0 20" />
        <el-form-item label="项目ID" prop="id">
          <el-input
            v-model="mainForm.id"
            class="form-item-control"
            placeholder="项目ID"
            name="title"
            disabled/>
        </el-form-item>
        <el-form-item label="所属项目组" prop="group_id">
          <el-select
            v-model="mainForm.group_id"
            class="form-item-control"
            size="small"
            clearable
            disabled
            placeholder="项目组筛选">
            <el-option
              v-for="(group, index) in groups"
              :key="index"
              :label="group.title"
              :value="group.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="项目名称" prop="title">
          <el-input
            v-model="mainForm.title"
            class="form-item-control"
            placeholder="项目名称"
            name="title" />
        </el-form-item>
        <el-form-item label="别名" prop="alias">
          <el-input
            v-model="mainForm.alias"
            disabled
            class="form-item-control"
            placeholder="别名，可为空"
            style="width: 300px;" />
          <span class="little-tips tag-item-5">
            用于URL等场景，小写字母数字及-_组成，不可以数字-_开头以及-_结尾，不可超过50个字符串长度，组织内唯一
          </span>
        </el-form-item>
        <el-form-item label="项目描述" prop="desc">
          <el-input
            v-model="mainForm.desc"
            :maxlength="500"
            show-word-limit
            :rows="5"
            type="textarea"
            class="form-item-control form-item-textarea"
            placeholder="项目描述"
            name="desc" />
        </el-form-item>
        <el-alert
          v-if="mainForm.develop"
          title="技术栈由仓库代码、Dockerfile 与 BuildKit 流水线定义，不再绑定平台固定的语言或框架版本。"
          type="info"
          :closable="false"
          style="margin-bottom: 18px" />
        <el-form-item label="默认端口" prop="default_port">
          <el-input
            v-model="mainForm.default_port"
            class="form-item-control"
            placeholder="默认端口，根据此端口创建默认网络配置"
            name="title" />
        </el-form-item>
        </section>

        <section v-show="activeStep === 1" class="wizard-panel">
        <easy-title title="镜像配置" margin-set="0 20" />
        <el-form-item :label="mainForm.develop ? '推送镜像仓库' : '镜像仓库'" prop="registries">
          <div class="little-tips">
            {{ mainForm.develop ? '设置项目构建镜像时推送的目标仓库；为空时使用组织默认推送仓库' : '设置已有镜像所在的 Registry' }}
            <code v-if="createProps.registry_push">
              {{ createProps.registry_push.address || 'DockerHub' }}/{{ createProps.registry_push.namespace }}
            </code>
          </div>
          <el-select
            v-model="mainForm.registries"
            class="form-item-control"
            size="small"
            multiple
            clearable
            placeholder="可以选择一个或者多个或者为空">
            <el-option
              v-for="(registry, index) in registries"
              :key="index"
              :label="`${registry.address || 'DockerHub'}/${registry.namespace}`"
              :value="registry.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="镜像名称" prop="image_name">
          <el-input
            v-model="mainForm.image_name"
            class="form-item-control"
            :placeholder="mainForm.develop ? '项目构建生成的镜像名称' : 'Registry namespace 下的 Repository，例如 team/api'" />
        </el-form-item>
        </section>

        <section v-show="activeStep === 2" class="wizard-panel">
        <easy-title v-if="mainForm.develop" title="代码仓库配置" margin-set="0 20" />
        <el-form-item v-if="mainForm.develop" label="构建集群" prop="build_cluster_id">
          <el-select v-model="mainForm.build_cluster_id" class="form-item-control" filterable placeholder="请选择 BuildKit 构建集群">
            <el-option
              v-for="cluster in createProps.build_clusters || []"
              :key="cluster.id"
              :label="cluster.title"
              :value="Number(cluster.id)" />
          </el-select>
          <div class="little-tips">修改后，新的 Git Probe、Pipeline 和 BuildKit 构建将使用此集群。</div>
        </el-form-item>
        <el-form-item v-if="mainForm.develop" label="Git 服务" prop="repository.provider">
          <el-radio-group v-model="mainForm.repository.provider">
            <el-radio
              v-for="(prop, vendor) in GIT_VENDORS"
              :key="vendor"
              :label="Number(vendor)">{{ prop.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="mainForm.develop && mainForm.repository.type == GITREPO_EXTERNAL" label="仓库地址" prop="repository.clone_url">
          <el-input
            v-model="mainForm.repository.clone_url"
            class="form-item-control"
            placeholder="支持 HTTP(S) 或 SSH，例如 https://github.com/swoole/swoole-src.git"
            name="repository.clone_url" />
          <el-alert
            v-if="String(mainForm.repository.clone_url || '').toLowerCase().startsWith('http://')"
            class="clear-line-height form-tips"
            type="warning"
            :closable="false"
            title="HTTP Git 会以未加密方式传输源码和私有仓库 Token，仅建议在可信内网使用。" />
        </el-form-item>
        <el-alert v-if="!mainForm.develop" type="info" :closable="false" title="该项目使用已有镜像，不需要 Git 仓库或构建集群。" />
        </section>

        <section v-show="activeStep === 3" class="wizard-panel">
        <template v-if="mainForm.develop">
          <easy-title title="Dockerfile 与构建方案" margin-set="0 20" />
          <build-profile-form
            ref="build-profile"
            v-model="mainForm.build_profile"
            :org-id="orgId"
            :group-id="groupId"
            :project-id="projectId" />
        </template>
        <el-alert v-else type="success" :closable="false" title="已有镜像项目无需 Dockerfile；确认前面配置后即可保存。" />
        </section>
        <el-form-item class="wizard-actions">
          <el-button v-if="activeStep > 0" @click="previousStep">上一步</el-button>
          <el-button v-if="activeStep < 3" type="primary" @click="nextStep">下一步</el-button>
          <el-button v-else type="primary" :loading="submitLoading" @click="submit">保存设置</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '../components/EasyTitle'
import OrgUser from '../components/OrgUser'
import BuildProfileForm from './components/BuildProfileForm'
import { formatDate } from '@/utils/filters'
import {
  projectUpdate,
  projectProfile,
  projectRegistries,
  projectCreateProps
} from '@/api/project'
import {
  GITREPO_EXTERNAL,
  GIT_VENDORS,
  GITSRC_REGEX
} from '@/consts/project'
import { ALIAS_REGEX } from '@/consts/org'
import { routeBreadcrumb, routeBreadcrumbFind } from '@/utils/helpers'

export default {
  name: 'ProjectEdit',
  components: {
    Breadcrumb,
    EasyTitle,
    OrgUser,
    BuildProfileForm
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
    const validateGitSrc = (rule, value, callback) => {
      if (!this.mainForm.develop) {
        return callback()
      }
      if (this.mainForm.repository.type == GITREPO_EXTERNAL && !this.mainForm.repository.clone_url) {
        callback(new Error('选择外部仓库时仓库地址必填'))
      } else if (this.mainForm.repository.type == GITREPO_EXTERNAL && this.mainForm.repository.clone_url) {
        // eslint-disable-next-line
        if (GITSRC_REGEX.test(this.mainForm.repository.clone_url)) {
          callback()
        } else {
          callback(new Error('仓库地址错误，仅支持 HTTP(S) 或 SSH 仓库地址'))
        }
      } else {
        callback()
      }
    }
    const validGitVendor = (rule, value, callback) => {
      if (!this.mainForm.develop || value) {
        return callback()
      }
      return callback(new Error('请选择 Git 服务类型'))
    }
    const validImageName = (rule, value, callback) => {
      if (!this.mainForm.develop && !String(value || '').trim()) {
        return callback(new Error('已有镜像项目必须填写 Repository 名称'))
      }
      if (value && !/^[a-z0-9]+(?:[._/-][a-z0-9]+)*$/.test(value)) {
        return callback(new Error('镜像名称只能包含小写字母、数字及 . _ - / 分隔符'))
      }
      return callback()
    }
    const validRegistries = (rule, value, callback) => {
      if (!this.mainForm.develop && (!Array.isArray(value) || value.length === 0)) {
        return callback(new Error('已有镜像项目必须选择镜像仓库'))
      }
      return callback()
    }
    const validBuildCluster = (rule, value, callback) => {
      return !this.mainForm.develop || value
        ? callback()
        : callback(new Error('请选择 BuildKit 构建集群'))
    }
    const validPort = (rule, value, callback) => {
      const port = Number(value)
      return Number.isInteger(port) && port >= 1 && port <= 65535
        ? callback()
        : callback(new Error('端口必须是 1-65535 之间的整数'))
    }

    return {
      // 常量定义
      GITREPO_EXTERNAL,
      GIT_VENDORS,
      activeStep: 0,
      mainForm: {
        org_id: null,
        group_id: null,
        project_id: null,
        title: null,
        desc: null,
        develop: true,
        build_cluster_id: null,
        repository: { type: GITREPO_EXTERNAL, provider: null, clone_url: null },
        build_profile: {
          dockerfile_source: 'repository', build_context: '.', repository_dockerfile_path: 'Dockerfile',
          template_key: '', options: { mirror: { key: 'official', url: '' }, os_mirror: { key: 'aliyun', sources: {} } }
        },
        default_port: null,
        image_name: null,
        registries: [],
        alias: null
      },
      mainFormRules: {
        title: [
          { required: true, message: '请输入项目名称', trigger: 'blur' },
          { max: 50, message: '项目名称不能超过50个字符串长度', trigger: 'blur' }
        ],
        build_cluster_id: [
          { validator: validBuildCluster, trigger: 'change' }
        ],
        'repository.provider': [
          { validator: validGitVendor, trigger: 'change' }
        ],
        'repository.type': [
          { required: true, message: '请选择Git仓库类型', trigger: 'blur' }
        ],
        'repository.clone_url': [
          { validator: validateGitSrc, trigger: 'blur' }
        ],
        alias: [
          { max: 50, message: '别名不可超过50个字符串长度', trigger: 'blur' },
          { type: 'string', pattern: ALIAS_REGEX, message: '小写字母数字及-_组成，不可以数字-_开头以及-_结尾', trigger: 'blur' }
        ],
        image_name: [
          { validator: validImageName, trigger: ['blur', 'change'] }
        ],
        registries: [
          { validator: validRegistries, trigger: 'change' }
        ],
        default_port: [
          { validator: validPort, trigger: ['blur', 'change'] }
        ]
      },
      // 提交按钮loading
      submitLoading: false,
      // 筛选项目组列表
      groups: [],
      // 项目可用registry列表
      registries: [],
      // 项目创建/编辑特殊属性
      createProps: { registry_push: null, build_clusters: [] }
    }
  },
  computed: {
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: '项目信息', to: '' },
        routeBreadcrumbFind(this, { name: 'ProjectProfile' }, { groupId: this.groupId, projectId: this.projectId }),
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  created () {
    this.loadProfile()
    this.loadCreateProps()
    this.loadRegistries()

    if (this.$route.params.from == 'build') {
      this.$message.info('请修改【镜像配置】栏配置')
    }
  },
  methods: {
    validateFields (fields) {
      return Promise.all(fields.map(field => new Promise(resolve => {
        this.$refs['main-form'].validateField(field, error => resolve(!error))
      }))).then(results => results.every(Boolean))
    },
    async nextStep () {
      let valid = true
      if (this.activeStep === 0) {
        valid = await this.validateFields(['title', 'desc', 'default_port'])
      } else if (this.activeStep === 1) {
        valid = await this.validateFields(['registries', 'image_name'])
      } else if (this.activeStep === 2 && this.mainForm.develop) {
        valid = await this.validateFields(['build_cluster_id', 'repository.provider', 'repository.clone_url'])
      }
      if (valid) this.activeStep = Math.min(3, this.activeStep + 1)
    },
    previousStep () {
      this.activeStep = Math.max(0, this.activeStep - 1)
    },
    // 加载项目详情
    loadProfile () {
      const loading = this.$loading()
      projectProfile(this.orgId, this.groupId, this.projectId).then(res => {
        const project = res.data.project
        this.mainForm = {
          org_id: this.orgId,
          group_id: this.groupId,
          project_id: project.id,
          alias: project.alias,
          title: project.title,
          desc: project.desc,
          develop: Boolean(project.develop),
          build_cluster_id: Number(project.build_cluster_id) || null,
          repository: {
            type: project.repository ? Number(project.repository.type) : GITREPO_EXTERNAL,
            provider: project.repository ? Number(project.repository.provider) : null,
            clone_url: project.repository ? project.repository.clone_url : ''
          },
          build_profile: project.build_profile || {
            dockerfile_source: 'repository', build_context: '.', repository_dockerfile_path: 'Dockerfile',
            template_key: '', options: { mirror: { key: 'official', url: '' }, os_mirror: { key: 'aliyun', sources: {} } }
          },
          default_port: project.default_port,
          image_name: project.image_name,
          registries: project.registries.map(registry => registry.id)
        }
        this.groups = [
          {
            id: project.group.id,
            title: project.group.title
          }
        ]
      }).finally(() => {
        loading.close()
      })
    },
    // 加载registry列表
    loadRegistries () {
      projectRegistries(this.orgId, this.groupId).then(res => {
        this.registries = res.data.registries
      })
    },
    // 加载项目创建/编辑特殊属性
    loadCreateProps () {
      projectCreateProps(this.orgId, this.groupId).then(res => {
        this.createProps = res.data.props
      })
    },
    // 提交表单
    submit () {
      if (this.mainForm.develop && this.$refs['build-profile'] && !this.$refs['build-profile'].validate()) return
      this.$refs['main-form'].validate((valid) => {
        if (valid) {
          this.submitLoading = true
          projectUpdate(
            this.mainForm.org_id,
            this.mainForm.group_id,
            this.mainForm.project_id,
            Object.assign({}, this.mainForm)
          ).then(res => {
            this.$message.success('更新成功')
            const project = res.data.project
            this.$router.push({ name: 'ProjectProfile', params: { groupId: this.groupId, projectId: project.alias || project.id } })
          }).finally(() => {
            this.submitLoading = false
          })
        }
      })
    },
    goBack () {
      this.$router.push({ name: 'ProjectProfile', params: { groupId: this.groupId, projectId: this.projectId } })
    }
  }
}
</script>

<style lang="scss" scoped>
.main-form {
  max-width: 1024px;
  margin: 0 auto;
  .form-item-control {
    width: 420px;
  }
}
.project-wizard-steps { max-width: 960px; margin: 18px auto 34px; }
.wizard-panel { min-height: 360px; padding: 4px 22px 24px; }
.wizard-actions { margin-top: 24px; padding-top: 18px; border-top: 1px solid #ebeef5; }
</style>
