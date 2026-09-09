<template>
  <div class="project-container">
    <div class="project-main">
      <el-steps :active="activeStep" finish-status="success" align-center class="project-wizard-steps">
        <el-step title="基本信息" description="名称与项目组" />
        <el-step :title="mainForm.develop ? '代码与集群' : '镜像来源'" :description="mainForm.develop ? 'Git 与 BuildKit' : '选择已有镜像'" />
        <el-step :title="mainForm.develop ? '构建方案' : '运行设置'" :description="mainForm.develop ? 'Dockerfile 模板' : '端口与运行参数'" />
        <el-step title="镜像与确认" description="检查并保存" />
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
          <el-form-item label="所属项目组" prop="group_id">
          <el-select
            v-model="mainForm.group_id"
            class="form-item-control"
            filterable
            remote
            placeholder="请输入项目组ID、名称、标识搜索"
            :remote-method="searchGroup"
            :loading="groupSearchLoading"
            @change="groupChanged">
            <el-option
              v-for="group in groups"
              :key="group.id"
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
          <el-form-item label="启用构建" prop="develop">
          <el-switch v-model="mainForm.develop" @change="developChanged"></el-switch>
          <span class="little-tips tag-item-5">
            若关闭构建，则不创建 Git 仓库和流水线；创建项目时直接校验并登记 Registry 已有镜像
          </span>
          </el-form-item>
          <el-form-item v-if="!mainForm.develop" label="导入方式">
            <el-radio-group v-model="mainForm.runtime_import" @change="runtimeImportModeChanged">
              <el-radio :label="false">从已有镜像创建</el-radio>
              <el-radio :label="true">从运行资源导入</el-radio>
            </el-radio-group>
          </el-form-item>
        </section>

        <section v-show="activeStep === 1" class="wizard-panel">
          <template v-if="mainForm.develop">
            <easy-title title="代码仓库与构建集群" margin-set="0 20" />
            <el-form-item label="构建集群" prop="build_cluster_id">
              <el-select v-model="mainForm.build_cluster_id" class="form-item-control" filterable placeholder="请选择 BuildKit 构建集群">
                <el-option v-for="cluster in createProps.build_clusters || []" :key="cluster.id" :label="cluster.title" :value="Number(cluster.id)" />
              </el-select>
              <div class="little-tips">项目组共享的 Git Probe、源码缓存和 BuildKit 构建都在此集群执行。</div>
            </el-form-item>
            <el-form-item label="Git 服务" prop="repository.provider">
              <el-radio-group v-model="mainForm.repository.provider">
                <el-radio v-for="(prop, vendor) in GIT_VENDORS" :key="vendor" :label="Number(vendor)">{{ prop.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="仓库地址" prop="repository.clone_url">
              <el-input v-model="mainForm.repository.clone_url" class="form-item-control" placeholder="支持 HTTP(S) 或 SSH，例如 git@github.com:team/repo.git" />
              <el-alert v-if="String(mainForm.repository.clone_url || '').toLowerCase().startsWith('http://')" class="clear-line-height form-tips" type="warning" :closable="false" title="HTTP Git 会以未加密方式传输源码和凭据，仅建议在可信内网使用。" />
            </el-form-item>
          </template>
          <template v-else>
            <template v-if="mainForm.runtime_import">
              <easy-title title="已有运行资源" margin-set="0 20" />
              <el-alert
                type="warning"
                :closable="false"
                title="导入后 Galaxy 将接管所选 Service 或 Deployment；独立容器会停止并迁移为 Swarm Service，源容器保留用于回滚。" />
              <el-form-item label="来源集群" prop="import_source.cluster_id">
                <el-select
                  v-model="mainForm.import_source.cluster_id"
                  class="form-item-control"
                  filterable
                  placeholder="请选择项目组已授权的在线集群"
                  @change="importClusterChanged">
                  <el-option
                    v-for="cluster in createProps.build_clusters || []"
                    :key="cluster.id"
                    :label="`${cluster.title} · ${cluster.orchestrator_type === 'kubernetes' ? 'Kubernetes' : 'Docker Swarm'}`"
                    :value="Number(cluster.id)" />
                </el-select>
              </el-form-item>
              <el-form-item label="资源类型" prop="import_source.type">
                <el-select
                  v-model="mainForm.import_source.type"
                  class="form-item-control"
                  :disabled="!mainForm.import_source.cluster_id"
                  placeholder="请选择资源类型"
                  @change="importTypeChanged">
                  <el-option
                    v-for="item in importTypeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="mainForm.import_source.type === 'docker_container'" label="所在节点" prop="import_source.node_id">
                <el-select
                  v-model="mainForm.import_source.node_id"
                  class="form-item-control"
                  filterable
                  placeholder="独立容器所在节点"
                  @change="loadImportSources">
                  <el-option
                    v-for="node in importNodes"
                    :key="node.id"
                    :label="`${node.hostname} · ${node.role}`"
                    :value="node.id"
                    :disabled="!node.agent_online" />
                </el-select>
              </el-form-item>
              <el-form-item label="运行资源" prop="import_source.reference">
                <el-select
                  v-model="importResourceKey"
                  class="form-item-control"
                  filterable
                  :loading="importSourcesLoading"
                  :disabled="!canSelectImportResource"
                  placeholder="请选择要导入的运行资源"
                  @change="importResourceChanged">
                  <el-option
                    v-for="resource in importResources"
                    :key="importResourceValue(resource)"
                    :label="importResourceLabel(resource)"
                    :value="importResourceValue(resource)" />
                </el-select>
              </el-form-item>
              <el-form-item label="目标环境" prop="import_env_id">
                <el-select
                  v-model="mainForm.import_env_id"
                  class="form-item-control"
                  filterable
                  placeholder="请选择与来源集群关联的环境">
                  <el-option v-for="env in importEnvironments" :key="env.id" :label="env.title" :value="Number(env.id)" />
                </el-select>
              </el-form-item>
              <el-alert
                v-if="importProfile"
                type="success"
                :closable="false"
                :title="`已读取 ${importProfile.title}：${importProfile.image}，${importProfile.running_count}/${importProfile.desired_count} 运行`" />
              <el-alert
                v-for="warning in importWarnings"
                :key="warning"
                type="warning"
                :closable="false"
                :title="warning" />
            </template>
            <easy-title title="已有镜像来源" margin-set="0 20" />
            <el-alert type="info" :closable="false" title="不启用构建时，Galaxy 不会创建 Git 配置或流水线；请选择已有镜像所在的 Registry。" />
            <el-form-item label="镜像仓库" prop="source_registry_id">
              <el-select
                v-model="mainForm.source_registry_id"
                class="form-item-control"
                size="small"
                clearable
                filterable
                placeholder="请选择 Registry"
                @change="sourceRegistryChanged">
                <el-option v-for="(registry, index) in registries" :key="index" :label="`${registry.address || 'DockerHub'}/${registry.namespace}`" :value="registry.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="镜像名称" prop="image_name">
              <el-select
                v-model="mainForm.image_name"
                class="form-item-control"
                filterable
                allow-create
                default-first-option
                clearable
                :disabled="!mainForm.source_registry_id"
                :loading="repositoryLoading"
                placeholder="选择或输入 Repository，例如 team/api"
                @visible-change="loadRepositoriesOnOpen"
                @change="imageRepositoryChanged">
                <el-option v-for="repository in repositories" :key="repository" :label="repository" :value="repository" />
              </el-select>
              <div class="little-tips">部分 Registry 不允许枚举仓库，此时可以直接输入完整 Repository。</div>
            </el-form-item>
            <el-form-item label="镜像 Tag" prop="image_tag">
              <el-select
                v-model="mainForm.image_tag"
                class="form-item-control"
                filterable
                allow-create
                default-first-option
                clearable
                :disabled="!mainForm.source_registry_id || !mainForm.image_name"
                :loading="tagLoading"
                placeholder="选择或输入 Tag，例如 latest、8.8"
                @visible-change="loadTagsOnOpen">
                <el-option v-for="tag in imageTags" :key="tag" :label="tag" :value="tag" />
              </el-select>
            </el-form-item>
          </template>
        </section>

        <section v-show="activeStep === 2" class="wizard-panel">
          <template v-if="mainForm.develop">
            <easy-title title="Dockerfile 与构建方案" margin-set="0 20" />
            <el-alert title="Galaxy 会创建默认 BuildKit 流水线：获取 Git 源码、构建镜像并推送到 Registry。" type="info" :closable="false" style="margin-bottom: 18px" />
            <build-profile-form
              ref="build-profile"
              v-model="mainForm.build_profile"
              :org-id="orgId"
              :group-id="mainForm.group_id"
              :cluster-id="mainForm.build_cluster_id"
              :repository="mainForm.repository" />
          </template>
          <template v-else>
            <easy-title title="运行设置" margin-set="0 20" />
            <el-form-item label="默认端口" prop="default_port">
              <el-input v-model="mainForm.default_port" class="form-item-control" placeholder="容器监听端口" />
            </el-form-item>
          </template>
        </section>

        <section v-show="activeStep === 3" class="wizard-panel">
          <easy-title title="镜像配置与确认" margin-set="0 20" />
          <el-form-item v-if="mainForm.develop" label="推送仓库" prop="registries">
          <div class="little-tips">
            <span>
              设置项目构建镜像成功后推送的目标镜像仓库，可以选择多个，如果为空则将使用组织默认推送镜像仓库
            </span>
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
          <el-form-item v-if="mainForm.develop" label="镜像名称" prop="image_name">
          <el-input
            v-model="mainForm.image_name"
            class="form-item-control"
            :placeholder="mainForm.develop ? '项目构建生成的镜像名称，不填写将使用项目别名' : '已有镜像的 Repository 名称，例如 team/api'" />
          </el-form-item>
          <el-form-item v-if="mainForm.develop" label="默认端口" prop="default_port">
          <el-input
            v-model="mainForm.default_port"
            class="form-item-control"
            placeholder="默认端口，根据此端口创建默认网络配置"
            name="title" />
          <span class="little-tips tag-item-5">
            必须与镜像容器监听的端口一致，例如 Nginx 容器会监听 80/443 端口，Hyperf 项目容器监听 9501 端口
          </span>
          </el-form-item>
          <el-alert type="success" :closable="false" :title="`即将创建项目「${mainForm.title || '未命名'}」；保存后可以继续构建、发布和配置网关路由。`" />
        </section>

        <el-form-item class="wizard-actions">
          <el-button v-if="activeStep > 0" @click="previousStep">上一步</el-button>
          <el-button v-if="activeStep < 3" type="primary" @click="nextStep">下一步</el-button>
          <el-button v-else type="primary" :loading="submitLoading" @click="submit">创建项目</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '../components/Breadcrumb'
import EasyTitle from '../components/EasyTitle'
import OrgUser from '../components/OrgUser'
import BuildProfileForm from './components/BuildProfileForm'
import {
  projectCreate,
  projectCreateProps,
  projectRegistries,
  projectRegistryCatalog,
  projectRegistryTags,
  projectImportSources,
  projectImportSourceProfile
} from '@/api/project'
import { groupSimple } from '@/api/group'
import { formatDate } from '@/utils/filters'
import {
  GITREPO_EXTERNAL,
  GIT_VENDORS,
  GITSRC_REGEX
} from '@/consts/project'
import { formatInArrayNumber, routeBreadcrumb, routeBreadcrumbFind } from '@/utils/helpers'
import { ALIAS_REGEX } from '@/consts/org'

export default {
  name: 'ProjectCreate',
  components: {
    Breadcrumb,
    EasyTitle,
    OrgUser,
    BuildProfileForm
  },
  computed: {
    // 组织ID
    orgId () {
      return this.$store.getters.orgId
    },
    selectedImportCluster () {
      return (this.createProps.build_clusters || []).find(
        cluster => Number(cluster.id) === Number(this.mainForm.import_source.cluster_id)
      ) || null
    },
    importTypeOptions () {
      if (!this.selectedImportCluster) return []
      return this.selectedImportCluster.orchestrator_type === 'kubernetes'
        ? [{ value: 'kubernetes_deployment', label: 'Kubernetes Deployment' }]
        : [
            { value: 'swarm_service', label: 'Swarm Service' },
            { value: 'docker_container', label: '独立 Docker 容器' }
          ]
    },
    canSelectImportResource () {
      return Boolean(
        this.mainForm.import_source.type &&
        (this.mainForm.import_source.type !== 'docker_container' || this.mainForm.import_source.node_id)
      )
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        routeBreadcrumbFind(this, { name: 'Project' }),
        { title: this.$route.meta.title, to: '' }
      ]
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
      if (this.mainForm.repository.type != GITREPO_EXTERNAL) {
        return callback()
      }
      if (!this.mainForm.repository.clone_url) {
        return callback(new Error('请填写仓库地址'))
      } else {
        // eslint-disable-next-line
        if (GITSRC_REGEX.test(this.mainForm.repository.clone_url)) {
          return callback()
        } else {
          return callback(new Error('仓库地址错误，仅支持 HTTP(S) 或 SSH 仓库地址'))
        }
      }
    }
    const validGitVendor = (rule, value, callback) => {
      if (!this.mainForm.develop) {
        return callback()
      }
      if (this.mainForm.repository.type != GITREPO_EXTERNAL) {
        return callback()
      }
      if (!this.mainForm.repository.provider) {
        return callback(new Error('请选择Git厂商'))
      }
      return callback()
    }
    const validImageName = (rule, value, callback) => {
      if (!this.mainForm.develop && !String(value || '').trim()) {
        return callback(new Error('关闭构建时必须填写已有镜像的 Repository 名称'))
      }
      if (value && !/^[a-z0-9]+(?:[._/-][a-z0-9]+)*$/.test(value)) {
        return callback(new Error('镜像名称只能包含小写字母、数字及 . _ - / 分隔符'))
      }
      return callback()
    }
    const validRegistries = (rule, value, callback) => {
      if (!this.mainForm.develop && (!Array.isArray(value) || value.length === 0)) {
        return callback(new Error('关闭构建时必须选择镜像仓库'))
      }
      return callback()
    }
    const validSourceRegistry = (rule, value, callback) => {
      return !this.mainForm.develop && !value
        ? callback(new Error('关闭构建时必须选择镜像仓库'))
        : callback()
    }
    const validImageTag = (rule, value, callback) => {
      if (this.mainForm.develop) return callback()
      if (!String(value || '').trim()) return callback(new Error('请选择或填写镜像 Tag'))
      return /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(value)
        ? callback()
        : callback(new Error('镜像 Tag 格式不合法'))
    }
    const validImportField = (label) => (rule, value, callback) => {
      return this.mainForm.runtime_import && !value
        ? callback(new Error(`请选择${label}`))
        : callback()
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
        group_id: null,
        title: null,
        desc: null,
        develop: true,
        runtime_import: false,
        import_env_id: null,
        import_source: {
          type: null,
          cluster_id: null,
          reference: null,
          namespace: '',
          node_id: ''
        },
        build_cluster_id: null,
        repository: { type: GITREPO_EXTERNAL, provider: null, clone_url: null },
        build_profile: {
          dockerfile_source: 'repository',
          build_context: '.',
          repository_dockerfile_path: 'Dockerfile',
          template_key: '',
          options: { mirror: { key: 'official', url: '' }, os_mirror: { key: 'aliyun', sources: {} } }
        },
        image_name: null,
        image_tag: null,
        source_registry_id: null,
        registries: [],
        default_port: 8080,
        alias: null
      },
      mainFormRules: {
        group_id: [
          { required: true, message: '请选择关联项目组', trigger: 'blur' }
        ],
        title: [
          { required: true, message: '请输入项目名称', trigger: 'blur' },
          { max: 50, message: '项目名称不能超过50个字符串长度', trigger: 'blur' }
        ],
        build_cluster_id: [
          { validator: validBuildCluster, trigger: 'change' }
        ],
        desc: [
          { max: 500, message: '项目描述不能超过500个字符串长度', trigger: 'blur' }
        ],
        'repository.provider': [
          { validator: validGitVendor, trigger: 'change' }
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
        image_tag: [
          { validator: validImageTag, trigger: ['blur', 'change'] }
        ],
        source_registry_id: [
          { validator: validSourceRegistry, trigger: 'change' }
        ],
        import_env_id: [
          { validator: validImportField('目标环境'), trigger: 'change' }
        ],
        'import_source.cluster_id': [
          { validator: validImportField('来源集群'), trigger: 'change' }
        ],
        'import_source.type': [
          { validator: validImportField('资源类型'), trigger: 'change' }
        ],
        'import_source.reference': [
          { validator: validImportField('运行资源'), trigger: 'change' }
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
      // 下拉框groups
      groups: [],
      // 项目可用registry列表
      registries: [],
      repositories: [],
      imageTags: [],
      repositoryLoading: false,
      tagLoading: false,
      importResources: [],
      importNodes: [],
      importEnvironments: [],
      importResourceKey: null,
      importProfile: null,
      importWarnings: [],
      importSourcesLoading: false,
      // 项目组搜索loading
      groupSearchLoading: false,
      // 项目创建/编辑特殊属性
      createProps: { registry_push: null, build_clusters: [] }
    }
  },
  created () {
    if (this.$route.query.group) {
      this.mainForm.group_id = this.$route.query.group
      this.queryGroupSelector(this.mainForm.group_id).then(() => {
        const selected = this.groups.find(group =>
          String(group.id) === String(this.mainForm.group_id) ||
          String(group.alias || '') === String(this.mainForm.group_id)
        )
        if (selected) this.mainForm.group_id = selected.id
        return this.groupChanged()
      })
    } else {
      this.queryGroupSelector()
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
        valid = await this.validateFields(['group_id', 'title', 'alias', 'desc'])
      } else if (this.activeStep === 1) {
        if (this.mainForm.develop) {
          valid = await this.validateFields(['build_cluster_id', 'repository.provider', 'repository.clone_url'])
        } else {
          const fields = ['source_registry_id', 'image_name', 'image_tag']
          if (this.mainForm.runtime_import) {
            fields.unshift(
              'import_source.cluster_id',
              'import_source.type',
              'import_source.reference',
              'import_env_id'
            )
          }
          valid = await this.validateFields(fields)
        }
      } else if (this.activeStep === 2) {
        valid = this.mainForm.develop
          ? Boolean(this.$refs['build-profile'] && this.$refs['build-profile'].validate())
          : await this.validateFields(['default_port'])
      }
      if (valid) this.activeStep = Math.min(3, this.activeStep + 1)
    },
    previousStep () {
      this.activeStep = Math.max(0, this.activeStep - 1)
    },
    // 加载registry列表
    loadRegistries () {
      if (!this.mainForm.group_id) {
        this.registries = []
        return Promise.resolve()
      }
      return projectRegistries(this.orgId, this.mainForm.group_id).then(res => {
        this.registries = res.data.registries
      })
    },
    // 加载项目创建/编辑特殊属性
    loadCreateProps () {
      if (!this.mainForm.group_id) {
        this.createProps = { registry_push: null, build_clusters: [] }
        return Promise.resolve()
      }
      return projectCreateProps(this.orgId, this.mainForm.group_id).then(res => {
        this.createProps = res.data.props
        const clusters = this.createProps.build_clusters || []
        if (!this.mainForm.build_cluster_id && clusters.length === 1) {
          this.mainForm.build_cluster_id = Number(clusters[0].id)
        }
      })
    },
    groupChanged () {
      this.mainForm.registries = []
      this.mainForm.source_registry_id = null
      this.mainForm.image_name = null
      this.mainForm.image_tag = null
      this.repositories = []
      this.imageTags = []
      this.resetRuntimeImport()
      this.mainForm.build_cluster_id = null
      return Promise.all([this.loadCreateProps(), this.loadRegistries()])
    },
    developChanged (enabled) {
      if (enabled) {
        this.mainForm.runtime_import = false
        this.resetRuntimeImport()
      }
    },
    runtimeImportModeChanged (enabled) {
      if (!enabled) this.resetRuntimeImport()
    },
    resetRuntimeImport () {
      this.mainForm.import_env_id = null
      this.mainForm.import_source = {
        type: null,
        cluster_id: null,
        reference: null,
        namespace: '',
        node_id: ''
      }
      this.importResources = []
      this.importNodes = []
      this.importEnvironments = []
      this.importResourceKey = null
      this.importProfile = null
      this.importWarnings = []
    },
    importClusterChanged () {
      const options = this.importTypeOptions
      this.mainForm.import_source.type = options.length === 1 ? options[0].value : null
      this.mainForm.import_source.reference = null
      this.mainForm.import_source.namespace = ''
      this.mainForm.import_source.node_id = ''
      this.mainForm.import_env_id = null
      this.importResources = []
      this.importNodes = []
      this.importEnvironments = []
      this.importResourceKey = null
      this.importProfile = null
      if (this.mainForm.import_source.type) this.loadImportSources()
    },
    importTypeChanged () {
      this.mainForm.import_source.reference = null
      this.mainForm.import_source.namespace = ''
      this.mainForm.import_source.node_id = ''
      this.importResources = []
      this.importResourceKey = null
      this.importProfile = null
      this.loadImportSources()
    },
    loadImportSources () {
      if (!this.mainForm.import_source.cluster_id || !this.mainForm.import_source.type) return Promise.resolve()
      this.importSourcesLoading = true
      return projectImportSources(
        this.orgId,
        this.mainForm.group_id,
        this.mainForm.import_source.cluster_id,
        this.mainForm.import_source.type,
        this.mainForm.import_source.node_id
      ).then(res => {
        this.importResources = res.data.resources || []
        this.importNodes = res.data.nodes || []
        this.importEnvironments = res.data.environments || []
        if (!this.mainForm.import_env_id && this.importEnvironments.length === 1) {
          this.mainForm.import_env_id = Number(this.importEnvironments[0].id)
        }
      }).finally(() => {
        this.importSourcesLoading = false
      })
    },
    importResourceValue (resource) {
      return this.mainForm.import_source.type === 'kubernetes_deployment'
        ? `${resource.namespace}/${resource.name}`
        : String(resource.id || '')
    },
    importResourceLabel (resource) {
      if (this.mainForm.import_source.type === 'kubernetes_deployment') {
        return `${resource.namespace}/${resource.name} · ${(resource.images || []).join(', ')} · ${resource.ready_replicas}/${resource.replicas}`
      }
      if (this.mainForm.import_source.type === 'swarm_service') {
        return `${resource.name} · ${resource.image} · ${resource.running_tasks}/${resource.desired_tasks}`
      }
      return `${resource.name} · ${resource.image} · ${resource.state}`
    },
    importResourceChanged (value) {
      const resource = this.importResources.find(item => this.importResourceValue(item) === value)
      if (!resource) return
      if (this.mainForm.import_source.type === 'kubernetes_deployment') {
        this.mainForm.import_source.reference = resource.name
        this.mainForm.import_source.namespace = resource.namespace
      } else {
        this.mainForm.import_source.reference = resource.id
        this.mainForm.import_source.namespace = ''
      }
      projectImportSourceProfile(
        this.orgId,
        this.mainForm.group_id,
        this.mainForm.import_source
      ).then(res => {
        this.importProfile = res.data.profile
        this.importWarnings = this.importProfile.warnings || []
        this.mainForm.default_port = Number(this.importProfile.default_port || 8080)
        this.applyImportedImage(this.importProfile.image)
      })
    },
    applyImportedImage (image) {
      const withoutDigest = String(image || '').split('@')[0]
      const lastSlash = withoutDigest.lastIndexOf('/')
      const lastColon = withoutDigest.lastIndexOf(':')
      const tag = lastColon > lastSlash ? withoutDigest.slice(lastColon + 1) : 'latest'
      const fullRepository = lastColon > lastSlash ? withoutDigest.slice(0, lastColon) : withoutDigest
      const registry = this.registries.find(item => {
        const address = String(item.address || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
        return address ? fullRepository.startsWith(`${address}/`) : !/^[^/]+[.:][^/]+\//.test(fullRepository)
      })
      if (registry) {
        const address = String(registry.address || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
        this.mainForm.source_registry_id = registry.id
        this.mainForm.registries = [registry.id]
        this.mainForm.image_name = address ? fullRepository.slice(address.length + 1) : fullRepository
        this.mainForm.image_tag = tag
        this.repositories = [this.mainForm.image_name]
        this.imageTags = [tag]
      } else {
        this.mainForm.source_registry_id = null
        this.mainForm.registries = []
        this.mainForm.image_name = fullRepository
        this.mainForm.image_tag = tag
        this.repositories = [fullRepository]
        this.imageTags = [tag]
        this.$message.warning('未找到与运行资源镜像域名匹配的 Galaxy 镜像仓库，请手动选择仓库并核对 Repository')
      }
    },
    sourceRegistryChanged (registryId) {
      this.mainForm.registries = registryId ? [registryId] : []
      this.mainForm.image_name = null
      this.mainForm.image_tag = null
      this.repositories = []
      this.imageTags = []
      if (registryId) this.loadRepositories()
    },
    loadRepositoriesOnOpen (visible) {
      if (visible && this.mainForm.source_registry_id && this.repositories.length === 0) {
        this.loadRepositories()
      }
    },
    loadRepositories () {
      if (this.repositoryLoading) return Promise.resolve()
      this.repositoryLoading = true
      return projectRegistryCatalog(
        this.orgId,
        this.mainForm.group_id,
        this.mainForm.source_registry_id
      ).then(res => {
        this.repositories = res.data.repos || []
      }).finally(() => {
        this.repositoryLoading = false
      })
    },
    imageRepositoryChanged () {
      this.mainForm.image_tag = null
      this.imageTags = []
      if (this.mainForm.image_name) this.loadTags()
    },
    loadTagsOnOpen (visible) {
      if (visible && this.mainForm.image_name && this.imageTags.length === 0) {
        this.loadTags()
      }
    },
    loadTags () {
      if (this.tagLoading) return Promise.resolve()
      this.tagLoading = true
      return projectRegistryTags(
        this.orgId,
        this.mainForm.group_id,
        this.mainForm.source_registry_id,
        this.mainForm.image_name
      ).then(res => {
        this.imageTags = (res.data.tags || []).slice().sort().reverse()
      }).finally(() => {
        this.tagLoading = false
      })
    },
    // 提交表单
    submit () {
      if (this.mainForm.develop && this.$refs['build-profile'] && !this.$refs['build-profile'].validate()) return
      this.$refs['main-form'].validate((valid) => {
        if (valid) {
          this.submitLoading = true
          projectCreate(
            this.orgId,
            this.mainForm.group_id,
            Object.assign({}, this.mainForm, {
              develop: this.mainForm.develop
            })
          ).then(res => {
            this.$message.success('项目创建成功')
            const project = res.data.project
            this.$router.push({
              name: 'ProjectOverview',
              params: {
                groupId: project.group.alias || project.group.id,
                projectId: project.alias || project.id
              }
            })
          }).finally(() => {
            this.submitLoading = false
          })
        }
      })
    },
    goBack () {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push({ name: 'Project' })
    },
    // 项目组远程搜索
    searchGroup (query) {
      this.queryGroupSelector(query)
    },
    // 查询项目组下拉框
    queryGroupSelector (keyword = null) {
      this.groupSearchLoading = true
      return groupSimple(this.orgId, keyword, 1)
        .then(res => {
          this.groups = formatInArrayNumber(res.data.groups, ['id'])
        }).finally(() => {
          this.groupSearchLoading = false
        })
    }
  }
}
</script>

<style lang="scss" scoped>
.main-form {
  .form-item-control {
    width: 420px;
  }
}
.project-wizard-steps { max-width: 960px; margin: 18px auto 34px; }
.wizard-panel { min-height: 360px; padding: 4px 22px 24px; }
.wizard-actions { margin-top: 24px; padding-top: 18px; border-top: 1px solid #ebeef5; }
</style>
