<template>
  <div class="route-editor" v-loading="loading">
    <div class="page-header">
      <div>
        <h2>{{ isEdit ? (canEdit ? '编辑网关路由' : '查看网关路由') : '添加网关路由' }}</h2>
        <div class="subtitle">将复杂网关参数按职责拆分配置，保存后统一同步到 Traefik。</div>
      </div>
      <el-button icon="el-icon-back" @click="back">返回路由列表</el-button>
    </div>

    <el-card shadow="never">
      <el-alert
        v-if="projectMode && !loading && !domainOptions.length"
        class="domain-warning"
        title="当前项目组尚未分配可用域名"
        description="请联系组织管理员在“资源 → 域名管理”中添加域名并授权给当前项目组，授权后即可创建或修改路由。"
        type="warning"
        :closable="false"
        show-icon />
      <el-form ref="form" :model="form" :rules="rules" :disabled="!canEdit" label-width="145px">
        <el-form-item v-if="!isEdit && !projectMode" label="路由类型">
          <el-radio-group v-model="form.workspace_domain" @change="routeTypeChanged">
            <el-radio-button :label="false">Service 路由</el-radio-button>
            <el-radio-button :label="true">Workspace 泛域名</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <template v-if="form.workspace_domain">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="泛域名本身不会生成 catch-all Router；只有下方 Service 映射会生成精确域名路由。没有任何映射时，Traefik 自动返回 404。" />
          <el-form-item label="Workspace 泛域名" prop="hostname" class="domain-field">
            <el-input v-model.trim="form.hostname" placeholder="*.workspace.example.com" />
            <div class="form-help">请先在 DNS 中将泛域名解析到当前 Web 网关入口。</div>
          </el-form-item>
          <el-form-item label="泛域名证书" prop="certificate_id" class="domain-field">
            <el-select v-model="form.certificate_id" filterable style="width:100%" placeholder="选择覆盖该泛域名的 SSL 证书">
              <el-option v-for="cert in matchingCertificates" :key="cert.id" :label="certificateLabel(cert)" :value="cert.id" />
            </el-select>
            <div class="form-help">证书必须包含当前泛域名；所有 Service 映射和新 Workspace 会自动继承。</div>
          </el-form-item>
          <el-form-item label="HTTP 跳转 HTTPS"><el-switch v-model="form.https_redirect" /></el-form-item>

          <div class="mapping-head">
            <div><strong>Service 映射</strong><span>一个泛域名可以映射多个 Workspace 或普通 Swarm Service</span></div>
            <el-button size="small" type="primary" plain icon="el-icon-plus" @click="addMapping">添加映射</el-button>
          </div>
          <el-table :data="mappings" border empty-text="暂无 Service 映射；保存后该泛域名下的请求将返回 404">
            <el-table-column label="子域名" min-width="170">
              <template #default="{ row }">
                <el-input v-model.trim="row.subdomain" :disabled="row.readonly" placeholder="focused-turing">
                  <template slot="append">.{{ workspaceBaseDomain || 'workspace.example.com' }}</template>
                </el-input>
              </template>
            </el-table-column>
            <el-table-column label="目标 Service" min-width="220">
              <template #default="{ row }">
                <el-select v-model="row.target_service" :disabled="row.readonly" filterable style="width:100%" placeholder="选择 Swarm Service">
                  <el-option v-for="service in services" :key="service.name" :label="serviceLabel(service)" :value="service.name" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="端口" width="145">
              <template #default="{ row }"><el-input-number v-model="row.target_port" :disabled="row.readonly" :min="1" :max="65535" /></template>
            </el-table-column>
            <el-table-column label="来源" width="120">
              <template #default="{ row }"><el-tag size="small" :type="row.readonly ? 'info' : 'success'">{{ row.readonly ? '受管映射' : '手动映射' }}</el-tag></template>
            </el-table-column>
            <el-table-column label="操作" width="90" align="center">
              <template #default="{ $index, row }"><el-button type="text" class="danger" :disabled="row.readonly" @click="removeMapping($index)">移除</el-button></template>
            </el-table-column>
          </el-table>
        </template>

        <el-tabs v-else v-model="activeTab" tab-position="left" class="config-tabs">
          <el-tab-pane label="基础转发" name="basic">
            <el-form-item label="域名" prop="hostname">
              <template v-if="projectMode">
                <el-select v-model="selectedDomainId" filterable style="width:100%" placeholder="选择管理员分配的域名" @change="selectManagedDomain">
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
                  style="margin-top:8px"
                  placeholder="子域名前缀，留空使用根域名"
                  @input="updateManagedHostname">
                  <template slot="append">.{{ selectedManagedDomain.hostname }}</template>
                </el-input>
              </template>
              <el-input v-else v-model.trim="form.hostname" placeholder="project.example.com" />
            </el-form-item>
            <el-row :gutter="18">
              <el-col :span="12"><el-form-item label="路径" prop="path_prefix"><el-input v-model.trim="form.path_prefix" placeholder="/" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="匹配方式"><el-select v-model="form.path_match" style="width:100%"><el-option label="前缀" value="prefix" /><el-option label="精确" value="exact" /><el-option label="正则" value="regex" /></el-select></el-form-item></el-col>
            </el-row>
            <el-form-item label="HTTP Method"><el-select v-model="form.methods" multiple clearable style="width:100%" placeholder="留空允许全部"><el-option v-for="method in httpMethods" :key="method" :label="method" :value="method" /></el-select></el-form-item>
            <el-form-item label="目标 Service" prop="target_service"><el-select v-model="form.target_service" :disabled="source === 'project'" filterable style="width:100%"><el-option v-for="service in services" :key="service.name" :label="serviceLabel(service)" :value="service.name" /></el-select></el-form-item>
            <el-row :gutter="18">
              <el-col :span="12"><el-form-item label="目标端口" prop="target_port"><el-input-number v-model="form.target_port" :min="1" :max="65535" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="上游协议"><el-radio-group v-model="form.upstream_scheme"><el-radio label="http">HTTP</el-radio><el-radio label="https">HTTPS</el-radio></el-radio-group></el-form-item></el-col>
            </el-row>
            <el-row :gutter="18"><el-col :span="12"><el-form-item label="保留 Host"><el-switch v-model="form.pass_host_header" /></el-form-item></el-col><el-col :span="12"><el-form-item label="启用路由"><el-switch v-model="form.enabled" /></el-form-item></el-col></el-row>
          </el-tab-pane>

          <el-tab-pane label="TLS 与入口" name="tls">
            <el-form-item label="EntryPoint"><el-input v-model.trim="form.entrypoint" placeholder="web / websecure" /></el-form-item>
            <el-form-item label="路由优先级"><el-input-number v-model="form.priority" :min="0" :max="100000" /></el-form-item>
            <el-form-item label="启用 HTTPS"><el-switch v-model="form.tls_enabled" @change="tlsChanged" /></el-form-item>
            <el-form-item v-if="form.tls_enabled" label="SSL 证书" prop="certificate_id"><el-select v-model="form.certificate_id" filterable clearable style="width:100%"><el-option v-for="cert in matchingCertificates" :key="cert.id" :label="certificateLabel(cert)" :value="cert.id" /></el-select></el-form-item>
            <el-form-item v-if="form.tls_enabled" label="跳转 HTTPS"><el-switch v-model="form.https_redirect" /></el-form-item>
          </el-tab-pane>

          <el-tab-pane label="URL Rewrite" name="rewrite">
            <el-alert type="info" :closable="false" show-icon title="Rewrite 按从上到下的顺序依次执行。" />
            <div v-if="!form.rewrites.length" class="empty-rewrites">未配置 URL Rewrite；请求会直接转发到上游。</div>
            <el-card v-for="(rewrite, index) in form.rewrites" :key="`rewrite-${index}`" shadow="never" class="rewrite-card">
              <div slot="header" class="rewrite-card-header">
                <span>规则 {{ index + 1 }}</span>
                <div>
                  <el-button type="text" :disabled="index === 0" @click="moveRewrite(index, -1)">上移</el-button>
                  <el-button type="text" :disabled="index === form.rewrites.length - 1" @click="moveRewrite(index, 1)">下移</el-button>
                  <el-button type="text" class="danger" @click="removeRewrite(index)">删除</el-button>
                </div>
              </div>
              <el-form-item label="改写方式">
                <el-select v-model="rewrite.rewrite_type" style="width:100%">
                  <el-option label="移除路径前缀（StripPrefix）" value="strip_prefix" />
                  <el-option label="正则替换路径（ReplacePathRegex）" value="replace_path_regex" />
                </el-select>
              </el-form-item>
              <el-form-item :label="rewrite.rewrite_type === 'strip_prefix' ? '移除前缀' : '匹配表达式'">
                <el-input v-model.trim="rewrite.rewrite_pattern" :placeholder="rewrite.rewrite_type === 'strip_prefix' ? form.path_prefix : '^/api/(.*)'" />
              </el-form-item>
              <el-form-item v-if="rewrite.rewrite_type === 'replace_path_regex'" label="替换路径">
                <el-input v-model.trim="rewrite.rewrite_replacement" placeholder="/v2/${1}" />
              </el-form-item>
            </el-card>
            <el-button size="small" type="primary" plain icon="el-icon-plus" @click="addRewrite">添加 Rewrite 规则</el-button>
          </el-tab-pane>

          <el-tab-pane label="访问安全" name="security">
            <el-form-item label="IP 白名单"><el-select
              v-model="form.ip_allowlist"
              multiple
              filterable
              allow-create
              default-first-option
              style="width:100%"
              placeholder="例如 10.0.0.0/8" /></el-form-item>
            <el-form-item label="IP 黑名单"><el-select
              v-model="form.ip_denylist"
              multiple
              filterable
              allow-create
              default-first-option
              style="width:100%"
              placeholder="IPv4、IPv6 或 CIDR" /></el-form-item>
            <el-form-item label="安全响应头"><el-switch v-model="form.security_headers_enabled" /></el-form-item>
            <el-form-item label="响应压缩"><el-switch v-model="form.compress_enabled" /></el-form-item>
            <el-form-item label="请求体上限"><el-input-number v-model="form.request_body_limit_mb" :min="0" :max="10240" /><span class="unit">MiB，0 表示不限</span></el-form-item>
          </el-tab-pane>

          <el-tab-pane label="流量与超时" name="traffic">
            <el-row :gutter="18"><el-col :span="8"><el-form-item label="平均请求数"><el-input-number v-model="form.rate_limit_average" :min="0" :max="1000000" /></el-form-item></el-col><el-col :span="8"><el-form-item label="统计周期"><el-input-number v-model="form.rate_limit_period_seconds" :min="1" :max="86400" /><span class="unit">秒</span></el-form-item></el-col><el-col :span="8"><el-form-item label="突发容量"><el-input-number v-model="form.rate_limit_burst" :min="0" :max="1000000" /></el-form-item></el-col></el-row>
            <el-form-item label="最大并发"><el-input-number v-model="form.max_inflight_requests" :min="0" :max="1000000" /></el-form-item>
            <el-row :gutter="18"><el-col :span="12"><el-form-item label="失败重试"><el-input-number v-model="form.retry_attempts" :min="0" :max="10" /></el-form-item></el-col><el-col :span="12"><el-form-item label="首次间隔"><el-input-number v-model="form.retry_initial_interval_ms" :min="10" :max="60000" /><span class="unit">ms</span></el-form-item></el-col></el-row>
            <el-form-item label="熔断表达式"><el-input v-model.trim="form.circuit_breaker_expression" /></el-form-item>
            <el-row :gutter="18"><el-col :span="8"><el-form-item label="连接超时"><el-input-number v-model="form.dial_timeout_ms" :min="0" :max="600000" /></el-form-item></el-col><el-col :span="8"><el-form-item label="响应头超时"><el-input-number v-model="form.response_header_timeout_ms" :min="0" :max="3600000" /></el-form-item></el-col><el-col :span="8"><el-form-item label="空闲超时"><el-input-number v-model="form.idle_connection_timeout_ms" :min="0" :max="3600000" /></el-form-item></el-col></el-row>
          </el-tab-pane>

          <el-tab-pane label="Header 与 CORS" name="headers">
            <el-form-item label="请求 Header"><header-editor v-model="form.custom_request_headers" /></el-form-item>
            <el-form-item label="响应 Header"><header-editor v-model="form.custom_response_headers" /></el-form-item>
            <el-form-item label="启用 CORS"><el-switch v-model="form.cors_enabled" /></el-form-item>
            <template v-if="form.cors_enabled">
              <el-form-item label="允许来源"><el-select
                v-model="form.cors_allow_origins"
                multiple
                filterable
                allow-create
                default-first-option
                style="width:100%" /></el-form-item>
              <el-form-item label="允许 Method"><el-select v-model="form.cors_allow_methods" multiple style="width:100%"><el-option v-for="method in httpMethods" :key="method" :label="method" :value="method" /></el-select></el-form-item>
              <el-form-item label="允许 Header"><el-select
                v-model="form.cors_allow_headers"
                multiple
                filterable
                allow-create
                default-first-option
                style="width:100%" /></el-form-item>
              <el-form-item label="允许凭据"><el-switch v-model="form.cors_allow_credentials" /></el-form-item>
              <el-form-item label="预检缓存"><el-input-number v-model="form.cors_max_age_seconds" :min="0" :max="86400" /><span class="unit">秒</span></el-form-item>
            </template>
          </el-tab-pane>

          <el-tab-pane label="健康与会话" name="health">
            <el-form-item label="健康检查路径"><el-input v-model.trim="form.healthcheck_path" placeholder="例如 /health；留空关闭" /></el-form-item>
            <el-row v-if="form.healthcheck_path" :gutter="18"><el-col :span="12"><el-form-item label="检查间隔"><el-input-number v-model="form.healthcheck_interval_ms" :min="1000" :max="3600000" /></el-form-item></el-col><el-col :span="12"><el-form-item label="检查超时"><el-input-number v-model="form.healthcheck_timeout_ms" :min="100" :max="600000" /></el-form-item></el-col></el-row>
            <el-form-item label="会话保持"><el-switch v-model="form.sticky_cookie_enabled" /></el-form-item>
            <el-form-item v-if="form.sticky_cookie_enabled" label="Cookie 名称"><el-input v-model.trim="form.sticky_cookie_name" /></el-form-item>
          </el-tab-pane>
        </el-tabs>
      </el-form>

      <div class="footer-actions">
        <el-button @click="back">{{ canEdit ? '取消' : '返回' }}</el-button>
        <el-button v-if="canEdit" type="primary" :disabled="projectMode && !domainOptions.length" :loading="saving" @click="save">保存路由</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import {
  clusterSwarmVhosts, clusterSwarmVhostCreate, clusterSwarmVhostUpdate, clusterSwarmVhostDelete,
  clusterSwarmWebGateway, clusterSwarmWebGatewayServices,
  clusterSwarmWorkspaceDomainSave
} from '@/api/cluster'
import { certificateOptions } from '@/api/certificate'
import { domainOptions as loadDomainOptions } from '@/api/domain'
import HeaderEditor from './components/HeaderEditor.vue'

