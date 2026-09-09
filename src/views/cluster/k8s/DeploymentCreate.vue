<template>
  <div class="project-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-boxes card-header-icon"></i>
        <span>{{ pageTitle }}</span>
      </div>
      <el-form label-width="110px" size="small" class="create-form">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" :disabled="isEdit" placeholder="如 nginx" />
        </el-form-item>
        <el-form-item label="命名空间" required>
          <el-select v-model="form.namespace" :disabled="isEdit" filterable placeholder="选择命名空间">
            <el-option v-for="item in namespaces" :key="item.name" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="副本数" required>
          <el-input-number v-model="form.replicas" :min="0" :max="100" controls-position="right" />
        </el-form-item>
        <el-form-item label="标签选择器" required>
          <key-value-editor v-model="form.selector" />
          <div class="form-tip">该选择器同时作为 Deployment 的 matchLabels 与 Pod 模板的 labels</div>
        </el-form-item>
        <el-form-item label="容器" required>
          <div v-for="(c, ci) in form.containers" :key="ci" class="container-card">
            <div class="container-head">
              <span class="container-index">容器 {{ ci + 1 }}</span>
              <el-button
                v-if="form.containers.length > 1"
                type="text"
                size="small"
                class="text-danger"
                icon="el-icon-delete"
                @click="removeContainer(ci)">
                删除容器
              </el-button>
            </div>
            <el-form-item label="名称" label-width="70px" required>
              <el-input v-model="c.name" placeholder="container name" />
            </el-form-item>
            <el-form-item label="镜像" label-width="70px" required>
              <el-input v-model="c.image" placeholder="如 nginx:1.25" />
            </el-form-item>
            <el-form-item label="端口" label-width="70px">
              <div v-for="(p, pi) in c.ports" :key="pi" class="port-row">
                <el-input v-model="p.name" size="small" placeholder="name" class="port-name" />
                <el-select v-model="p.protocol" size="small" class="port-protocol" placeholder="协议">
                  <el-option label="TCP" value="TCP" />
                  <el-option label="UDP" value="UDP" />
                  <el-option label="SCTP" value="SCTP" />
                </el-select>
                <el-input-number
                  v-model="p.containerPort"
                  :min="1"
                  :max="65535"
                  size="small"
                  controls-position="right"
                  class="port-number" />
                <el-button
                  v-if="c.ports.length > 1"
                  type="text"
                  size="small"
                  class="text-danger"
                  icon="el-icon-delete"
                  @click="removePort(ci, pi)" />
              </div>
              <el-button type="text" size="small" icon="el-icon-plus" @click="addPort(ci)">添加端口</el-button>
            </el-form-item>
            <el-form-item label="资源" label-width="70px">
              <resource-config-editor
                :value="k8sResourceValue(c.resources)"
                @input="setK8sResources(c, $event)" />
            </el-form-item>
            <el-form-item label="环境变量" label-width="70px">
              <key-value-editor v-model="c.env" />
            </el-form-item>
          </div>
          <el-button type="dashed" size="small" icon="el-icon-plus" @click="addContainer">添加容器</el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" icon="el-icon-check" @click="save">保存</el-button>
          <el-button icon="el-icon-close" @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import KeyValueEditor from './components/KeyValueEditor'
