<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <div class="project-main" v-loading="loading">
      <easy-title :title="editing ? '编辑 BuildKit 流水线' : '创建 BuildKit 流水线'" margin-set="0 20" />
      <el-alert
        title="Pipeline v1 从确定的 Git Commit 构建并推送容器镜像，同时生成 SBOM 与 provenance。"
        type="info"
        :closable="false"
        show-icon />
      <el-form ref="form" class="pipeline-form" :model="form" :rules="rules" label-width="130px">
        <el-form-item label="名称" prop="title">
          <el-input v-model.trim="form.title" maxlength="100" />
        </el-form-item>
        <el-form-item label="构建集群" prop="cluster_id">
          <el-select v-model="form.cluster_id" disabled placeholder="项目尚未设置构建集群">
            <el-option v-for="cluster in options.clusters" :key="cluster.id" :label="cluster.title" :value="Number(cluster.id)" />
          </el-select>
          <div class="form-tip">继承项目的项目组级 BuildKit 构建集群；如需调整，请进入项目设置。</div>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model.trim="form.remark" type="textarea" :rows="3" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="推送 Registry" prop="registry_id">
          <el-select v-model="form.registry_id" filterable style="width: 420px" @change="syncRegistryToYaml">
            <el-option
              :label="options.default_registry ? `组织默认推送仓库（${options.default_registry.address || 'Docker Hub'}/${options.default_registry.namespace || '*'}）` : '组织默认推送仓库（未配置）'"
              value="0"
              :disabled="!options.default_registry" />
            <el-option
              v-for="registry in options.registries"
              :key="registry.id"
              :label="`${registry.address || 'Docker Hub'}/${registry.namespace || '*'}${registry.is_push ? '（默认）' : ''}`"
              :value="String(registry.id)" />
          </el-select>
          <div class="form-tip">选择后会同步更新下方 YAML 的 <code>output.registry_id</code>；API 使用 Registry HashID，数据库整数 ID 不会暴露。</div>
          <div v-if="!options.default_registry && !options.registries.length" class="form-error">当前项目没有可用的推送 Registry，请先在组织中配置 Registry，并在项目设置中建立关联。</div>
        </el-form-item>
        <el-form-item label="Pipeline YAML" prop="yml">
          <yaml-editor v-model="form.yml" class="pipeline-yaml" />
          <div class="form-tip">
            支持变量：<code>${COMMIT_SHA}</code>、<code>${BRANCH}</code>、<code>${BUILD_ID}</code>。
            registry_id 为 0 时使用组织默认镜像仓库；attestations 可控制 SBOM 与 provenance 随镜像一并推送。
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">保存流水线</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import YamlEditor from '@/components/YamlEditor'
import { dump as dumpYaml, load as loadYaml } from 'js-yaml'
import { pipelineCreate, pipelineOptions, pipelineProfile, pipelineUpdate } from '@/api/pipeline'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'PipelineBuildkitForm',
  components: { Breadcrumb, EasyTitle, YamlEditor },
  props: {
    project: { type: Object, default: null },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true },
    pipelineId: { type: Number, default: 0 }
  },
  data () {
    return {
      loading: false,
      submitting: false,
      options: { clusters: [], registries: [], default_registry: null, default_yml: '' },
      form: { title: '', remark: '', cluster_id: null, registry_id: '0', yml: '' },
      rules: {
        title: [{ required: true, message: '请输入流水线名称', trigger: 'blur' }],
        cluster_id: [{ required: true, message: '请选择构建集群', trigger: 'change' }],
        yml: [{ required: true, message: '请输入 Pipeline YAML', trigger: 'blur' }]
      }
    }
  },
  computed: {
    editing () {
      return this.pipelineId > 0
    },
    breadcrumb () {
      return [...routeBreadcrumb(this), { title: '构建', to: '' }, { title: this.editing ? '编辑流水线' : '创建流水线', to: '' }]
    }
  },
  created () {
    this.load()
  },
  methods: {
    load () {
      this.loading = true
      const requests = [pipelineOptions(this.orgId, this.groupId, this.projectId)]
      if (this.editing) requests.push(pipelineProfile(this.orgId, this.groupId, this.projectId, this.pipelineId))
      Promise.all(requests).then(([options, profile]) => {
        this.options = options.data || this.options
        if (profile) {
          const pipeline = profile.data.pipeline
          this.form = {
            title: pipeline.title,
            remark: pipeline.remark,
            cluster_id: Number(pipeline.cluster_id),
            registry_id: this.registryFromYaml(pipeline.yml),
            yml: pipeline.yml
          }
        } else {
          this.form.yml = this.options.default_yml
          this.form.registry_id = this.registryFromYaml(this.form.yml)
          if (this.form.registry_id === '0' && !this.options.default_registry && this.options.registries.length) {
            this.form.registry_id = String(this.options.registries[0].id)
            this.syncRegistryToYaml(this.form.registry_id)
          }
          this.form.cluster_id = Number(this.options.default_cluster_id) || null
        }
      }).finally(() => { this.loading = false })
    },
    submit () {
      this.$refs.form.validate(valid => {
        if (!valid) return
        this.submitting = true
        const request = this.editing
          ? pipelineUpdate(this.orgId, this.groupId, this.projectId, this.pipelineId, this.form)
          : pipelineCreate(this.orgId, this.groupId, this.projectId, this.form)
        request.then(res => {
          this.$message.success('流水线已保存')
          const id = this.editing ? this.pipelineId : Number(res.data.pipeline_id)
          this.$router.push({ name: 'ProjectPipelineProfile', params: { groupId: this.groupId, projectId: this.projectId, pipelineId: id } })
        }).finally(() => { this.submitting = false })
      })
    },
    registryFromYaml (yaml) {
      try {
        const definition = loadYaml(yaml) || {}
        return String((definition.output && definition.output.registry_id) || 0)
      } catch (e) {
        return '0'
      }
    },
    syncRegistryToYaml (registryId) {
      try {
        const definition = loadYaml(this.form.yml) || {}
        definition.output = definition.output || {}
        definition.output.registry_id = registryId === '0' ? 0 : registryId
        this.form.yml = dumpYaml(definition, { noRefs: true, lineWidth: -1, quotingType: "'" })
      } catch (e) {
        this.$message.warning('当前 Pipeline YAML 无法解析，请先修正 YAML 后再选择 Registry')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.pipeline-form { max-width: 980px; margin-top: 24px; }
.pipeline-yaml { min-height: 460px; line-height: 20px; }
.form-tip { margin-top: 6px; color: #909399; line-height: 20px; }
.form-error { margin-top: 6px; color: #f56c6c; line-height: 20px; }
</style>
