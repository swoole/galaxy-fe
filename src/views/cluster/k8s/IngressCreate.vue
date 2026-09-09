<template>
  <div class="project-container" v-loading="loading">
    <component
      :is="breadcrumbComponent"
      :breadcrumb="breadcrumb"
      v-bind="breadcrumbSubject" />
    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-share card-header-icon"></i>
        <span>{{ pageTitle }}</span>
      </div>
      <el-form
        label-width="100px"
        size="small"
        class="create-form"
        :disabled="projectMode && !canOperate">
        <el-form-item v-if="!projectMode" label="名称" required>
          <el-input v-model="form.name" :disabled="isEdit" placeholder="如 web-ingress" />
        </el-form-item>
        <el-form-item v-if="!projectMode" label="命名空间" required>
          <el-select v-model="form.namespace" :disabled="isEdit" filterable placeholder="选择命名空间">
            <el-option v-for="item in namespaces" :key="item.name" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!projectMode" label="标签">
          <key-value-editor v-model="form.labels" />
        </el-form-item>
        <el-form-item label="HTTPS">
          <el-switch
            v-model="form.tls_enabled"
            active-text="启用 HTTPS"
            @change="onTlsChange" />
          <div class="form-tip">
            Galaxy 会将证书安全同步为当前 Namespace 的 Kubernetes TLS Secret，证书私钥不会发送到浏览器。
          </div>
        </el-form-item>
        <el-form-item v-if="form.tls_enabled" label="SSL 证书" required>
          <el-select
            v-model="form.certificate_id"
            filterable
            class="certificate-select"
            :loading="certificatesLoading"
            placeholder="选择 Galaxy SSL 证书">
            <el-option
              v-for="certificate in certificates"
              :key="certificate.id"
              :label="certificateLabel(certificate)"
              :value="certificate.id"
              :disabled="!certificateAvailable(certificate)" />
          </el-select>
          <div v-if="certificates.length" class="form-tip">
            仅可选择状态正常、包含完整密钥对且覆盖全部 Host 的证书。
          </div>
          <el-alert
            v-else-if="!certificatesLoading"
            title="暂无可用的 Galaxy SSL 证书，请先在“资源 → SSL 证书”中导入或签发证书。"
            type="warning"
            :closable="false"
            show-icon />
          <el-alert
            v-if="unmanagedTls"
            title="当前 Ingress 引用了非 Galaxy 管理的 TLS Secret。请选择 Galaxy SSL 证书接管，或关闭 HTTPS。"
            type="warning"
            :closable="false"
            show-icon />
        </el-form-item>
        <el-form-item v-if="form.tls_enabled" label="HTTP 访问">
          <el-radio-group v-model="form.https_redirect">
            <el-radio-button :label="false">HTTP / HTTPS 均可访问</el-radio-button>
            <el-radio-button :label="true">强制跳转 HTTPS</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.tls_enabled && form.https_redirect" label="HTTPS 外部端口">
          <el-input-number
            v-model="form.https_redirect_port"
            :min="1"
            :max="65535"
            disabled
            controls-position="right" />
          <div class="form-tip">继承 Kubernetes 集群入口设置，不能在单条 Ingress 中修改。</div>
        </el-form-item>
        <el-form-item label="规则" required>
          <div v-for="(rule, ri) in form.rules" :key="ri" class="rule-card">
            <div class="rule-head">
              <span class="rule-index">规则 {{ ri + 1 }}</span>
              <el-button
                v-if="!projectMode && form.rules.length > 1"
                type="text"
                size="small"
                class="text-danger"
                icon="el-icon-delete"
                @click="removeRule(ri)">删除规则</el-button>
            </div>
            <template v-if="projectMode">
              <el-select
                v-model="selectedDomainId"
                filterable
                class="rule-host"
                placeholder="选择管理员分配的域名"
                @change="selectManagedDomain(rule)">
                <el-option
                  v-for="domain in domainOptions"
                  :key="domain.id"
                  :label="domain.allow_subdomains ? `*.${domain.hostname}（允许子域名）` : domain.hostname"
                  :value="domain.id" />
              </el-select>
              <el-input
                v-if="selectedManagedDomain && selectedManagedDomain.allow_subdomains"
                v-model.trim="subdomainPrefix"
                clearable
                class="rule-host"
                placeholder="子域名前缀，留空使用根域名"
                @input="updateManagedHostname(rule)">
                <template slot="append">.{{ selectedManagedDomain.hostname }}</template>
              </el-input>
            </template>
            <el-input
              v-else
              v-model="rule.host"
              size="small"
              class="rule-host"
              placeholder="Host（留空表示默认）" />
            <div v-for="(path, pi) in rule.paths" :key="pi" class="path-row">
              <el-input v-model="path.path" size="small" placeholder="路径 /" class="path-path" />
              <el-select v-model="path.pathType" size="small" class="path-type" placeholder="PathType">
                <el-option label="Prefix" value="Prefix" />
                <el-option label="Exact" value="Exact" />
                <el-option v-if="!projectMode" label="ImplementationSpecific" value="ImplementationSpecific" />
              </el-select>
              <el-input
                v-if="!projectMode"
                v-model="path.serviceName"
                size="small"
                placeholder="服务名"
                class="path-svc" />
              <el-input-number
                v-model="path.servicePort"
                :min="1"
                :max="65535"
                size="small"
                controls-position="right"
                class="path-port" />
              <el-button
                v-if="!projectMode && rule.paths.length > 1"
                type="text"
                size="small"
                class="text-danger"
                icon="el-icon-delete"
                @click="removePath(ri, pi)" />
            </div>
            <el-button
              v-if="!projectMode"
              type="text"
              size="small"
              icon="el-icon-plus"
              @click="addPath(ri)">
              添加路径
            </el-button>
          </div>
          <el-button
            v-if="!projectMode"
            type="dashed"
            size="small"
            icon="el-icon-plus"
            @click="addRule">
            添加规则
          </el-button>
        </el-form-item>
        <template v-if="projectMode">
          <el-form-item label="路由优先级">
            <el-input-number v-model="form.priority" :min="0" :max="100000" />
          </el-form-item>
          <el-form-item label="启用路由">
            <el-switch v-model="form.enabled" />
          </el-form-item>
        </template>
        <el-form-item>
          <el-button
            v-if="!projectMode || canOperate"
            type="primary"
            :disabled="projectMode && !domainOptions.length"
            :loading="saving"
            icon="el-icon-check"
            @click="save">
            保存
          </el-button>
          <el-button icon="el-icon-close" @click="goBack">取消</el-button>
          <el-button
            v-if="isProjectEdit && canOperate"
            type="danger"
            plain
            :loading="deleting"
            icon="el-icon-delete"
            @click="removeProjectRoute">
            删除路由
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import ClusterBreadcrumb from '@/views/components/Breadcrumb'
import ProjectBreadcrumb from '@/views/project/components/Breadcrumb'
import KeyValueEditor from './components/KeyValueEditor'
import {
  kubernetesClusterNamespaces,
  kubernetesClusterProfile,
  kubernetesClusterIngressDetail,
  kubernetesClusterIngressCreate,
  kubernetesClusterIngressUpdate
} from '@/api/kubernetes'
import { certificateOptions } from '@/api/certificate'
import { domainOptions as loadDomainOptions } from '@/api/domain'
import {
  projectRouteCreate,
  projectRouteDelete,
  projectRouteProfile,
  projectRouteUpdate
} from '@/api/project'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'K8sIngressCreate',
  components: { ClusterBreadcrumb, ProjectBreadcrumb, KeyValueEditor },
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
      deleting: false,
      certificatesLoading: false,
      namespaces: [],
      certificates: [],
      domainOptions: [],
      selectedDomainId: null,
      subdomainPrefix: '',
      unmanagedTls: false,
      form: {
        name: '',
        namespace: '',
        labels: [],
        tls_enabled: false,
        certificate_id: null,
        https_redirect: false,
        https_redirect_port: 443,
        priority: 1,
        enabled: true,
        rules: []
      }
    }
  },
  computed: {
    sourceName () { return this.$route.query.name || '' },
    sourceNamespace () { return this.$route.query.namespace || '' },
    routeId () { return Number(this.$route.params.routeId || 0) },
    isProjectEdit () { return this.projectMode && this.routeId > 0 },
    isEdit () { return this.projectMode ? this.isProjectEdit : !!this.sourceName },
    pageTitle () { return this.isEdit ? '编辑 Ingress' : '新增 Ingress' },
    projectMode () { return this.mode === 'project' },
    runtimeId () {
      return Number(this.$route.params.runtimeId || this.$route.query.runtime_id || 0)
    },
    presetDeploymentName () { return this.$route.query.deployment || '' },
    presetServiceName () { return this.$route.query.service || '' },
    presetServicePort () { return Number(this.$route.query.service_port || 80) },
    selectedManagedDomain () {
      return this.domainOptions.find(
        domain => Number(domain.id) === Number(this.selectedDomainId)
      ) || null
    },
    breadcrumbComponent () {
      return this.projectMode ? 'ProjectBreadcrumb' : 'ClusterBreadcrumb'
    },
    breadcrumbSubject () {
      return this.projectMode
        ? { project: this.project || {} }
        : { cluster: this.cluster || {} }
    },
    breadcrumb () {
      if (this.projectMode) {
        if (!this.presetDeploymentName) {
          return [
            ...routeBreadcrumb(this),
            {
              title: '域名路由',
              to: {
                name: 'ProjectRoutes',
                params: { groupId: this.groupId, projectId: this.projectId }
              }
            },
            { title: this.pageTitle, to: '' }
          ]
        }
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
            to: this.deploymentDetailLocation('ingresses')
          },
          { title: this.pageTitle, to: '' }
        ]
      }
      return [
        ...routeBreadcrumb(this),
        { title: 'Ingresses', to: { name: 'ClusterK8sIngresses', params: { clusterId: this.clusterId } } },
        { title: this.pageTitle, to: '' }
      ]
    }
  },
  created () {
    this.loadCertificates()
    this.loadIngressSettings()
    if (this.projectMode) this.loadDomainOptions()
    if (!this.projectMode) {
      kubernetesClusterNamespaces(this.orgId, this.clusterId).then(res => {
        this.namespaces = res.data.namespaces || []
        if (!this.form.namespace && this.namespaces.length) {
          this.form.namespace = this.sourceNamespace || this.namespaces[0].name
        }
      })
    }
    if (this.isProjectEdit) {
      this.loadProjectSource()
    } else if (this.isEdit) {
      this.loadSource()
    } else {
      this.addRule()
    }
  },
  methods: {
    emptyRule () {
      return {
        host: '',
        paths: [{
          path: '/',
          pathType: 'Prefix',
          serviceName: this.presetServiceName,
          servicePort: this.presetServicePort
        }]
      }
    },
    addRule () {
      this.form.rules.push(this.emptyRule())
    },
    removeRule (ri) {
      this.form.rules.splice(ri, 1)
    },
    addPath (ri) {
      this.form.rules[ri].paths.push({ path: '/', pathType: 'Prefix', serviceName: '', servicePort: 80 })
    },
    removePath (ri, pi) {
      this.form.rules[ri].paths.splice(pi, 1)
    },
    loadSource () {
      this.loading = true
      kubernetesClusterIngressDetail(this.orgId, this.clusterId, this.sourceNamespace, this.sourceName).then(res => {
        const ingress = res.data.ingress || {}
        const metadata = ingress.metadata || {}
        const toPairs = (obj) => Object.keys(obj || {}).map(k => ({ key: k, value: obj[k] }))
        this.form.name = metadata.name || ''
        this.form.namespace = metadata.namespace || this.sourceNamespace
        this.form.labels = toPairs(metadata.labels)
        const tls = (ingress.spec && ingress.spec.tls) || []
        const annotations = metadata.annotations || {}
        const certificateId = Number(annotations['codegalaxy.com/tls-certificate-id'] || 0)
        this.form.tls_enabled = tls.length > 0
        this.form.certificate_id = certificateId || null
        this.form.https_redirect = annotations['codegalaxy.com/https-redirect'] === 'true'
        this.unmanagedTls = tls.length > 0 && !certificateId
        const rules = (ingress.spec && ingress.spec.rules) || []
        this.form.rules = rules.length
          ? rules.map(rule => ({
            host: rule.host || '',
            paths: (rule.http && rule.http.paths ? rule.http.paths : []).map(p => ({
              path: p.path || '/',
              pathType: p.pathType || 'Prefix',
              serviceName: (p.backend && p.backend.service && p.backend.service.name) || '',
              servicePort: (p.backend && p.backend.service && p.backend.service.port && p.backend.service.port.number) || 80
            }))
          }))
          : [this.emptyRule()]
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载源 Ingress 失败')
      }).finally(() => { this.loading = false })
    },
    loadProjectSource () {
      this.loading = true
      projectRouteProfile(
        this.orgId,
        this.groupId,
        this.projectId,
        this.routeId
      ).then(res => {
        const route = res.data.route || {}
        if (route.orchestrator_type !== 'kubernetes') {
          throw new Error('该路由不属于 Kubernetes 集群')
        }
        this.form.tls_enabled = Boolean(route.tls_enabled)
        this.form.certificate_id = route.certificate_id
          ? Number(route.certificate_id)
          : null
        this.form.https_redirect = Boolean(route.https_redirect)
        this.form.https_redirect_port = Number(route.https_redirect_port || 443)
        this.form.priority = Number(route.priority || 0)
        this.form.enabled = Boolean(route.enabled)
        this.form.rules = [{
          host: route.hostname || '',
          paths: [{
            path: route.path_prefix || '/',
            pathType: route.path_match === 'exact' ? 'Exact' : 'Prefix',
            serviceName: '',
            servicePort: Number(route.target_port || 80)
          }]
        }]
        this.syncManagedDomainSelection(route.hostname || '')
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载项目路由失败')
      }).finally(() => { this.loading = false })
    },
    loadCertificates () {
      this.certificatesLoading = true
      certificateOptions(this.orgId).then(res => {
        this.certificates = res.data.certificates || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载 SSL 证书失败')
      }).finally(() => { this.certificatesLoading = false })
    },
    loadIngressSettings () {
      kubernetesClusterProfile(this.orgId, this.clusterId).then(res => {
        const connection = res.data.connection || {}
        this.form.https_redirect_port = Number(connection.ingress_https_port || 443)
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载集群入口设置失败')
      })
    },
    loadDomainOptions () {
      loadDomainOptions(this.orgId, this.groupId, this.projectId).then(res => {
        this.domainOptions = res.data.domains || []
        const rule = this.form.rules[0]
        if (rule) this.syncManagedDomainSelection(rule.host)
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载项目组域名失败')
      })
    },
    selectManagedDomain (rule) {
      this.subdomainPrefix = ''
      rule.host = this.selectedManagedDomain ? this.selectedManagedDomain.hostname : ''
    },
    updateManagedHostname (rule) {
      if (!this.selectedManagedDomain) return
      const prefix = String(this.subdomainPrefix || '')
        .toLowerCase()
        .replace(/^\.+|\.+$/g, '')
      rule.host = prefix
        ? `${prefix}.${this.selectedManagedDomain.hostname}`
        : this.selectedManagedDomain.hostname
    },
    syncManagedDomainSelection (hostname) {
      hostname = String(hostname || '').toLowerCase()
      const candidates = this.domainOptions.filter(domain =>
        hostname === domain.hostname ||
        (domain.allow_subdomains && hostname.endsWith(`.${domain.hostname}`))
      ).sort((left, right) => right.hostname.length - left.hostname.length)
      const domain = candidates[0]
      if (!domain) return
      this.selectedDomainId = domain.id
      this.subdomainPrefix = hostname === domain.hostname
        ? ''
        : hostname.slice(0, -(domain.hostname.length + 1))
    },
    onTlsChange (enabled) {
      if (!enabled) {
        this.form.certificate_id = null
        this.form.https_redirect = false
        this.unmanagedTls = false
      }
    },
    ingressHosts () {
      return [...new Set(this.form.rules.map(rule => String(rule.host || '').trim().toLowerCase()).filter(Boolean))]
    },
    certificateAvailable (certificate) {
      if (!certificate.deployable) return false
      const hosts = this.ingressHosts()
      return hosts.length === 0 || hosts.every(host => this.certificateCovers(certificate, host))
    },
    certificateCovers (certificate, hostname) {
      return (certificate.domains || []).some(value => {
        const domain = String(value || '').toLowerCase().replace(/\.$/, '')
        if (domain === hostname) return true
        if (!domain.startsWith('*.')) return false
        const suffix = domain.slice(1)
        return hostname.endsWith(suffix) &&
          hostname.split('.').length === domain.split('.').length
      })
    },
    certificateLabel (certificate) {
      const status = certificate.deployable ? '' : ' · 不可部署'
      return `${certificate.title} · ${(certificate.domains || []).join(', ')}${status}`
    },
    save () {
      if (!this.projectMode && !this.form.name.trim()) return this.$message.warning('请输入名称')
      if (!this.projectMode && !this.form.namespace) return this.$message.warning('请选择命名空间')
      if (!this.form.rules.length) return this.$message.warning('请至少添加一条规则')
      if (this.projectMode && !this.ingressHosts().length) {
        return this.$message.warning('请选择 Host 域名')
      }
      if (this.projectMode && !this.runtimeId && !this.isProjectEdit) {
        return this.$message.warning('缺少目标运行实例，请返回路由列表重新选择')
      }
      if (this.form.tls_enabled) {
        if (!this.ingressHosts().length) return this.$message.warning('启用 HTTPS 时必须填写 Host')
        if (!this.form.certificate_id) return this.$message.warning('请选择 SSL 证书')
        const certificate = this.certificates.find(item => Number(item.id) === Number(this.form.certificate_id))
        if (!certificate || !this.certificateAvailable(certificate)) {
          return this.$message.warning('所选证书不可部署或不能覆盖全部 Host')
        }
      }
      for (const rule of this.form.rules) {
        if (!rule.paths.length) return this.$message.warning('每条规则至少需要一个路径')
        for (const p of rule.paths) {
          if (!p.path) return this.$message.warning('路径不能为空')
          if (!this.projectMode && !p.serviceName) return this.$message.warning('服务名不能为空')
          if (!p.servicePort) return this.$message.warning('服务端口不能为空')
        }
      }
      const form = {
        namespace: this.form.namespace,
        name: this.form.name.trim(),
        labels: this.form.labels,
        tls_enabled: this.form.tls_enabled,
        certificate_id: this.form.certificate_id,
        https_redirect: this.form.https_redirect,
        https_redirect_port: this.form.https_redirect_port,
        rules: this.form.rules
      }
      this.saving = true
      let request
      if (this.projectMode) {
        const rule = this.form.rules[0]
        const path = rule.paths[0]
        const routeForm = {
          hostname: rule.host,
          path_prefix: path.path,
          path_match: path.pathType === 'Exact' ? 'exact' : 'prefix',
          target_port: path.servicePort,
          entrypoint: 'web',
          priority: this.form.priority,
          tls_enabled: this.form.tls_enabled,
          certificate_id: this.form.certificate_id,
          https_redirect: this.form.https_redirect,
          https_redirect_port: this.form.https_redirect_port,
          enabled: this.form.enabled
        }
        request = this.isProjectEdit
          ? projectRouteUpdate(
            this.orgId,
            this.groupId,
            this.projectId,
            this.routeId,
            routeForm
          )
          : projectRouteCreate(
            this.orgId,
            this.groupId,
            this.projectId,
            {
              runtime_id: this.runtimeId,
              ...routeForm
            }
          )
      } else {
        request = this.isEdit
          ? kubernetesClusterIngressUpdate(this.orgId, this.clusterId, form)
          : kubernetesClusterIngressCreate(this.orgId, this.clusterId, form)
      }
      request.then(() => {
        this.$message.success(this.isEdit ? 'Ingress 已更新' : 'Ingress 已创建')
        this.goBack()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '保存失败')
      }).finally(() => { this.saving = false })
    },
    goBack () {
      if (this.projectMode) {
        this.$router.push(
          this.presetDeploymentName
            ? this.deploymentDetailLocation('ingresses')
            : {
                name: 'ProjectRoutes',
                params: {
                  groupId: this.groupId,
                  projectId: this.projectId
                }
              }
        )
        return
      }
      this.$router.push({ name: 'ClusterK8sIngresses', params: { clusterId: this.clusterId } })
    },
    removeProjectRoute () {
      this.$confirm(
        '删除后 Kubernetes Ingress 将立即移除，是否继续？',
        '删除路由',
        { type: 'warning' }
      ).then(() => {
        this.deleting = true
        return projectRouteDelete(
          this.orgId,
          this.groupId,
          this.projectId,
          this.routeId
        ).then(() => {
          this.$message.success('Ingress 已删除')
          this.goBack()
        }).finally(() => { this.deleting = false })
      }).catch(() => {})
    },
    deploymentDetailLocation (tab = 'overview') {
      return {
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
    }
  }
}
</script>

<style lang="scss" scoped>
.content-card { border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.card-header { display: flex; align-items: center; font-size: 15px; font-weight: 600; color: #303133; }
.card-header-icon { margin-right: 8px; color: #409eff; font-size: 16px; }
.create-form { max-width: 920px; }
.rule-card { border: 1px solid #ebeef5; border-radius: 6px; padding: 12px; margin-bottom: 12px; background: #fafbfc; }
.rule-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.rule-index { font-weight: 600; color: #303133; }
.rule-host { max-width: 420px; margin-bottom: 10px; }
.path-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
.path-path { width: 160px; }
.path-type { width: 180px; }
.path-svc { width: 200px; }
.path-port { width: 130px; }
.certificate-select { width: 520px; max-width: 100%; }
.form-tip { margin-top: 7px; color: #909399; font-size: 12px; line-height: 18px; }
.text-danger { color: #f56c6c; }
</style>