import ResourceConfigEditor from '@/views/components/ResourceConfigEditor'
import { kubernetesClusterNamespaces, kubernetesClusterDeploymentDetail, kubernetesClusterDeploymentCreate, kubernetesClusterDeploymentUpdate } from '@/api/kubernetes'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'K8sDeploymentCreate',
  components: { Breadcrumb, KeyValueEditor, ResourceConfigEditor },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  },
  data () {
    return {
      loading: false,
      saving: false,
      namespaces: [],
      form: { name: '', namespace: '', replicas: 1, selector: [], containers: [] }
    }
  },
  computed: {
    sourceName () { return this.$route.query.name || '' },
    sourceNamespace () { return this.$route.query.namespace || '' },
    isEdit () { return !!this.sourceName },
    pageTitle () { return this.isEdit ? '编辑 Deployment' : '新增 Deployment' },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: 'Deployments', to: { name: 'ClusterK8sDeployments', params: { clusterId: this.clusterId } } },
        { title: this.pageTitle, to: '' }
      ]
    }
  },
  created () {
    kubernetesClusterNamespaces(this.orgId, this.clusterId).then(res => {
      this.namespaces = res.data.namespaces || []
      if (!this.form.namespace && this.namespaces.length) {
        this.form.namespace = this.sourceNamespace || this.namespaces[0].name
      }
    })
    if (this.isEdit) {
      this.loadSource()
    } else {
      this.addContainer()
    }
  },
  methods: {
    emptyContainer () {
      return { name: '', image: '', ports: [], resources: { cpu_request: '', memory_request: '', cpu_limit: '', memory_limit: '' }, env: [] }
    },
    addContainer () {
      this.form.containers.push(this.emptyContainer())
    },
    removeContainer (ci) {
      this.form.containers.splice(ci, 1)
    },
    addPort (ci) {
      this.form.containers[ci].ports.push({ name: '', protocol: 'TCP', containerPort: 80 })
    },
    removePort (ci, pi) {
      this.form.containers[ci].ports.splice(pi, 1)
    },
    parseCpuCores (value) {
      const text = String(value || '').trim()
      if (!text) return 0
      return text.endsWith('m') ? Number(text.slice(0, -1)) / 1000 : Number(text)
    },
    parseMemoryMiB (value) {
      const text = String(value || '').trim()
      if (!text) return 0
      if (text.endsWith('Gi')) return Number(text.slice(0, -2)) * 1024
      if (text.endsWith('Ki')) return Number(text.slice(0, -2)) / 1024
      return Number(text.replace(/Mi$/, ''))
    },
    k8sResourceValue (resources) {
      return {
        cpu_limit: this.parseCpuCores(resources.cpu_limit),
        memory_limit: this.parseMemoryMiB(resources.memory_limit),
        cpu_reservation: this.parseCpuCores(resources.cpu_request),
        memory_reservation: this.parseMemoryMiB(resources.memory_request)
      }
    },
    setK8sResources (container, resources) {
      const payload = this.k8sResourcePayload(resources)
      this.$set(container, 'resources', {
        cpu_request: payload.cpu_request ? `${payload.cpu_request}m` : '',
        memory_request: payload.memory_request ? `${payload.memory_request}Mi` : '',
        cpu_limit: payload.cpu_limit ? `${payload.cpu_limit}m` : '',
        memory_limit: payload.memory_limit ? `${payload.memory_limit}Mi` : ''
      })
    },
    k8sResourcePayload (resources) {
      const cpuReservation = Math.round(Number(resources.cpu_reservation || 0) * 1000)
      const memoryReservation = Math.round(Number(resources.memory_reservation || 0))
      const cpuLimit = Math.round(Number(resources.cpu_limit || 0) * 1000)
      const memoryLimit = Math.round(Number(resources.memory_limit || 0))
      return {
        cpu_request: cpuReservation || '',
        memory_request: memoryReservation || '',
        cpu_limit: cpuLimit || '',
        memory_limit: memoryLimit || ''
      }
    },
    loadSource () {
      this.loading = true
      kubernetesClusterDeploymentDetail(this.orgId, this.clusterId, this.sourceNamespace, this.sourceName).then(res => {
        const dep = res.data.deployment || {}
        const metadata = dep.metadata || {}
        const spec = dep.spec || {}
        const template = (spec.template && spec.template) || {}
        const podSpec = (template.spec && template.spec) || {}
        const toPairs = (obj) => Object.keys(obj || {}).map(k => ({ key: k, value: obj[k] }))
        this.form.name = metadata.name || ''
        this.form.namespace = metadata.namespace || this.sourceNamespace
        this.form.replicas = spec.replicas || 1
        this.form.selector = toPairs(spec.selector && spec.selector.matchLabels)
        this.form.containers = (podSpec.containers || []).map(c => {
          const resources = c.resources || {}
          const req = resources.requests || {}
          const lim = resources.limits || {}
          return {
            name: c.name || '',
            image: c.image || '',
            ports: (c.ports || []).map(p => ({ name: p.name || '', protocol: p.protocol || 'TCP', containerPort: p.containerPort || 80 })),
            resources: {
              cpu_request: req.cpu || '',
              memory_request: req.memory || '',
              cpu_limit: lim.cpu || '',
              memory_limit: lim.memory || ''
            },
            env: (c.env || []).map(e => ({ key: e.name || '', value: e.value || '' }))
          }
        })
        if (!this.form.containers.length) this.addContainer()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载源 Deployment 失败')
      }).finally(() => { this.loading = false })
    },
    save () {
      if (!this.form.name.trim()) return this.$message.warning('请输入名称')
      if (!this.form.namespace) return this.$message.warning('请选择命名空间')
      if (!this.form.containers.length) return this.$message.warning('请至少添加一个容器')
      for (const c of this.form.containers) {
        if (!c.name.trim()) return this.$message.warning('容器名称不能为空')
        if (!c.image.trim()) return this.$message.warning('容器镜像不能为空')
        for (const p of c.ports) {
          if (!p.containerPort) return this.$message.warning('容器端口不能为空')
        }
      }
      const form = {
        namespace: this.form.namespace,
        name: this.form.name.trim(),
        replicas: this.form.replicas,
        selector: this.form.selector,
        containers: this.form.containers.map(container => Object.assign({}, container, {
          resources: this.k8sResourcePayload(this.k8sResourceValue(container.resources))
        }))
      }
      this.saving = true
      const request = this.isEdit
        ? kubernetesClusterDeploymentUpdate(this.orgId, this.clusterId, form)
        : kubernetesClusterDeploymentCreate(this.orgId, this.clusterId, form)
      request.then(() => {
        this.$message.success(this.isEdit ? 'Deployment 已更新' : 'Deployment 已创建')
        this.goBack()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '保存失败')
      }).finally(() => { this.saving = false })
    },
    goBack () {
      this.$router.push({ name: 'ClusterK8sDeployments', params: { clusterId: this.clusterId } })
    }
  }
}
</script>

<style lang="scss" scoped>
.content-card { border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.card-header { display: flex; align-items: center; font-size: 15px; font-weight: 600; color: #303133; }
.card-header-icon { margin-right: 8px; color: #409eff; font-size: 16px; }
.create-form { max-width: 920px; }
.form-tip { color: #909399; font-size: 12px; margin-top: 4px; }
.container-card { border: 1px solid #ebeef5; border-radius: 6px; padding: 12px; margin-bottom: 12px; background: #fafbfc; }
.container-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.container-index { font-weight: 600; color: #303133; }
.port-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
.port-name { width: 140px; }
.port-protocol { width: 100px; }
.port-number { width: 150px; }
.text-danger { color: #f56c6c; }
</style>
