<template>
  <div class="project-container" v-loading="loading">
    <component
      :is="breadcrumbComponent"
      :breadcrumb="breadcrumb"
      v-bind="breadcrumbSubject" />
    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-connection card-header-icon"></i>
        <span>{{ pageTitle }}</span>
      </div>
      <el-form
        label-width="110px"
        size="small"
        class="create-form"
        :disabled="projectMode && !canOperate">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" :disabled="isEdit" placeholder="如 nginx-svc" />
        </el-form-item>
        <el-form-item label="命名空间" required>
          <el-input
            v-if="isDeploymentPreset"
            :value="form.namespace"
            disabled
            class="target-select" />
          <namespace-selector
            v-else
            v-model="namespaceSelection"
            :namespaces="namespaces"
            :allow-aggregate="false"
            :disabled="isEdit"
            @change="onNamespaceChange" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-radio-group v-model="form.type" @change="onServiceTypeChange">
            <el-radio label="ClusterIP">ClusterIP</el-radio>
            <el-radio label="NodePort">NodePort</el-radio>
            <el-radio label="LoadBalancer">LoadBalancer</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="标签">
          <key-value-editor v-model="form.labels" />
        </el-form-item>
        <el-form-item label="目标工作负载" required>
          <div v-if="isDeploymentPreset" class="target-picker">
            <el-input
              :value="presetDeploymentName"
              disabled
              class="target-select">
              <template slot="prepend">Deployment</template>
            </el-input>
          </div>
          <div v-else-if="targetKind === 'Deployment'" class="target-picker">
            <el-select
              v-model="targetName"
              filterable
              class="target-select"
              :loading="targetsLoading"
              placeholder="选择 Deployment"
              @change="onTargetChange">
              <el-option
                v-for="item in deployments"
                :key="item.name"
                :label="targetOptionLabel(item)"
                :value="item.name" />
            </el-select>
          </div>
          <div v-else class="target-picker">
            <el-select
              v-model="targetName"
              filterable
              class="target-select"
              :loading="targetsLoading"
              placeholder="选择独立 Pod"
              @change="onTargetChange">
              <el-option
                v-for="item in independentPods"
                :key="item.name"
                :label="targetOptionLabel(item)"
                :value="item.name" />
            </el-select>
          </div>
          <div v-if="selectedTarget" class="target-summary">
            <i class="el-icon-connection"></i>
            <template v-if="targetKind === 'Deployment'">
              Service 将使用 Deployment <strong>{{ selectedTarget.name }}</strong> 的标签匹配 Pod
              · {{ selectedTarget.ready_replicas }}/{{ selectedTarget.replicas }} 就绪
            </template>
            <template v-else>
              Service 将使用 Pod <strong>{{ selectedTarget.name }}</strong> 的唯一标签匹配该 Pod
            </template>
          </div>
          <el-alert
            v-else-if="legacySelector"
            title="当前 Service 使用已有标签规则，无法唯一识别目标。现有规则会继续保留。"
            type="warning"
            :closable="false"
            show-icon />
          <div v-else-if="targetKind === 'Deployment'" class="target-help">
            选择 Deployment 后，Galaxy 会提取其 Pod 标签生成 Service 选择器，后续新建的 Pod 也会自动加入。
          </div>
          <el-collapse v-if="!isDeploymentPreset" v-model="advancedPanels" class="advanced-options">
            <el-collapse-item name="standalone-pod">
              <template slot="title">
                <span class="advanced-title"><i class="el-icon-setting"></i> 高级选项</span>
              </template>
              <div class="standalone-option">
                <el-switch
                  :value="targetKind === 'Pod'"
                  active-text="直接匹配独立 Pod"
                  @change="onStandalonePodChange" />
                <div class="target-help">
                  仅适用于不受 Deployment、StatefulSet 等控制器管理的 Pod。受管 Pod 会被重建，请选择其所属工作负载。
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-form-item>
        <el-form-item label="端口" required>
          <div v-for="(p, pi) in form.ports" :key="pi" class="port-row">
            <el-input v-model="p.name" size="small" placeholder="如 http" class="port-name">
              <template slot="prepend">名称</template>
            </el-input>
            <el-select v-model="p.protocol" size="small" class="port-protocol" placeholder="协议">
              <el-option label="TCP" value="TCP" />
              <el-option label="UDP" value="UDP" />
              <el-option label="SCTP" value="SCTP" />
            </el-select>
            <el-input
              v-model.number="p.port"
              size="small"
              type="number"
              min="1"
              max="65535"
              class="port-field"
              placeholder="如 80">
              <template slot="prepend">服务端口</template>
            </el-input>
            <el-input
              v-model.number="p.targetPort"
              size="small"
              type="number"
              min="1"
              max="65535"
              class="port-field"
              placeholder="如 80">
              <template slot="prepend">内部端口</template>
            </el-input>
            <el-input
              v-if="form.type === 'NodePort'"
              v-model.number="p.nodePort"
              size="small"
              type="number"
              min="1"
              max="65535"
              class="port-field"
              placeholder="留空则自动分配">
              <template slot="prepend">节点端口</template>
            </el-input>
            <el-button
              v-if="form.ports.length > 1"
              type="text"
              size="small"
              class="text-danger"
              icon="el-icon-delete"
              @click="removePort(pi)" />
          </div>
          <el-button type="text" size="small" icon="el-icon-plus" @click="addPort">添加端口</el-button>
        </el-form-item>
        <el-form-item>
          <el-button
            v-if="!projectMode || canOperate"
            type="primary"
            :loading="saving"
            icon="el-icon-check"
            @click="save">
            保存
          </el-button>
          <el-button icon="el-icon-close" @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import ClusterBreadcrumb from '@/views/components/Breadcrumb'
