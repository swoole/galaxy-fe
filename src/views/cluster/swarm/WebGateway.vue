<template>
  <div class="project-container web-gateway" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />

    <div class="gateway-routes">
      <div class="tab-content">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="这里是集群七层流量的唯一配置入口，可将域名和路径转发到任意 Docker Swarm Service，并统一配置 TLS、安全防护与流量治理。"
          style="margin-bottom: 18px" />

        <el-row :gutter="16" class="stat-mini-grid">
          <el-col :xs="12" :sm="6" :lg="4">
            <div class="stat-mini-card"><div class="stat-mini-value">{{ routeRows.length }}</div><div class="stat-mini-label">规则总数</div></div>
          </el-col>
          <el-col :xs="12" :sm="6" :lg="4">
            <div class="stat-mini-card success"><div class="stat-mini-value">{{ enabledCount }}</div><div class="stat-mini-label">已启用</div></div>
          </el-col>
          <el-col :xs="12" :sm="6" :lg="4">
            <div class="stat-mini-card info"><div class="stat-mini-value">{{ httpsCount }}</div><div class="stat-mini-label">HTTPS</div></div>
          </el-col>
          <el-col :xs="12" :sm="6" :lg="4">
            <div class="stat-mini-card warning"><div class="stat-mini-value">{{ protectedCount }}</div><div class="stat-mini-label">已配置防护</div></div>
          </el-col>
        </el-row>

        <div class="metrics-head">
          <div>
            <div class="section-title">Web 请求统计</div>
            <div class="section-description">直接按 Traefik 域名路由汇总，包含非项目应用。</div>
          </div>
          <el-select v-model="metricsHours" size="small" class="metrics-range" @change="loadMetrics">
            <el-option label="最近 1 小时" :value="1" />
            <el-option label="最近 6 小时" :value="6" />
            <el-option label="最近 24 小时" :value="24" />
            <el-option label="最近 7 天" :value="168" />
          </el-select>
        </div>
        <el-row :gutter="16" class="request-stat-grid" v-loading="metricsLoading">
          <el-col :xs="12" :sm="6">
            <div class="request-stat-card">
              <div class="request-stat-label">请求总量</div>
              <div class="request-stat-value">{{ formatCount(metrics.summary.requests) }}</div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="request-stat-card success">
              <div class="request-stat-label">成功率</div>
              <div class="request-stat-value">{{ formatPercent(metrics.summary.success_rate) }}</div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="request-stat-card info">
              <div class="request-stat-label">当前 RPS</div>
              <div class="request-stat-value">{{ formatRate(metrics.summary.rps) }}</div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div :class="['request-stat-card', latencyType(metrics.summary.p95_seconds)]">
              <div class="request-stat-label">P95 延迟</div>
              <div class="request-stat-value">{{ formatLatency(metrics.summary.p95_seconds) }}</div>
            </div>
          </el-col>
        </el-row>
        <el-alert
          v-if="!metricsLoading && !metrics.available"
          type="warning"
          :closable="false"
          show-icon
          :title="metrics.metric_note || 'Web 请求指标暂不可用'"
          class="metrics-alert" />
        <el-table
          v-else
          :data="metrics.domains"
          size="small"
          stripe
          class="domain-metrics-table"
          empty-text="当前时间范围内暂无域名请求数据"
          :header-cell-style="headerCellStyle">
          <el-table-column label="域名" min-width="190">
            <template #default="{ row }">
              <div class="cell-name">{{ row.hostname }}</div>
              <div class="cell-sub">{{ row.route_count }} 条路由 · 网关 {{ row.gateway_count }} / 项目 {{ row.project_count }}</div>
            </template>
          </el-table-column>
          <el-table-column label="请求数" width="110" align="right">
            <template #default="{ row }"><span class="metric-number">{{ formatCount(row.stats.requests) }}</span></template>
          </el-table-column>
          <el-table-column label="成功率" width="105" align="right">
            <template #default="{ row }"><span :class="successClass(row.stats.success_rate)">{{ formatPercent(row.stats.success_rate) }}</span></template>
          </el-table-column>
          <el-table-column label="4xx / 5xx" width="125" align="right">
            <template #default="{ row }">{{ formatCount(row.stats.client_errors) }} / <span class="metric-danger">{{ formatCount(row.stats.server_errors) }}</span></template>
          </el-table-column>
          <el-table-column label="平均 / P95" width="155" align="right">
            <template #default="{ row }">{{ formatLatency(row.stats.avg_seconds) }} / <span :class="metricLatencyClass(row.stats.p95_seconds)">{{ formatLatency(row.stats.p95_seconds) }}</span></template>
          </el-table-column>
          <el-table-column label="请求 / 响应流量" min-width="155" align="right">
            <template #default="{ row }">{{ formatBytes(row.stats.request_bytes) }} / {{ formatBytes(row.stats.response_bytes) }}</template>
          </el-table-column>
        </el-table>

        <div class="section-title route-section-title">域名路由配置</div>
        <div class="toolbar">
          <div class="route-filters">
            <el-input v-model.trim="routeKeyword" size="small" clearable prefix-icon="el-icon-search" placeholder="搜索域名或 Service" />
            <el-select v-model="routeProtocol" size="small" style="width: 120px">
              <el-option label="全部协议" value="all" /><el-option label="HTTPS" value="https" /><el-option label="HTTP" value="http" />
            </el-select>
            <el-select v-model="routeSource" size="small" style="width: 130px">
              <el-option label="全部来源" value="all" /><el-option label="项目路由" value="project" /><el-option label="网关规则" value="gateway" /><el-option label="Workspace" value="workspace" />
            </el-select>
          </div>
          <div>
            <el-button size="small" icon="el-icon-plus" type="primary" @click="openCreate">添加路由</el-button>
            <el-button size="small" icon="el-icon-refresh" :loading="routeLoading || metricsLoading" @click="refreshAll">刷新</el-button>
          </div>
        </div>

        <el-table :data="filteredRouteRows" border stripe empty-text="暂无符合条件的路由规则" :header-cell-style="headerCellStyle">
          <el-table-column label="域名与路径" min-width="200">
            <template #default="{ row }">
              <div class="cell-name">{{ row.hostname }}</div>
              <div class="cell-sub" v-if="row.path_prefix && row.path_prefix !== '/'">{{ row.path_prefix }}</div>
            </template>
          </el-table-column>
          <el-table-column label="目标 Service" min-width="160">
            <template #default="{ row }">
              <span v-if="row.route_source === 'workspace'" class="cell-sub">自动分配 Workspace Service</span>
              <span v-else class="cell-target">{{ row.target_service }}:{{ row.target_port }}</span>
            </template>
          </el-table-column>
          <el-table-column label="来源" width="135">
            <template #default="{ row }">
              <el-tag size="small" :type="row.route_source === 'project' ? 'primary' : (row.route_source === 'workspace' ? 'warning' : 'info')">{{ row.route_source === 'project' ? '项目路由' : (row.route_source === 'workspace' ? 'Workspace 域名' : '网关规则') }}</el-tag>
              <div v-if="row.project" class="cell-sub">{{ row.project.title }}</div>
            </template>
          </el-table-column>
          <el-table-column label="TLS" width="90" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.route_source === 'workspace'" size="small" :type="row.tls_enabled ? 'success' : 'warning'">{{ row.tls_enabled ? 'HTTPS' : '未配置' }}</el-tag>
              <el-tag v-else size="small" :type="row.tls_enabled ? 'success' : 'info'">{{ row.tls_enabled ? 'HTTPS' : 'HTTP' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="证书" width="140" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.certificate" class="cell-sub">{{ row.certificate.title }}</span>
              <span v-else class="cell-sub">-</span>
            </template>
          </el-table-column>
          <el-table-column label="Rewrite" width="120">
            <template #default="{ row }">
              <el-tag v-if="rewriteCount(row)" size="small" type="warning">{{ rewriteCount(row) }} 条</el-tag>
              <span v-else class="cell-sub">-</span>
            </template>
          </el-table-column>
          <el-table-column label="防护策略" min-width="170">
            <template #default="{ row }">
              <el-tag v-if="(row.ip_allowlist || []).length" size="mini" type="success">白名单 {{ row.ip_allowlist.length }}</el-tag>
              <el-tag v-if="(row.ip_denylist || []).length" size="mini" type="danger">黑名单 {{ row.ip_denylist.length }}</el-tag>
              <el-tag v-if="row.rate_limit_average" size="mini" type="warning">限流 {{ row.rate_limit_average }}/{{ row.rate_limit_period_seconds }}s</el-tag>
              <span v-if="!(row.ip_allowlist || []).length && !(row.ip_denylist || []).length && !row.rate_limit_average" class="cell-sub">-</span>
            </template>
          </el-table-column>
          <el-table-column label="启用 / 同步" width="135" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
              <el-tooltip :disabled="!row.error" :content="row.error || ''" style="margin-left: 5px">
                <el-tag size="small" :type="syncStatusType(row.status)">{{ syncStatusText(row.status) }}</el-tag>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="text" @click="openEdit(row)">编辑</el-button>
              <el-popconfirm title="确定删除此路由规则？" confirm-button-text="删除" cancel-button-text="取消" @confirm="removeVhost(row)">
                <el-button slot="reference" type="text" class="danger">删除</el-button>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- Vhost Create/Edit Dialog -->
    <el-dialog :title="editingVhostId ? '编辑路由规则' : '添加路由规则'" :visible.sync="dialogVisible" width="860px" custom-class="gateway-route-dialog" @closed="resetVhostForm">
      <el-form ref="vhostForm" :model="vhostForm" :rules="vhostRules" label-width="135px" @submit.native.prevent="saveVhost">
        <el-form-item v-if="!editingVhostId" label="路由用途">
          <el-checkbox v-model="vhostForm.workspace_domain">作为 Workspace 泛域名</el-checkbox>
          <div class="form-help">该规则不转发到固定 Service；平台会为每个 Workspace 自动创建独立的精确域名路由。</div>
        </el-form-item>
        <el-form-item :label="vhostForm.workspace_domain ? 'Workspace 泛域名' : '域名'" prop="hostname">
          <el-input v-model.trim="vhostForm.hostname" :placeholder="vhostForm.workspace_domain ? '*.workspace.example.com' : 'project.example.com'" />
          <div v-if="vhostForm.workspace_domain" class="form-help">请先在 DNS 中将该泛域名解析到网关入口。新 Workspace 将获得类似 <code>focused-turing.workspace.example.com</code> 的持久随机域名。</div>
        </el-form-item>
        <template v-if="!vhostForm.workspace_domain">
          <el-row :gutter="16">
            <el-col :span="8"><el-form-item label="路径规则" prop="path_prefix"><el-input v-model.trim="vhostForm.path_prefix" placeholder="/" /></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="匹配方式"><el-select v-model="vhostForm.path_match" style="width:100%"><el-option label="前缀匹配" value="prefix" /><el-option label="精确匹配" value="exact" /><el-option label="正则匹配" value="regex" /></el-select></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="目标端口" prop="target_port"><el-input-number v-model="vhostForm.target_port" :min="1" :max="65535" /></el-form-item></el-col>
          </el-row>
          <el-form-item label="HTTP Method">
            <el-select v-model="vhostForm.methods" multiple clearable style="width:100%" placeholder="留空表示允许所有 Method">
              <el-option v-for="method in httpMethods" :key="method" :label="method" :value="method" />
            </el-select>
          </el-form-item>
          <el-form-item label="目标 Service" prop="target_service">
            <el-select v-model="vhostForm.target_service" :disabled="editingRouteSource === 'project'" filterable placeholder="选择 Swarm Service" style="width: 100%">
              <el-option v-for="svc in swarmServices" :key="svc.id" :label="svcLabel(svc)" :value="svc.name" />
            </el-select>
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item label="上游协议"><el-radio-group v-model="vhostForm.upstream_scheme"><el-radio label="http">HTTP</el-radio><el-radio label="https">HTTPS</el-radio></el-radio-group></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="保留 Host"><el-switch v-model="vhostForm.pass_host_header" /><span class="form-help inline-help">向上游传递原始 Host</span></el-form-item></el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item label="EntryPoint"><el-input v-model.trim="vhostForm.entrypoint" placeholder="web / websecure" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="路由优先级"><el-input-number v-model="vhostForm.priority" :min="0" :max="100000" /></el-form-item></el-col>
          </el-row>
          <el-form-item label="启用 HTTPS"><el-switch v-model="vhostForm.tls_enabled" @change="tlsChanged" /></el-form-item>
          <el-form-item v-if="vhostForm.tls_enabled" label="SSL 证书" prop="certificate_id">
            <el-select v-model="vhostForm.certificate_id" filterable clearable style="width: 100%" placeholder="请选择覆盖该域名的证书">
              <el-option v-for="item in matchingCertificates" :key="item.id" :label="certificateLabel(item)" :value="item.id" />
            </el-select>
            <div class="form-help">Let's Encrypt 证书由网关 ACME 自动签发；手动/自签名/云厂商证书通过 Docker Secret 部署。</div>
          </el-form-item>
          <el-form-item v-if="vhostForm.tls_enabled" label="HTTP 跳转 HTTPS"><el-switch v-model="vhostForm.https_redirect" /></el-form-item>
          <el-divider content-position="left">URL Rewrite</el-divider>
          <div v-for="(rewrite, index) in vhostForm.rewrites" :key="`rewrite-${index}`" class="rewrite-row">
            <div class="rewrite-row-head"><span>规则 {{ index + 1 }}</span><span><el-button type="text" :disabled="index === 0" @click="moveRewrite(index, -1)">上移</el-button><el-button type="text" :disabled="index === vhostForm.rewrites.length - 1" @click="moveRewrite(index, 1)">下移</el-button><el-button type="text" class="danger" @click="removeRewrite(index)">删除</el-button></span></div>
            <el-form-item label="改写方式"><el-select v-model="rewrite.rewrite_type" style="width:100%"><el-option label="移除路径前缀（StripPrefix）" value="strip_prefix" /><el-option label="正则替换路径（ReplacePathRegex）" value="replace_path_regex" /></el-select></el-form-item>
            <el-form-item :label="rewrite.rewrite_type === 'strip_prefix' ? '移除前缀' : '匹配表达式'"><el-input v-model.trim="rewrite.rewrite_pattern" :placeholder="rewrite.rewrite_type === 'strip_prefix' ? vhostForm.path_prefix : '^/api/(.*)'" /></el-form-item>
            <el-form-item v-if="rewrite.rewrite_type === 'replace_path_regex'" label="替换路径"><el-input v-model.trim="rewrite.rewrite_replacement" placeholder="/v2/${1}" /></el-form-item>
          </div>
          <el-form-item><el-button size="small" type="primary" plain icon="el-icon-plus" @click="addRewrite">添加 Rewrite 规则</el-button><span class="form-help inline-help">规则将按顺序依次执行。</span></el-form-item>
          <template>
            <el-divider content-position="left">安全防护</el-divider>
            <el-form-item label="策略模板">
              <el-button-group>
                <el-button size="mini" @click="applyPolicyPreset('website')">公开网站</el-button>
                <el-button size="mini" @click="applyPolicyPreset('api')">公共 API</el-button>
                <el-button size="mini" @click="applyPolicyPreset('internal')">内部管理</el-button>
                <el-button size="mini" @click="applyPolicyPreset('reset')">恢复默认</el-button>
              </el-button-group>
              <div class="form-help">模板只填写安全、限流、重试与超时参数，保存前仍可逐项调整。</div>
            </el-form-item>
            <el-form-item label="IP 白名单">
              <el-select
                v-model="vhostForm.ip_allowlist"
                multiple
                filterable
                allow-create
                default-first-option
                style="width:100%"
                placeholder="留空表示允许全部，例如 10.0.0.0/8">
                <el-option v-for="cidr in vhostForm.ip_allowlist" :key="cidr" :label="cidr" :value="cidr" />
              </el-select>
            </el-form-item>
            <el-form-item label="IP 黑名单">
              <el-select
                v-model="vhostForm.ip_denylist"
                multiple
                filterable
                allow-create
                default-first-option
                style="width:100%"
                placeholder="输入 IPv4、IPv6 或 CIDR 后回车">
                <el-option v-for="cidr in vhostForm.ip_denylist" :key="cidr" :label="cidr" :value="cidr" />
              </el-select>
              <div class="form-help">Traefik 直接按连接源 IP 匹配，不信任 X-Forwarded-For。黑名单请求不会命中该 Router。</div>
            </el-form-item>
            <el-form-item label="安全响应头"><el-switch v-model="vhostForm.security_headers_enabled" /><span class="form-help inline-help">启用 Nosniff、Frame-Deny、Referrer 与 Permissions Policy</span></el-form-item>
            <el-form-item label="响应压缩"><el-switch v-model="vhostForm.compress_enabled" /><span class="form-help inline-help">根据客户端 Accept-Encoding 自动压缩响应</span></el-form-item>
            <el-form-item label="请求体上限"><el-input-number v-model="vhostForm.request_body_limit_mb" :min="0" :max="10240" /><span class="form-help inline-help">MiB，0 表示不限制；超限直接拒绝</span></el-form-item>
            <el-form-item label="自定义请求 Header">
              <div v-for="(item, index) in vhostForm.custom_request_headers" :key="`req-header-${index}`" class="header-row"><el-input v-model.trim="item.name" placeholder="Header 名称" /><el-input v-model="item.value" placeholder="Header 值" /><el-button icon="el-icon-delete" @click="vhostForm.custom_request_headers.splice(index, 1)" /></div>
              <el-button size="mini" icon="el-icon-plus" @click="vhostForm.custom_request_headers.push({ name: '', value: '' })">添加请求 Header</el-button>
            </el-form-item>
            <el-form-item label="自定义响应 Header">
              <div v-for="(item, index) in vhostForm.custom_response_headers" :key="`res-header-${index}`" class="header-row"><el-input v-model.trim="item.name" placeholder="Header 名称" /><el-input v-model="item.value" placeholder="Header 值" /><el-button icon="el-icon-delete" @click="vhostForm.custom_response_headers.splice(index, 1)" /></div>
              <el-button size="mini" icon="el-icon-plus" @click="vhostForm.custom_response_headers.push({ name: '', value: '' })">添加响应 Header</el-button>
            </el-form-item>
            <el-form-item label="跨域 CORS"><el-switch v-model="vhostForm.cors_enabled" /></el-form-item>
            <template v-if="vhostForm.cors_enabled">
              <el-form-item label="允许来源"><el-select
                v-model="vhostForm.cors_allow_origins"
                multiple
                filterable
                allow-create
                default-first-option
                style="width:100%"
                placeholder="例如 https://example.com，输入后回车"><el-option v-for="item in vhostForm.cors_allow_origins" :key="item" :label="item" :value="item" /></el-select></el-form-item>
              <el-form-item label="允许 Header"><el-select
                v-model="vhostForm.cors_allow_headers"
                multiple
                filterable
                allow-create
                default-first-option
                style="width:100%"><el-option v-for="item in vhostForm.cors_allow_headers" :key="item" :label="item" :value="item" /></el-select></el-form-item>
              <el-row :gutter="16"><el-col :span="12"><el-form-item label="允许 Method"><el-select v-model="vhostForm.cors_allow_methods" multiple style="width:100%"><el-option v-for="method in httpMethods" :key="method" :label="method" :value="method" /></el-select></el-form-item></el-col><el-col :span="12"><el-form-item label="允许凭据"><el-switch v-model="vhostForm.cors_allow_credentials" /><span class="form-help inline-help">Access-Control-Allow-Credentials</span></el-form-item></el-col></el-row>
            </template>
            <el-divider content-position="left">流量治理</el-divider>
            <el-row :gutter="16">
              <el-col :span="8"><el-form-item label="平均请求数"><el-input-number v-model="vhostForm.rate_limit_average" :min="0" :max="1000000" @change="rateAverageChanged" /><div class="form-help">0 表示不限流</div></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="统计周期"><el-input-number v-model="vhostForm.rate_limit_period_seconds" :min="1" :max="86400" /><div class="form-help">秒</div></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="突发容量"><el-input-number v-model="vhostForm.rate_limit_burst" :min="0" :max="1000000" /></el-form-item></el-col>
            </el-row>
            <el-form-item label="最大并发请求"><el-input-number v-model="vhostForm.max_inflight_requests" :min="0" :max="1000000" /><span class="form-help inline-help">0 表示不限制</span></el-form-item>
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item label="失败重试"><el-input-number v-model="vhostForm.retry_attempts" :min="0" :max="10" /><span class="form-help inline-help">次</span></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="首次间隔"><el-input-number v-model="vhostForm.retry_initial_interval_ms" :min="10" :max="60000" /><span class="form-help inline-help">ms</span></el-form-item></el-col>
            </el-row>
            <el-form-item label="熔断表达式"><el-input v-model.trim="vhostForm.circuit_breaker_expression" placeholder="例如 ResponseCodeRatio(500, 600, 0, 600) > 0.30" /><div class="form-help">留空表示关闭；使用 Traefik CircuitBreaker 表达式。</div></el-form-item>
            <el-divider content-position="left">上游超时</el-divider>
            <el-row :gutter="16">
              <el-col :span="8"><el-form-item label="连接超时"><el-input-number v-model="vhostForm.dial_timeout_ms" :min="0" :max="600000" /><div class="form-help">ms，0 表示禁用</div></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="响应头超时"><el-input-number v-model="vhostForm.response_header_timeout_ms" :min="0" :max="3600000" /><div class="form-help">ms</div></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="空闲连接超时"><el-input-number v-model="vhostForm.idle_connection_timeout_ms" :min="0" :max="3600000" /><div class="form-help">ms</div></el-form-item></el-col>
            </el-row>
            <el-divider content-position="left">上游健康与会话</el-divider>
            <el-form-item label="健康检查路径"><el-input v-model.trim="vhostForm.healthcheck_path" placeholder="留空关闭，例如 /health" /></el-form-item>
            <el-row v-if="vhostForm.healthcheck_path" :gutter="16"><el-col :span="12"><el-form-item label="检查间隔"><el-input-number v-model="vhostForm.healthcheck_interval_ms" :min="1000" :max="3600000" /><span class="form-help inline-help">ms</span></el-form-item></el-col><el-col :span="12"><el-form-item label="检查超时"><el-input-number v-model="vhostForm.healthcheck_timeout_ms" :min="100" :max="600000" /><span class="form-help inline-help">ms</span></el-form-item></el-col></el-row>
            <el-form-item label="会话保持"><el-switch v-model="vhostForm.sticky_cookie_enabled" /><span class="form-help inline-help">使用安全 Cookie 将客户端固定到同一上游实例</span></el-form-item>
            <el-form-item v-if="vhostForm.sticky_cookie_enabled" label="Cookie 名称"><el-input v-model.trim="vhostForm.sticky_cookie_name" placeholder="cg_session" /></el-form-item>
          </template>
          <el-form-item label="启用路由"><el-switch v-model="vhostForm.enabled" /></el-form-item>
        </template>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="vhostSaving" @click="saveVhost">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import Breadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import { routeBreadcrumb } from '@/utils/helpers'
import { latencyTypeFromSeconds } from '@/utils/metricStatus'
import {
  clusterSwarmWebGateway,
  clusterSwarmWebGatewayMetrics,
  clusterSwarmWorkspaceDomainSave, clusterSwarmWorkspaceDomainDelete,
  clusterSwarmVhosts, clusterSwarmVhostCreate, clusterSwarmVhostUpdate, clusterSwarmVhostDelete,
  clusterSwarmWebGatewayServices
} from '@/api/cluster'
import { certificates as clusterCertificates } from '@/api/certificate'

const emptyVhostForm = () => ({
  workspace_domain: false,
  hostname: '',
  path_prefix: '/',
  target_service: '',
  target_port: 80,
  path_match: 'prefix',
  methods: [],
  upstream_scheme: 'http',
  pass_host_header: true,
  entrypoint: 'web',
  tls_enabled: false,
  certificate_id: null,
  https_redirect: false,
  rewrite_type: 'none',
  rewrite_pattern: '',
  rewrite_replacement: '',
  rewrites: [],
  priority: 0,
  enabled: true,
  ip_allowlist: [],
  ip_denylist: [],
  security_headers_enabled: true,
  rate_limit_average: 0,
  rate_limit_burst: 0,
  rate_limit_period_seconds: 1,
  max_inflight_requests: 0,
  retry_attempts: 0,
  retry_initial_interval_ms: 100,
  dial_timeout_ms: 30000,
  response_header_timeout_ms: 0,
  idle_connection_timeout_ms: 90000,
  compress_enabled: true,
  request_body_limit_mb: 0,
  custom_request_headers: [],
  custom_response_headers: [],
  cors_enabled: false,
  cors_allow_origins: [],
  cors_allow_methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  cors_allow_headers: ['Content-Type', 'Authorization'],
  cors_allow_credentials: false,
  cors_max_age_seconds: 600,
  circuit_breaker_expression: '',
  healthcheck_path: '',
  healthcheck_interval_ms: 10000,
  healthcheck_timeout_ms: 3000,
  sticky_cookie_enabled: false,
  sticky_cookie_name: 'cg_session'
})

export default {
  name: 'ClusterSwarmWebGateway',
  components: { Breadcrumb },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, required: true }
  },
  data () {
    return {
      loading: false,
      gateway: null,
      routeLoading: false,
      routeKeyword: '',
      routeProtocol: 'all',
      routeSource: 'all',
      metricsHours: 24,
      metricsLoading: false,
      metrics: { available: false, summary: {}, domains: [], routes: [], metric_note: '' },
      vhosts: [],
      projectRoutes: [],
      certificates: [],
      swarmServices: [],
      dialogVisible: false,
      vhostSaving: false,
      editingVhostId: null,
      editingRouteSource: 'gateway',
      vhostForm: emptyVhostForm(),
      vhostRules: {
        hostname: [{
          validator: (rule, value, callback) => {
            const pattern = this.vhostForm.workspace_domain
              ? /^\*\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/
              : /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/
            if (!value || !pattern.test(String(value).toLowerCase())) callback(new Error(this.vhostForm.workspace_domain ? '请输入泛域名，例如 *.workspace.example.com' : '请输入完整域名'))
            else callback()
          },
          trigger: 'blur'
        }],
        path_prefix: [{ required: true, message: '请输入路径前缀', trigger: 'blur' }],
        target_service: [{ validator: (rule, value, callback) => { if (!this.vhostForm.workspace_domain && !value) callback(new Error('请选择目标 Service')); else callback() }, trigger: 'change' }],
        target_port: [{ required: true, message: '请输入容器目标端口', trigger: 'change' }],
        certificate_id: [{ validator: (rule, value, callback) => { if (this.vhostForm.tls_enabled && !value) callback(new Error('HTTPS 路由必须选择 SSL 证书')); else callback() }, trigger: 'change' }]
      },
      headerCellStyle: { background: '#f8f9fb', color: '#303133', fontWeight: 600, fontSize: '13px' },
      httpMethods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'CONNECT', 'TRACE']
    }
  },
  computed: {
    breadcrumb () {
      return [...routeBreadcrumb(this), { title: this.$route.meta.title, to: '' }]
    },
    httpsCount () {
      return this.routeRows.filter(v => v.tls_enabled).length
    },
    enabledCount () {
      return this.routeRows.filter(v => v.enabled).length
    },
    protectedCount () {
      return this.routeRows.filter(v => (v.ip_allowlist || []).length || (v.ip_denylist || []).length || v.rate_limit_average || v.max_inflight_requests).length
    },
    routeRows () {
      const rows = [...this.projectRoutes, ...this.vhosts]
      const hostname = this.gateway && this.gateway.workspace_base_domain
      if (hostname) {
        rows.unshift({
          id: 'workspace-domain',
          route_source: 'workspace',
          hostname,
          path_prefix: '',
          target_service: '',
          target_port: null,
          tls_enabled: Number(this.gateway.workspace_certificate_id || 0) > 0,
          certificate_id: Number(this.gateway.workspace_certificate_id || 0),
          certificate: this.certificates.find(item => Number(item.id) === Number(this.gateway.workspace_certificate_id)) || null,
          rewrite_type: 'none',
          ip_allowlist: [],
          ip_denylist: [],
          rate_limit_average: 0,
          enabled: true,
          status: 'synced',
          error: null
        })
      }
      return rows
    },
    filteredRouteRows () {
      const keyword = this.routeKeyword.toLowerCase()
      return this.routeRows.filter(row => {
        if (row.route_source !== 'workspace' && this.routeProtocol === 'https' && !row.tls_enabled) return false
        if (row.route_source !== 'workspace' && this.routeProtocol === 'http' && row.tls_enabled) return false
        if (this.routeSource !== 'all' && row.route_source !== this.routeSource) return false
        if (!keyword) return true
        return [row.hostname, row.path_prefix, row.target_service, row.project?.title]
          .some(value => String(value || '').toLowerCase().includes(keyword))
      })
    },
    matchingCertificates () {
      const hostname = String(this.vhostForm.hostname || '').toLowerCase()
      if (!hostname) return this.certificates || []
      return (this.certificates || []).filter(cert => cert.source === 'lets_encrypt' || (cert.domains || []).some(domain => {
        domain = String(domain).toLowerCase()
        if (domain === hostname) return true
        if (!domain.startsWith('*.')) return false
        return hostname.split('.').length === domain.split('.').length && hostname.endsWith(domain.slice(1))
      }))
    }
  },
  created () {
    this.load()
    this.loadVhosts().then(() => this.openRequestedRoute())
    this.loadMetrics()
    this.loadSwarmServices()
    this.loadCertificates()
  },
  methods: {
    load () {
      this.loading = true
      clusterSwarmWebGateway(this.orgId, this.clusterId).then(res => {
        this.gateway = res.data.gateway
      }).finally(() => { this.loading = false })
    },
    syncStatusText (status) { return ({ pending: '同步中', synced: '已同步', error: '失败' })[status] || '未知' },
    syncStatusType (status) { return ({ pending: 'warning', synced: 'primary', error: 'danger' })[status] || 'info' },

    // Vhost methods
    loadVhosts () {
      this.routeLoading = true
      return clusterSwarmVhosts(this.orgId, this.clusterId, 1, 100).then(res => {
        this.vhosts = res.data.data || []
        this.projectRoutes = res.data.project_routes || []
      }).finally(() => { this.routeLoading = false })
    },
    loadMetrics () {
      this.metricsLoading = true
      return clusterSwarmWebGatewayMetrics(this.orgId, this.clusterId, this.metricsHours).then(res => {
        this.metrics = {
          available: false,
          summary: {},
          domains: [],
          routes: [],
          metric_note: '',
          ...(res.data || {})
        }
      }).catch(err => {
        this.metrics = {
          available: false,
          summary: {},
          domains: [],
          routes: [],
          metric_note: err.response?.data?.message || err.message || 'Web 请求指标加载失败'
        }
      }).finally(() => { this.metricsLoading = false })
    },
    refreshAll () {
      return Promise.all([this.loadVhosts(), this.loadMetrics()])
    },
    loadSwarmServices () {
      clusterSwarmWebGatewayServices(this.orgId, this.clusterId).then(res => {
        this.swarmServices = (res.data.services || []).filter(s => s.name)
      }).catch(() => {})
    },
    loadCertificates () {
      clusterCertificates(this.orgId, 1, 100).then(res => {
        this.certificates = res.data.data || []
      }).catch(() => {})
    },
    openCreate () {
      this.$router.push({ name: 'ClusterSwarmWebGatewayRouteCreate', params: { clusterId: this.clusterId } })
    },
    openEdit (row) {
      this.$router.push({
        name: 'ClusterSwarmWebGatewayRouteEdit',
        params: { clusterId: this.clusterId, source: row.route_source || 'gateway', routeId: row.id }
      })
    },
    resetVhostForm () {
      this.editingVhostId = null
      this.editingRouteSource = 'gateway'
      this.vhostForm = emptyVhostForm()
      if (this.$refs.vhostForm) this.$refs.vhostForm.clearValidate()
    },
    tlsChanged (enabled) {
      this.vhostForm.entrypoint = enabled ? 'websecure' : 'web'
      if (!enabled) {
        this.vhostForm.certificate_id = null
        this.vhostForm.https_redirect = false
      }
    },
    rateAverageChanged (value) {
      if (value > 0 && this.vhostForm.rate_limit_burst < value) this.vhostForm.rate_limit_burst = value
    },
    applyPolicyPreset (preset) {
      const policies = {
        website: { ip_allowlist: [], security_headers_enabled: true, rate_limit_average: 100, rate_limit_burst: 200, rate_limit_period_seconds: 1, max_inflight_requests: 500, retry_attempts: 2, retry_initial_interval_ms: 100, dial_timeout_ms: 5000, response_header_timeout_ms: 30000, idle_connection_timeout_ms: 90000 },
        api: { ip_allowlist: [], security_headers_enabled: true, rate_limit_average: 50, rate_limit_burst: 100, rate_limit_period_seconds: 1, max_inflight_requests: 200, retry_attempts: 1, retry_initial_interval_ms: 100, dial_timeout_ms: 3000, response_header_timeout_ms: 15000, idle_connection_timeout_ms: 60000 },
        internal: { ip_allowlist: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'], security_headers_enabled: true, rate_limit_average: 20, rate_limit_burst: 40, rate_limit_period_seconds: 1, max_inflight_requests: 50, retry_attempts: 1, retry_initial_interval_ms: 100, dial_timeout_ms: 3000, response_header_timeout_ms: 10000, idle_connection_timeout_ms: 30000 },
        reset: { ip_allowlist: [], security_headers_enabled: true, rate_limit_average: 0, rate_limit_burst: 0, rate_limit_period_seconds: 1, max_inflight_requests: 0, retry_attempts: 0, retry_initial_interval_ms: 100, dial_timeout_ms: 30000, response_header_timeout_ms: 0, idle_connection_timeout_ms: 90000 }
      }
      Object.assign(this.vhostForm, policies[preset])
    },
    saveVhost () {
      this.$refs.vhostForm.validate(valid => {
        if (!valid) return
        this.vhostSaving = true
        if (this.vhostForm.workspace_domain) {
          clusterSwarmWorkspaceDomainSave(
            this.orgId, this.clusterId, this.vhostForm.hostname,
            this.vhostForm.certificate_id, this.vhostForm.https_redirect
          ).then(res => {
            this.gateway = res.data.gateway || this.gateway
            this.$message.success('Workspace 泛域名规则已保存')
            this.dialogVisible = false
          }).catch(err => {
            this.$message.error(err.response?.data?.message || err.message || '保存失败')
          }).finally(() => { this.vhostSaving = false })
          return
        }
        const payload = {
          ...this.vhostForm,
          request_body_limit_bytes: Number(this.vhostForm.request_body_limit_mb || 0) * 1048576,
          custom_request_headers: this.headerMap(this.vhostForm.custom_request_headers),
          custom_response_headers: this.headerMap(this.vhostForm.custom_response_headers)
        }
        if (!this.validateRewrites(payload.rewrites)) return
        payload.rewrite_type = 'none'
        payload.rewrite_pattern = ''
        payload.rewrite_replacement = ''
        delete payload.request_body_limit_mb
        const request = this.editingVhostId
          ? clusterSwarmVhostUpdate(this.orgId, this.clusterId, this.editingVhostId, payload, this.editingRouteSource)
          : clusterSwarmVhostCreate(this.orgId, this.clusterId, payload)
        request.then(() => {
          this.$message.success('路由规则已保存')
          this.dialogVisible = false
          this.loadVhosts()
        }).catch(err => {
          this.$message.error(err.response?.data?.message || err.message || '保存失败')
        }).finally(() => { this.vhostSaving = false })
      })
    },
    removeVhost (row) {
      if (row.route_source === 'workspace') {
        clusterSwarmWorkspaceDomainDelete(this.orgId, this.clusterId).then(res => {
          this.gateway = res.data.gateway || this.gateway
          this.$message.success('Workspace 泛域名规则已删除；已有 Workspace 精确路由保持不变')
        }).catch(err => {
          this.$message.error(err.response?.data?.message || err.message || '删除失败')
        })
        return
      }
      clusterSwarmVhostDelete(this.orgId, this.clusterId, row.id, row.route_source || 'gateway').then(() => {
        this.$message.success('路由规则已删除')
        this.loadVhosts()
      }).catch(err => {
        this.$message.error(err.response?.data?.message || err.message || '删除失败')
      })
    },
    openRequestedRoute () {
      if (!this.$route.query.route_id) return
      const source = this.$route.query.source === 'project' ? 'project' : 'gateway'
      const rows = source === 'project' ? this.projectRoutes : this.vhosts
      const row = rows.find(item => String(item.id) === String(this.$route.query.route_id))
      if (row) this.openEdit(row)
    },
    rewriteCount (row) {
      if (Array.isArray(row.rewrites) && row.rewrites.length) return row.rewrites.length
      return row.rewrite_type && row.rewrite_type !== 'none' && row.rewrite_pattern ? 1 : 0
    },
    addRewrite () { this.vhostForm.rewrites.push({ rewrite_type: 'strip_prefix', rewrite_pattern: this.vhostForm.path_prefix || '/', rewrite_replacement: '' }) },
    removeRewrite (index) { this.vhostForm.rewrites.splice(index, 1) },
    moveRewrite (index, direction) {
      const target = index + direction
      if (target < 0 || target >= this.vhostForm.rewrites.length) return
      const [rewrite] = this.vhostForm.rewrites.splice(index, 1)
      this.vhostForm.rewrites.splice(target, 0, rewrite)
    },
    validateRewrites (rewrites) {
      for (const rewrite of rewrites || []) {
        if (!rewrite.rewrite_pattern) { this.$message.error('请填写每条 Rewrite 规则的匹配路径'); return false }
        if (rewrite.rewrite_type === 'replace_path_regex' && !rewrite.rewrite_replacement) { this.$message.error('请填写正则 Rewrite 的替换路径'); return false }
      }
      return true
    },
    svcLabel (svc) {
      return `${svc.name} (${svc.image || '-'}${svc.ports && svc.ports.length ? ' · ports: ' + svc.ports.join(',') : ''})`
    },
    certificateLabel (item) {
      const source = ({ self_signed: '自签名', manual: '手动', cloud_import: '云厂商', lets_encrypt: 'Let\'s Encrypt' })[item.source] || item.source
      return `${item.title} · ${source} · ${(item.domains || []).join(', ')}`
    },
    headerRows (headers) {
      return Object.entries(headers || {}).map(([name, value]) => ({ name, value }))
    },
    headerMap (rows) {
      return (rows || []).reduce((result, item) => {
        if (item.name) result[item.name] = item.value || ''
        return result
      }, {})
    },
    formatCount (value) {
      const number = Number(value || 0)
      return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: number < 10 ? 2 : 0 }).format(number)
    },
    formatPercent (value) {
      return value === null || value === undefined ? '-' : `${Number(value).toFixed(2)}%`
    },
    formatRate (value) {
      return `${Number(value || 0).toFixed(2)}/s`
    },
    formatLatency (seconds) {
      const value = Number(seconds || 0)
      if (value <= 0) return '0 ms'
      if (value < 1) return `${Math.round(value * 1000)} ms`
      return `${value.toFixed(2)} s`
    },
    formatBytes (value) {
      let number = Number(value || 0)
      const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
      let index = 0
      while (number >= 1024 && index < units.length - 1) {
        number /= 1024
        index++
      }
      return `${number.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
    },
    successClass (value) {
      if (value === null || value === undefined) return 'metric-muted'
      return Number(value) >= 99 ? 'metric-success' : (Number(value) >= 95 ? 'metric-warning' : 'metric-danger')
    },
    latencyType (value) {
      return latencyTypeFromSeconds(value)
    },
    metricLatencyClass (value) {
      const type = latencyTypeFromSeconds(value)
      return type ? `metric-${type}` : 'metric-muted'
    }
  }
}
</script>

<style lang="scss" scoped>
.gateway-routes { margin: 20px; padding: 20px; background: #fff; border-radius: 6px; }
.stat-mini-grid { margin-bottom: 16px; }
.stat-mini-card {
  background: #fff; border-radius: 6px; padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); border-left: 3px solid #e4e7ed;
  &.info { border-left-color: #409eff; }
  &.success { border-left-color: #67c23a; }
  &.warning { border-left-color: #e6a23c; }
  .stat-mini-value { font-size: 26px; font-weight: 700; color: #303133; line-height: 1.2; }
  .stat-mini-label { margin-top: 6px; font-size: 13px; color: #909399; }
}
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.route-filters { display: flex; gap: 8px; .el-input { width: 240px; } }
.metrics-head { display: flex; align-items: flex-end; justify-content: space-between; margin: 26px 0 12px; }
.section-title { color: #303133; font-size: 16px; font-weight: 600; }
.section-description { margin-top: 5px; color: #909399; font-size: 12px; }
.metrics-range { width: 140px; }
.request-stat-grid { margin-bottom: 12px; }
.request-stat-card {
  min-height: 82px; padding: 15px 17px; border-radius: 6px;
  background: linear-gradient(135deg, #f8f9fb, #fff); border: 1px solid #ebeef5;
  &.success { border-top: 2px solid #67c23a; }
  &.info { border-top: 2px solid #409eff; }
  &.warning { border-top: 2px solid #e6a23c; }
  &.danger { border-top: 2px solid #f56c6c; }
}
.request-stat-label { color: #909399; font-size: 12px; }
.request-stat-value { margin-top: 8px; color: #303133; font-size: 22px; font-weight: 650; line-height: 1; }
.metrics-alert { margin-bottom: 18px; }
.domain-metrics-table { margin-bottom: 24px; border-top: 1px solid #ebeef5; }
.route-section-title { margin: 26px 0 14px; }
.metric-number { color: #303133; font-variant-numeric: tabular-nums; font-weight: 600; }
.metric-success { color: #67c23a; font-weight: 600; }
.metric-warning { color: #e6a23c; font-weight: 600; }
.metric-danger { color: #f56c6c; font-weight: 600; }
.metric-muted { color: #909399; }

.cell-name { font-weight: 600; color: #303133; font-size: 13px; }
.cell-sub { color: #909399; font-size: 12px; margin-top: 3px; }
.cell-target { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; font-size: 13px; color: #606266; }
.danger { color: #f56c6c; }
.form-help { margin-top: 5px; color: #909399; font-size: 12px; line-height: 1.6; }
.inline-help { display: inline; margin-left: 8px; }
.header-row { display: grid; grid-template-columns: 1fr 2fr 42px; gap: 8px; margin-bottom: 8px; }
.rewrite-row { margin-bottom: 16px; padding: 14px 14px 1px; border: 1px solid #ebeef5; border-radius: 4px; }
.rewrite-row-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; color: #606266; font-weight: 600; }

::v-deep .gateway-route-dialog {
  max-width: calc(100vw - 40px);
  .el-dialog__body { max-height: calc(100vh - 190px); overflow-y: auto; padding-top: 12px; }
}
@media (max-width: 768px) {
  .toolbar { align-items: flex-start; gap: 12px; flex-direction: column; }
  .route-filters { width: 100%; flex-wrap: wrap; .el-input { width: 100%; } }
}
</style>