const defaults = () => ({
  workspace_domain: false,
  hostname: '',
  path_prefix: '/',
  path_match: 'prefix',
  methods: [],
  target_service: '',
  target_port: 80,
  upstream_scheme: 'http',
  pass_host_header: true,
  entrypoint: 'web',
  priority: 0,
  tls_enabled: false,
  certificate_id: null,
  https_redirect: false,
  rewrite_type: 'none',
  rewrite_pattern: '',
  rewrite_replacement: '',
  rewrites: [],
  enabled: true,
  ip_allowlist: [],
  ip_denylist: [],
  security_headers_enabled: true,
  compress_enabled: true,
  request_body_limit_mb: 0,
  rate_limit_average: 0,
  rate_limit_burst: 0,
  rate_limit_period_seconds: 1,
  max_inflight_requests: 0,
  retry_attempts: 0,
  retry_initial_interval_ms: 100,
  dial_timeout_ms: 30000,
  response_header_timeout_ms: 0,
  idle_connection_timeout_ms: 90000,
  circuit_breaker_expression: '',
  custom_request_headers: {},
  custom_response_headers: {},
  cors_enabled: false,
  cors_allow_origins: [],
  cors_allow_methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  cors_allow_headers: ['Content-Type', 'Authorization'],
  cors_allow_credentials: false,
  cors_max_age_seconds: 600,
  healthcheck_path: '',
  healthcheck_interval_ms: 10000,
  healthcheck_timeout_ms: 3000,
  sticky_cookie_enabled: false,
  sticky_cookie_name: 'cg_session'
})