import ProjectBreadcrumb from '@/views/project/components/Breadcrumb'
import KeyValueEditor from './components/KeyValueEditor'
import NamespaceSelector from './components/NamespaceSelector'
import {
  kubernetesClusterNamespaces,
  kubernetesClusterDeployments,
  kubernetesClusterPods,
  kubernetesClusterServiceDetail,
  kubernetesClusterServiceCreate,
  kubernetesClusterServiceUpdate
} from '@/api/kubernetes'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'K8sServiceCreate',
  components: {
    ClusterBreadcrumb,
    ProjectBreadcrumb,
    KeyValueEditor,
    NamespaceSelector
  },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) },
    project: { type: Object, default: null },
    groupId: { type: [Number, String], default: null },
    projectId: { type: [Number, String], default: null },
    mode: {
      type: String,
      default: 'cluster',
      validator: value => ['cluster', 'project'].includes(value)
    },
    canOperate: { type: Boolean, default: true }
  },
  data () {
    return {
      loading: false,
      saving: false,
      namespaces: [],
      deployments: [],
      pods: [],
      targetsLoading: false,
      targetKind: 'Deployment',
      targetName: '',
      advancedPanels: [],
      legacySelector: false,
      form: { name: '', namespace: '', type: 'ClusterIP', labels: [], selector: [], ports: [] }
    }
  },
  computed: {
    sourceName () { return this.$route.query.name || '' },
    sourceNamespace () { return this.$route.query.namespace || '' },
    presetDeploymentName () { return this.$route.query.deployment || '' },
    isEdit () { return !!this.sourceName },
    isDeploymentPreset () { return !this.isEdit && !!this.sourceNamespace && !!this.presetDeploymentName },
    pageTitle () { return this.isEdit ? '编辑 Service' : '新增 Service' },
    projectMode () { return this.mode === 'project' },
    runtimeId () { return Number(this.$route.params.runtimeId || 0) },
    breadcrumbComponent () {
      return this.projectMode ? 'ProjectBreadcrumb' : 'ClusterBreadcrumb'
    },
    breadcrumbSubject () {
      return this.projectMode
        ? { project: this.project || {} }
        : { cluster: this.cluster || {} }
    },
    namespaceSelection: {
      get () {
        return this.form.namespace ? `ns:${this.form.namespace}` : ''
      },
      set (value) {
        this.form.namespace = value && value.indexOf('ns:') === 0 ? value.slice(3) : ''
      }
    },
    targetOptions () {
      return this.targetKind === 'Deployment' ? this.deployments : this.independentPods
    },
    independentPods () {
      return this.pods.filter(item => !item.owner_kind)
    },
    selectedTarget () {
      return this.targetOptions.find(item => item.name === this.targetName) || null
    },
    breadcrumb () {
      if (this.projectMode) {
        return [
          ...routeBreadcrumb(this),
          {
            title: '运行实例',
            to: {
              name: 'ProjectInstance',
              params: { groupId: this.groupId, projectId: this.projectId }
            }
          },
          {
            title: this.presetDeploymentName,
            to: this.deploymentDetailLocation('services')
          },
          { title: this.pageTitle, to: '' }
        ]
      }
      if (this.isDeploymentPreset) {
        return [
          ...routeBreadcrumb(this),
          {
            title: this.presetDeploymentName,
            to: {
              name: 'ClusterK8sDeploymentDetail',
              params: { clusterId: this.clusterId },
              query: { namespace: this.sourceNamespace, name: this.presetDeploymentName, tab: 'services' }
            }
          },
          { title: this.pageTitle, to: '' }
        ]
      }
      return [
        ...routeBreadcrumb(this),
        { title: 'Services', to: { name: 'ClusterK8sServices', params: { clusterId: this.clusterId } } },
        { title: this.pageTitle, to: '' }
      ]
    }
  },
  created () {
    if (!this.isEdit) this.addPort()
    kubernetesClusterNamespaces(this.orgId, this.clusterId).then(res => {
      this.namespaces = res.data.namespaces || []
      if (this.isEdit) {
        this.loadSource()
      } else if (this.namespaces.length) {
        this.form.namespace = this.sourceNamespace || this.namespaces[0].name
        this.loadTargets()
      }
    }).catch(err => {
      this.$message.error(err.response?.data?.msg || err.message || '加载 Namespace 失败')
    })
  },
  methods: {
    addPort () {
      this.form.ports.push({ name: '', protocol: 'TCP', port: 80, targetPort: 80, nodePort: null })
    },
    removePort (pi) {
      this.form.ports.splice(pi, 1)
    },
    onServiceTypeChange (type) {
      if (type !== 'NodePort') {
        this.form.ports.forEach(port => { port.nodePort = null })
      }
    },
    loadSource () {
      this.loading = true
      kubernetesClusterServiceDetail(this.orgId, this.clusterId, this.sourceNamespace, this.sourceName).then(res => {
        const svc = res.data.service || {}
        const metadata = svc.metadata || {}
        const spec = svc.spec || {}
        const toPairs = (obj) => Object.keys(obj || {}).map(k => ({ key: k, value: obj[k] }))
        this.form.name = metadata.name || ''
        this.form.namespace = metadata.namespace || this.sourceNamespace
        this.form.type = spec.type || 'ClusterIP'
        this.form.labels = toPairs(metadata.labels)
        this.form.selector = toPairs(spec.selector)
        this.form.ports = (spec.ports || []).map(p => ({
          name: p.name || '',
          protocol: p.protocol || 'TCP',
          port: p.port || 80,
          targetPort: (typeof p.targetPort === 'number') ? p.targetPort : (parseInt(p.targetPort, 10) || 80),
          nodePort: p.nodePort || null
        }))
        if (!this.form.ports.length) this.addPort()
        return this.loadTargets()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载源 Service 失败')
      }).finally(() => { this.loading = false })
    },
    loadTargets () {
      if (!this.form.namespace) return Promise.resolve()
      this.targetsLoading = true
      return Promise.all([
        kubernetesClusterDeployments(this.orgId, this.clusterId, this.form.namespace),
        this.isDeploymentPreset
          ? Promise.resolve({ data: { pods: [] } })
          : kubernetesClusterPods(this.orgId, this.clusterId, this.form.namespace)
      ]).then(([deployments, pods]) => {
        this.deployments = deployments.data.deployments || []
        this.pods = pods.data.pods || []
        if (this.isDeploymentPreset) {
          const deployment = this.deployments.find(item => item.name === this.presetDeploymentName)
          if (!deployment) {
            this.targetName = ''
            this.$message.error(`Deployment ${this.presetDeploymentName} 不存在或已被删除`)
            return
          }
          this.targetKind = 'Deployment'
          this.targetName = deployment.name
          this.onTargetChange()
        } else if (this.isEdit) {
          this.inferExistingTarget()
        }
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载可匹配工作负载失败')
      }).finally(() => { this.targetsLoading = false })
    },
    inferExistingTarget () {
      const selector = this.pairsToObject(this.form.selector)
      if (!Object.keys(selector).length) return
      const deployment = this.deployments.find(item => this.sameSelector(item.selector || {}, selector))
      if (deployment) {
        this.targetKind = 'Deployment'
        this.targetName = deployment.name
        this.legacySelector = false
        return
      }
      const pod = this.pods.find(item => !item.owner_kind && this.selectorMatches(selector, item.labels || {}))
      if (pod) {
        this.targetKind = 'Pod'
        this.targetName = pod.name
        this.advancedPanels = ['standalone-pod']
        this.legacySelector = false
        return
      }
      this.targetName = ''
      this.legacySelector = true
    },
    onNamespaceChange () {
      this.targetName = ''
      this.legacySelector = false
      this.loadTargets()
    },
    onStandalonePodChange (enabled) {
      this.targetKind = enabled ? 'Pod' : 'Deployment'
      this.targetName = ''
      this.form.selector = []
      this.legacySelector = false
    },
    onTargetChange () {
      this.legacySelector = false
      if (this.targetKind === 'Deployment' && this.selectedTarget) {
        this.form.selector = this.objectToPairs(this.selectedTarget.selector || {})
      } else {
        this.form.selector = []
      }
    },
    targetOptionLabel (item) {
      if (this.targetKind === 'Deployment') {
        return `${item.name} · ${item.ready_replicas}/${item.replicas} 就绪`
      }
      return `${item.name} · ${item.phase || 'Unknown'}`
    },
    objectToPairs (values) {
      return Object.keys(values || {}).map(key => ({ key, value: values[key] }))
    },
    pairsToObject (rows) {
      return (rows || []).reduce((values, row) => {
        if (row.key) values[row.key] = row.value || ''
        return values
      }, {})
    },
    sameSelector (left, right) {
      const leftKeys = Object.keys(left).sort()
      const rightKeys = Object.keys(right).sort()
      return leftKeys.length === rightKeys.length &&
        leftKeys.every((key, index) => key === rightKeys[index] && String(left[key]) === String(right[key]))
    },
    selectorMatches (selector, labels) {
      return Object.keys(selector).every(key => String(labels[key]) === String(selector[key]))
    },
    save () {
      if (!this.form.name.trim()) return this.$message.warning('请输入名称')
      if (!this.form.namespace) return this.$message.warning('请选择命名空间')
      if (!this.targetName && !this.legacySelector) return this.$message.warning('请选择 Service 匹配的工作负载')
      if (!this.form.ports.length) return this.$message.warning('请至少添加一个端口')
      for (const p of this.form.ports) {
        if (!p.port) return this.$message.warning('端口不能为空')
        if (!p.targetPort) return this.$message.warning('目标端口不能为空')
      }
      const form = {
        namespace: this.form.namespace,
        name: this.form.name.trim(),
        type: this.form.type,
        labels: this.form.labels,
        selector: this.form.selector,
        ports: this.form.ports
      }
      if (this.targetName) {
        form.target_kind = this.targetKind
        form.target_name = this.targetName
      }
      this.saving = true
      const request = this.isEdit
        ? kubernetesClusterServiceUpdate(this.orgId, this.clusterId, form)
        : kubernetesClusterServiceCreate(this.orgId, this.clusterId, form)
      request.then(() => {
        this.$message.success(this.isEdit ? 'Service 已更新' : 'Service 已创建')
        this.goBack()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '保存失败')
      }).finally(() => { this.saving = false })
    },
    goBack () {
      if (this.isDeploymentPreset) {
        this.$router.push(this.deploymentDetailLocation('services'))
        return
      }
      this.$router.push({ name: 'ClusterK8sServices', params: { clusterId: this.clusterId } })
    },
    deploymentDetailLocation (tab = 'overview') {
      return this.projectMode
        ? {
            name: 'ProjectKubernetesDeploymentDetail',
            params: {
              groupId: this.groupId,
              projectId: this.projectId,
              runtimeId: this.runtimeId
            },
            query: {
              cluster_id: this.clusterId,
              namespace: this.sourceNamespace,
              name: this.presetDeploymentName,
              tab
            }
          }
        : {
            name: 'ClusterK8sDeploymentDetail',
            params: { clusterId: this.clusterId },
            query: {
              namespace: this.sourceNamespace,
              name: this.presetDeploymentName,
              tab
            }
          }
    }
  }
}
</script>

<style lang="scss" scoped>
.content-card { border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.card-header { display: flex; align-items: center; font-size: 15px; font-weight: 600; color: #303133; }
.card-header-icon { margin-right: 8px; color: #409eff; font-size: 16px; }
.create-form { max-width: 880px; }
.target-picker { display: flex; align-items: center; gap: 10px; }
.target-select { width: 420px; max-width: 100%; }
.target-summary {
  margin-top: 8px;
  padding: 9px 12px;
  border-radius: 4px;
  color: #606266;
  background: #f4f8ff;
  line-height: 20px;
}
.target-summary i { margin-right: 5px; color: #409eff; }
.target-help { margin-top: 7px; color: #909399; font-size: 12px; line-height: 18px; }
.advanced-options {
  width: 420px;
  max-width: 100%;
  margin-top: 10px;
  border-bottom: 0;
}
.advanced-options ::v-deep .el-collapse-item__header {
  height: 36px;
  border-bottom: 0;
  color: #606266;
  font-size: 13px;
}
.advanced-options ::v-deep .el-collapse-item__wrap { border-bottom: 0; }
.advanced-options ::v-deep .el-collapse-item__content { padding-bottom: 4px; }
.advanced-title i { margin-right: 5px; }
.standalone-option {
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fafafa;
}
.port-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; align-items: center; }
.port-name { width: 190px; }
.port-protocol { width: 100px; }
.port-field { width: 210px; }
.text-danger { color: #f56c6c; }
</style>