export default {
  name: 'WebGatewayRouteEditor',
  components: { HeaderEditor },
  props: {
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], default: null },
    projectId: { type: [Number, String], default: null },
    clusterId: { type: [Number, String], required: true },
    cluster: { type: Object, default: null },
    project: { type: Object, default: null }
  },
  data () {
    return {
      loading: true,
      saving: false,
      activeTab: 'basic',
      form: defaults(),
      services: [],
      certs: [],
      domainOptions: [],
      selectedDomainId: null,
      subdomainPrefix: '',
      source: this.$route.params.source || 'gateway',
      routeId: this.$route.params.routeId || null,
      gateway: null,
      vhosts: [],
      projectRoutes: [],
      mappings: [],
      originalMappings: [],
      originalDomain: '',
      httpMethods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'CONNECT', 'TRACE'],
      rules: {
        hostname: [{ required: true, validator: (rule, value, done) => this.validateHostname(value, done), trigger: 'blur' }],
        path_prefix: [{ required: true, message: '请输入路径', trigger: 'blur' }],
        target_service: [{ required: true, message: '请选择目标 Service', trigger: 'change' }],
        target_port: [{ required: true, message: '请输入目标端口', trigger: 'change' }],
        certificate_id: [{ validator: (rule, value, done) => { if (this.form.tls_enabled && !value) done(new Error('HTTPS 路由必须选择证书')); else done() }, trigger: 'change' }]
      }
    }
  },
  computed: {
    projectMode () { return Boolean(this.$route.meta.projectScope) },
    canEdit () {
      return !this.projectMode || this.$p(
        'project.no_viewer', this.project?.org_role, this.project?.group_role, this.project?.role
      )
    },
    requestScope () { return this.projectMode ? { groupId: this.groupId, projectId: this.projectId } : {} },
    isEdit () { return Boolean(this.routeId) },
    selectedManagedDomain () {
      return this.domainOptions.find(domain => Number(domain.id) === Number(this.selectedDomainId)) || null
    },
    workspaceBaseDomain () { return String(this.form.hostname || '').replace(/^\*\./, '') },
    matchingCertificates () {
      const host = String(this.form.hostname || '').toLowerCase()
      return this.certs.filter(cert => (!this.form.workspace_domain || cert.source !== 'lets_encrypt') && (cert.domains || []).some(domain => {
        domain = String(domain).toLowerCase()
        return domain === host || (domain.startsWith('*.') && host.endsWith(domain.slice(1)))
      }))
    }
  },
  created () { this.load() },
  methods: {
    async load () {
      this.loading = true
      try {
        const [gateway, routes, services, certs, domains] = await Promise.all([
          clusterSwarmWebGateway(this.orgId, this.clusterId, this.requestScope),
          clusterSwarmVhosts(this.orgId, this.clusterId, 1, 100, this.requestScope),
          clusterSwarmWebGatewayServices(this.orgId, this.clusterId, this.requestScope),
          certificateOptions(this.orgId, null, this.requestScope),
          this.projectMode ? loadDomainOptions(this.orgId, this.groupId, this.projectId) : Promise.resolve({ data: { domains: [] } })
        ])
        this.gateway = gateway.data.gateway
        this.vhosts = routes.data.data || []
        this.projectRoutes = routes.data.project_routes || []
        this.services = (services.data.services || []).filter(item => item.name)
        this.certs = certs.data.certificates || []
        this.domainOptions = domains.data.domains || []
        if (this.source === 'workspace' || (!this.isEdit && this.form.workspace_domain)) this.loadWorkspaceDomain()
        else if (this.isEdit) this.loadRoute()
        else if (this.projectMode && this.$route.query.target_service) {
          const requested = String(this.$route.query.target_service)
          if (this.services.some(service => service.name === requested)) this.form.target_service = requested
        }
      } catch (error) {
        this.$message.error(error.response?.data?.message || error.message || '路由配置加载失败')
      } finally { this.loading = false }
    },
    loadRoute () {
      const rows = this.source === 'project' ? this.projectRoutes : this.vhosts
      const row = rows.find(item => String(item.id) === String(this.routeId))
      if (!row) { this.$message.error('路由不存在'); this.back(); return }
      this.form = {
        ...defaults(),
        ...row,
        workspace_domain: false,
        request_body_limit_mb: Math.ceil(Number(row.request_body_limit_bytes || 0) / 1048576),
        custom_request_headers: { ...(row.custom_request_headers || {}) },
        custom_response_headers: { ...(row.custom_response_headers || {}) },
        rewrites: this.normalizeRewrites(row)
      }
      this.syncManagedDomainSelection()
    },
    loadWorkspaceDomain () {
      this.form = {
        ...defaults(),
        workspace_domain: true,
        hostname: this.gateway?.workspace_base_domain || '',
        certificate_id: Number(this.gateway?.workspace_certificate_id || 0) || null,
        https_redirect: this.gateway?.workspace_https_redirect !== false,
        tls_enabled: true,
        entrypoint: 'websecure'
      }
      this.originalDomain = this.workspaceBaseDomain
      const suffix = this.originalDomain ? `.${this.originalDomain}` : ''
      this.mappings = suffix
        ? [...this.vhosts, ...this.projectRoutes].filter(row => String(row.hostname || '').endsWith(suffix)).map(row => ({
            id: row.id,
            source: row.route_source || 'gateway',
            subdomain: row.hostname.slice(0, -suffix.length),
            target_service: row.target_service,
            target_port: Number(row.target_port || 80),
            readonly: (row.route_source === 'project') || String(row.target_service || '').startsWith('galaxy-workspace-')
          }))
        : []
      this.originalMappings = this.mappings.map(row => ({ ...row }))
    },
    routeTypeChanged (workspace) {
      if (workspace) this.loadWorkspaceDomain()
      else { this.form = defaults(); this.mappings = []; this.originalMappings = [] }
    },
    selectManagedDomain () {
      this.subdomainPrefix = ''
      this.form.hostname = this.selectedManagedDomain ? this.selectedManagedDomain.hostname : ''
    },
    updateManagedHostname () {
      if (!this.selectedManagedDomain) return
      const prefix = String(this.subdomainPrefix || '').toLowerCase().replace(/^\.+|\.+$/g, '')
      this.form.hostname = prefix ? `${prefix}.${this.selectedManagedDomain.hostname}` : this.selectedManagedDomain.hostname
    },
    syncManagedDomainSelection () {
      if (!this.projectMode || !this.form.hostname) return
      const hostname = String(this.form.hostname).toLowerCase()
      const candidates = this.domainOptions.filter(domain => hostname === domain.hostname || (
        domain.allow_subdomains && hostname.endsWith(`.${domain.hostname}`)
      )).sort((a, b) => b.hostname.length - a.hostname.length)
      const domain = candidates[0]
      if (!domain) return
      this.selectedDomainId = domain.id
      this.subdomainPrefix = hostname === domain.hostname ? '' : hostname.slice(0, -(domain.hostname.length + 1))
    },
    validateHostname (value, done) {
      const pattern = this.form.workspace_domain
        ? /^\*\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/
        : /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/
      if (!pattern.test(String(value || '').toLowerCase())) done(new Error(this.form.workspace_domain ? '请输入泛域名，例如 *.workspace.example.com' : '请输入完整域名'))
      else done()
    },
    addMapping () { this.mappings.push({ id: null, source: 'gateway', subdomain: '', target_service: '', target_port: 80, readonly: false }) },
    removeMapping (index) { this.mappings.splice(index, 1) },
    addRewrite () { this.form.rewrites.push({ rewrite_type: 'strip_prefix', rewrite_pattern: this.form.path_prefix || '/', rewrite_replacement: '' }) },
    removeRewrite (index) { this.form.rewrites.splice(index, 1) },
    moveRewrite (index, direction) {
      const target = index + direction
      if (target < 0 || target >= this.form.rewrites.length) return
      const rewrites = this.form.rewrites
      const [rewrite] = rewrites.splice(index, 1)
      rewrites.splice(target, 0, rewrite)
    },
    normalizeRewrites (row) {
      const rewrites = Array.isArray(row.rewrites) ? row.rewrites : []
      if (rewrites.length) {
        return rewrites.map(rewrite => ({
          rewrite_type: rewrite.rewrite_type,
          rewrite_pattern: rewrite.rewrite_pattern || '',
          rewrite_replacement: rewrite.rewrite_replacement || ''
        }))
      }
      if (row.rewrite_type && row.rewrite_type !== 'none' && row.rewrite_pattern) {
        return [{
          rewrite_type: row.rewrite_type,
          rewrite_pattern: row.rewrite_pattern,
          rewrite_replacement: row.rewrite_replacement || ''
        }]
      }
      return []
    },
    async save () {
      const valid = await new Promise(resolve => this.$refs.form.validate(resolve))
      if (!valid) return
      this.saving = true
      try {
        if (this.form.workspace_domain) await this.saveWorkspaceDomain()
        else await this.saveRegularRoute()
        this.$message.success('路由配置已保存')
        this.back()
      } catch (error) {
        this.$message.error(error.response?.data?.message || error.message || '保存失败')
      } finally { this.saving = false }
    },
    async saveRegularRoute () {
      // `form` is hydrated from an API row and may contain relation objects
      // (project/runtime/cluster/certificate). Submit only editable route
      // fields so response-only data can never become request scope.
      const payload = Object.keys(defaults()).reduce((result, key) => {
        result[key] = this.form[key]
        return result
      }, {})
      payload.request_body_limit_bytes = Number(this.form.request_body_limit_mb || 0) * 1048576
      for (const rewrite of payload.rewrites) {
        if (!rewrite.rewrite_pattern) throw new Error('请填写每条 Rewrite 规则的匹配路径')
        if (rewrite.rewrite_type === 'replace_path_regex' && !rewrite.rewrite_replacement) throw new Error('请填写正则 Rewrite 的替换路径')
      }
      delete payload.workspace_domain
      delete payload.request_body_limit_mb
      // 旧字段仅用于兼容历史数据；新建和更新一律以 rewrites 数组为准。
      payload.rewrite_type = 'none'
      payload.rewrite_pattern = ''
      payload.rewrite_replacement = ''
      if (this.projectMode && !this.isEdit) {
        payload.runtime_id = Number(this.$route.query.runtime_id || 0)
      }
      if (this.isEdit) await clusterSwarmVhostUpdate(this.orgId, this.clusterId, this.routeId, payload, this.source, this.requestScope)
      else await clusterSwarmVhostCreate(this.orgId, this.clusterId, payload, this.requestScope)
    },
    async saveWorkspaceDomain () {
      const base = this.workspaceBaseDomain
      const hasManaged = this.mappings.some(row => row.readonly)
      if (this.originalDomain && base !== this.originalDomain && hasManaged) throw new Error('当前泛域名下仍有 Workspace 自动映射，不能直接更换域名')
      const names = new Set()
      for (const row of this.mappings) {
        if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(row.subdomain) || !row.target_service || !row.target_port) throw new Error('请完整填写每条 Service 映射')
        if (names.has(row.subdomain)) throw new Error(`子域名 ${row.subdomain} 重复`)
        names.add(row.subdomain)
      }
      if (!this.form.certificate_id) throw new Error('请选择覆盖泛域名的 SSL 证书')
      await clusterSwarmWorkspaceDomainSave(
        this.orgId, this.clusterId, this.form.hostname, this.form.certificate_id, this.form.https_redirect
      )
      const currentIds = new Set(this.mappings.filter(row => row.id).map(row => String(row.id)))
      for (const old of this.originalMappings) {
        if (!old.readonly && old.id && !currentIds.has(String(old.id))) await clusterSwarmVhostDelete(this.orgId, this.clusterId, old.id, old.source)
      }
      for (const row of this.mappings) {
        if (row.readonly) continue
        const payload = this.mappingPayload(`${row.subdomain}.${base}`, row)
        if (row.id) await clusterSwarmVhostUpdate(this.orgId, this.clusterId, row.id, payload, row.source)
        else await clusterSwarmVhostCreate(this.orgId, this.clusterId, payload)
      }
    },
    mappingPayload (hostname, row) {
      return {
        hostname,
        path_prefix: '/',
        path_match: 'prefix',
        methods: [],
        target_service: row.target_service,
        target_port: row.target_port,
        upstream_scheme: 'http',
        pass_host_header: true,
        entrypoint: 'websecure',
        tls_enabled: true,
        certificate_id: this.form.certificate_id,
        https_redirect: this.form.https_redirect,
        rewrite_type: 'none',
        enabled: true,
        security_headers_enabled: true,
        compress_enabled: true
      }
    },
    tlsChanged (enabled) { this.form.entrypoint = enabled ? 'websecure' : 'web'; if (!enabled) { this.form.certificate_id = null; this.form.https_redirect = false } },
    serviceLabel (service) { return `${service.name} (${service.image || '-'})` },
    certificateLabel (cert) { return `${cert.title} · ${(cert.domains || []).join(', ')}` },
    back () {
      this.$router.push(this.projectMode
        ? { name: 'ProjectRoutes', params: { groupId: this.groupId, projectId: this.projectId } }
        : { name: 'ClusterSwarmWebGateway', params: { clusterId: this.clusterId } })
    }
  }
}
</script>

<style lang="scss" scoped>
.route-editor { padding: 20px; }
.page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.page-header h2 { margin:0 0 6px; font-size:20px; }
.subtitle, .form-help { color:#909399; font-size:12px; }
.config-tabs { margin-top:10px; }
.config-tabs ::v-deep .el-tabs__content { padding:0 24px; }
.domain-field { margin-top:20px; max-width:760px; }
.domain-warning { margin-bottom: 18px; }
.mapping-head { display:flex; justify-content:space-between; align-items:center; margin:24px 0 12px; }
.mapping-head span { margin-left:12px; color:#909399; font-size:12px; }
.footer-actions { display:flex; justify-content:flex-start; gap:10px; margin-top:24px; padding-top:18px; border-top:1px solid #ebeef5; }
.unit { margin-left:8px; color:#909399; font-size:12px; }
.danger { color:#f56c6c; }
.empty-rewrites { padding: 22px 0; color: #909399; text-align: center; }
.rewrite-card { margin: 14px 0; }
.rewrite-card-header { display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
</style>
