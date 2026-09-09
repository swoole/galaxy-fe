<template>
  <div class="project-container network-tunnel-page" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" />
    <div class="content">
      <el-alert
        title="每条规则描述一个清晰的端口流向；FRPS、FRPC 和编排平台配置由 Galaxy 自动生成并持久化。"
        type="info"
        :closable="false"
        show-icon />

      <div class="toolbar">
        <div class="toolbar-spacer" />
        <el-button type="primary" icon="el-icon-plus" @click="openAutomaticRule()">新增网络穿透规则</el-button>
        <el-dropdown trigger="click" @command="handleMoreCommand">
          <el-button icon="el-icon-more">更多<i class="el-icon-arrow-down el-icon--right" /></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="sync" icon="el-icon-refresh">恢复/同步全部</el-dropdown-item>
            <el-dropdown-item command="resources" icon="el-icon-setting">FRP 资源管理</el-dropdown-item>
            <el-dropdown-item command="server" icon="el-icon-plus">手动部署 FRPS</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>

      <el-table :data="tunnelRows" border stripe empty-text="暂无网络穿透规则">
        <el-table-column label="名称" min-width="180">
          <template #default="{ row }">
            <div class="endpoint-title">{{ row.tunnel.title }}</div>
          </template>
        </el-table-column>
        <el-table-column label="映射入口" min-width="240">
          <template #default="{ row }">
            <div class="endpoint-title">{{ row.server.cluster_title || row.server.title }} · {{ row.tunnel.remote_port }}</div>
            <div class="secondary">
              <template v-if="row.server.deployment_mode === 'external'">外部资源</template>
              <template v-else>集群 #{{ row.server.cluster_id }}</template>
              · {{ row.server.advertise_host }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="" width="64" align="center">
          <template><i class="el-icon-right flow-direction" /></template>
        </el-table-column>
        <el-table-column label="来源 Service" min-width="300">
          <template #default="{ row }">
            <div class="endpoint-title">
              {{ row.tunnel.source_service_name || row.tunnel.local_host }}:{{ row.tunnel.local_port }}
            </div>
            <div class="secondary">
              {{ row.client.cluster_title || row.client.title }}
              <template v-if="row.tunnel.source_service_namespace"> · {{ row.tunnel.source_service_namespace }}</template>
              · 集群 #{{ row.client.cluster_id || '-' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="协议" width="90" align="center">
          <template #default="{ row }">{{ String(row.tunnel.type || '').toUpperCase() }}</template>
        </el-table-column>
        <el-table-column label="状态" width="105" align="center">
          <template #default="{ row }">
            <el-tag :type="rowStatusType(row)" size="small">{{ rowStatusLabel(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="135" fixed="right">
          <template #default="{ row }">
            <el-button type="text" @click="editTunnelRow(row)">修改</el-button>
            <el-button type="text" class="danger-action" @click="removeRule(row.tunnel)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog title="FRP 资源管理" :visible.sync="resourceVisible" width="900px">
      <el-table :data="servers" border stripe empty-text="暂无 FRP 服务端">
        <el-table-column label="FRPS" min-width="200">
          <template #default="{ row }">
            <div class="endpoint-title">{{ row.title }}</div>
            <div class="secondary">{{ resourceLocation(row) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="控制入口" min-width="190">
          <template #default="{ row }">{{ row.advertise_host }}:{{ row.bind_port }}</template>
        </el-table-column>
        <el-table-column label="管理端口" width="100" align="center">
          <template #default="{ row }">{{ row.dashboard_port || '关闭' }}</template>
        </el-table-column>
        <el-table-column label="FRPC / 规则" width="120" align="center">
          <template #default="{ row }">{{ row.clients.length }} / {{ serverTunnelCount(row) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }"><el-tag :type="statusType(row.runtime_status)" size="small">{{ statusLabel(row.runtime_status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="270" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.dashboard_port" type="text" @click="openDashboard(row)">管理面板</el-button>
            <el-button type="text" :loading="syncingId === row.id" @click="syncServer(row)">同步</el-button>
            <el-button v-if="row.management_mode !== 'automatic'" type="text" @click="openClient(row)">添加 FRPC</el-button>
            <el-button v-if="row.management_mode !== 'automatic'" type="text" @click="openServer(row)">设置</el-button>
            <el-button v-if="row.management_mode !== 'automatic'" type="text" class="danger-action" @click="removeServer(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <span slot="footer"><el-button @click="resourceVisible = false">关闭</el-button></span>
    </el-dialog>

    <el-dialog :title="serverForm.server_id ? '设置 FRP 服务端' : '新增 FRP 服务端'" :visible.sync="serverVisible" width="680px">
      <el-form ref="serverForm" :model="serverForm" :rules="serverRules" label-width="130px">
        <el-form-item label="名称" prop="title">
          <el-input v-model="serverForm.title" placeholder="例如 公网入口" />
        </el-form-item>
        <el-form-item label="运行方式" prop="deployment_mode">
          <el-radio-group v-model="serverForm.deployment_mode">
            <el-radio-button label="managed">Galaxy 托管</el-radio-button>
            <el-radio-button label="external">外部资源</el-radio-button>
          </el-radio-group>
          <div class="form-help">外部资源只保存连接关系和 Token，不会部署或修改 FRPS。</div>
        </el-form-item>
        <el-form-item v-if="serverForm.deployment_mode === 'managed'" label="运行集群" prop="cluster_id">
          <el-select v-model="serverForm.cluster_id" filterable class="full-control">
            <el-option-group v-for="group in clusterGroups" :key="group.type" :label="group.label">
              <el-option v-for="cluster in group.items" :key="cluster.id" :label="cluster.title" :value="cluster.id" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="对外地址" prop="advertise_host">
          <el-input v-model.trim="serverForm.advertise_host" placeholder="公网 IP 或可解析域名" />
          <div class="form-help">FRPC 实际连接的地址；不要填写 http:// 前缀。</div>
        </el-form-item>
        <el-form-item label="控制端口" prop="bind_port">
          <el-input-number v-model="serverForm.bind_port" :min="1" :max="65535" />
          <div class="form-help">FRPC 连接 FRPS 使用的控制通道端口。</div>
        </el-form-item>
        <el-divider content-position="left">Web 入口（可选）</el-divider>
        <el-row :gutter="16" class="port-row">
          <el-col :span="12">
            <el-form-item label="HTTP 端口" label-width="100px">
              <el-input-number v-model="serverForm.vhost_http_port" :min="0" :max="65535" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="HTTPS 端口" label-width="100px">
              <el-input-number v-model="serverForm.vhost_https_port" :min="0" :max="65535" />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="section-help">仅 HTTP/HTTPS 类型的穿透规则需要设置；保持 0 表示不开放对应入口。</div>
        <el-divider content-position="left">FRPS Dashboard</el-divider>
        <el-form-item label="管理端口" prop="dashboard_port">
          <el-input-number v-model="serverForm.dashboard_port" :min="0" :max="65535" />
          <div class="form-help">设置为 0 表示关闭；启用后将通过集群入口发布该端口。</div>
        </el-form-item>
        <template v-if="serverForm.dashboard_port">
          <el-form-item label="管理用户名">
            <el-input v-model.trim="serverForm.dashboard_user" autocomplete="off" />
          </el-form-item>
          <el-form-item label="管理密码">
            <el-input
              v-model="serverForm.dashboard_password"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="serverForm.server_id && serverForm.dashboard_password_configured ? '留空保持原密码' : '请输入管理密码'" />
          </el-form-item>
        </template>
        <el-form-item v-if="serverForm.deployment_mode === 'managed'" label="FRPS 镜像" prop="image"><el-input v-model.trim="serverForm.image" /></el-form-item>
        <el-form-item v-if="serverForm.deployment_mode === 'managed'" label="K8s Namespace" prop="namespace"><el-input v-model.trim="serverForm.namespace" /></el-form-item>
        <el-form-item v-if="serverForm.deployment_mode === 'external'" label="外部 FRPS Token">
          <el-input v-model="serverForm.auth_token" type="password" show-password :placeholder="serverForm.server_id ? '留空保持原 Token' : '请输入外部 FRPS 已配置的 Token'" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="serverVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveServer">保存</el-button>
      </span>
    </el-dialog>

    <el-dialog
      :title="automaticForm.tunnel_id ? '编辑网络穿透规则' : '新增网络穿透规则'"
      :visible.sync="automaticVisible"
      width="680px">
      <el-alert
        class="automatic-alert"
        title="Galaxy 会自动创建或复用两端的 FRPS/FRPC，并将规则持久化；集群重建后可直接重新同步。"
        type="info"
        :closable="false"
        show-icon />
      <el-form
        ref="automaticForm"
        :model="automaticForm"
        :rules="automaticRules"
        label-width="120px">
        <el-form-item label="名称" prop="title">
          <el-input
            v-model="automaticForm.title"
            maxlength="120"
            show-word-limit
            placeholder="简单说明这条规则的作用" />
        </el-form-item>
        <el-divider content-position="left">来源服务</el-divider>
        <el-form-item label="来源集群" prop="source_cluster_id">
          <el-select
            v-model="automaticForm.source_cluster_id"
            filterable
            class="full-control"
            @change="sourceClusterChanged">
            <el-option-group v-for="group in clusterGroups" :key="`source-${group.type}`" :label="group.label">
              <el-option v-for="cluster in group.items" :key="cluster.id" :label="cluster.title" :value="cluster.id" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="Service" prop="source_service_ref">
          <el-select
            v-model="automaticForm.source_service_ref"
            filterable
            class="full-control"
            :loading="serviceLoading"
            :disabled="!automaticForm.source_cluster_id"
            placeholder="请先选择来源集群"
            @change="sourceServiceChanged">
            <el-option-group
              v-for="group in sourceServiceGroups"
              :key="group.namespace"
              :label="group.label">
              <el-option
                v-for="service in group.items"
                :key="service.ref"
                :label="service.name"
                :value="service.ref">
                <span>{{ service.name }}</span>
                <span v-if="service.ports.length" class="service-option-ports">
                  {{ service.ports.join(', ') }}
                </span>
              </el-option>
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="Service 端口" prop="source_port">
          <el-input-number v-model="automaticForm.source_port" :min="1" :max="65535" />
          <span class="inline-help">容器服务实际监听的端口</span>
        </el-form-item>

        <el-divider content-position="left">映射入口</el-divider>
        <el-form-item label="映射入口" prop="destination_target">
          <el-select
            v-model="automaticForm.destination_target"
            filterable
            class="full-control"
            @change="destinationTargetChanged">
            <el-option-group v-for="group in clusterGroups" :key="`destination-${group.type}`" :label="group.label">
              <el-option
                v-for="cluster in group.items"
                :key="cluster.id"
                :label="cluster.title"
                :value="`cluster:${cluster.id}`"
                :disabled="cluster.id === automaticForm.source_cluster_id" />
            </el-option-group>
            <el-option-group v-if="externalServers.length" label="外部 FRPS">
              <el-option
                v-for="server in externalServers"
                :key="`server-${server.id}`"
                :label="`${server.title} · ${server.advertise_host}:${server.bind_port}`"
                :value="`server:${server.id}`" />
            </el-option-group>
          </el-select>
          <div class="form-help">选择集群时自动创建或复用 FRPS；选择外部 FRPS 时复用其连接地址、Token 和控制端口。</div>
        </el-form-item>
        <el-form-item label="映射端口" prop="destination_port">
          <el-input-number v-model="automaticForm.destination_port" :min="1" :max="65535" />
        </el-form-item>

        <el-collapse v-model="automaticAdvanced" class="advanced-options">
          <el-collapse-item name="advanced">
            <template slot="title">
              <span class="advanced-title"><i class="el-icon-setting" /> 高级选项</span>
            </template>
            <el-form-item label="网络协议" prop="protocol">
              <el-radio-group v-model="automaticForm.protocol">
                <el-radio-button label="tcp">TCP</el-radio-button>
                <el-radio-button label="udp">UDP</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="FRPS 控制端口" label-width="135px">
                  <el-input-number
                    v-model="automaticForm.frps_bind_port"
                    :disabled="isExternalDestination"
                    :min="1"
                    :max="65535" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="FRPS 管理端口" label-width="135px">
                  <el-input-number
                    v-model="automaticForm.frps_dashboard_port"
                    :disabled="isExternalDestination"
                    :min="0"
                    :max="65535" />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="shared-option-help">
              <template v-if="isExternalDestination">外部 FRPS 的端口由外部资源设置管理，规则中不可修改。</template>
              <template v-else>FRPS 端口由映射集群内的全部规则共享；修改后会更新该集群自动管理的 FRPS。</template>
            </div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="连接池数量" label-width="105px">
                  <el-input-number v-model="automaticForm.pool_count" :min="1" :max="100" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="带宽限制" label-width="105px">
                  <el-input v-model.trim="automaticForm.bandwidth_limit" placeholder="例如 2MB" />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="shared-option-help">连接池数量由同一来源集群到同一 FRPS 的全部规则共享；带宽限制仅作用于当前规则。</div>
            <el-form-item label="传输优化">
              <el-checkbox v-model="automaticForm.use_encryption">加密传输</el-checkbox>
              <el-checkbox v-model="automaticForm.use_compression">压缩传输</el-checkbox>
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
      </el-form>
      <span slot="footer">
        <el-button @click="automaticVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveAutomaticRule">
          保存并自动部署
        </el-button>
      </span>
    </el-dialog>

    <el-dialog :title="clientForm.client_id ? '设置 FRP 客户端' : '新增 FRP 客户端'" :visible.sync="clientVisible" width="620px">
      <el-form ref="clientForm" :model="clientForm" :rules="clientRules" label-width="130px">
        <el-form-item label="名称" prop="title"><el-input v-model="clientForm.title" placeholder="例如 办公网客户端" /></el-form-item>
        <el-form-item label="运行集群" prop="cluster_id">
          <el-select v-model="clientForm.cluster_id" filterable class="full-control">
            <el-option-group v-for="group in clusterGroups" :key="group.type" :label="group.label">
              <el-option v-for="cluster in group.items" :key="cluster.id" :label="cluster.title" :value="cluster.id" />
            </el-option-group>
          </el-select>
          <div class="form-help">请选择内网目标实际运行的集群。FRPC 必须与目标 Service/Pod 位于同一集群，不应借用同机的其他集群访问宿主端口。</div>
        </el-form-item>
        <el-form-item label="客户端标识" prop="frp_user">
          <el-input v-model.trim="clientForm.frp_user" placeholder="例如 office" />
          <div class="form-help">会作为 FRP user 前缀，用于区分不同客户端的代理名称。</div>
        </el-form-item>
        <el-form-item label="FRPC 镜像" prop="image"><el-input v-model.trim="clientForm.image" /></el-form-item>
        <el-form-item label="K8s Namespace" prop="namespace"><el-input v-model.trim="clientForm.namespace" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="clientVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveClient">保存</el-button>
      </span>
    </el-dialog>

    <el-dialog :title="ruleForm.tunnel_id ? '编辑穿透规则' : '新增穿透规则'" :visible.sync="ruleVisible" width="700px">
      <el-form ref="ruleForm" :model="ruleForm" :rules="ruleRules" label-width="130px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="显示名称" prop="title"><el-input v-model="ruleForm.title" placeholder="例如 MySQL" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="规则标识" prop="proxy_name"><el-input v-model.trim="ruleForm.proxy_name" placeholder="mysql" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="协议类型" prop="type">
          <el-radio-group v-model="ruleForm.type">
            <el-radio-button label="tcp">TCP</el-radio-button>
            <el-radio-button label="udp">UDP</el-radio-button>
            <el-radio-button label="http">HTTP</el-radio-button>
            <el-radio-button label="https">HTTPS</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="16"><el-form-item label="内网目标" prop="local_host"><el-input v-model.trim="ruleForm.local_host" placeholder="Service DNS、容器名或 IP" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="目标端口" prop="local_port"><el-input-number v-model="ruleForm.local_port" :min="1" :max="65535" /></el-form-item></el-col>
        </el-row>
        <el-form-item v-if="isPortRule" label="外部端口" prop="remote_port">
          <el-input-number v-model="ruleForm.remote_port" :min="1" :max="65535" />
          <div class="form-help">Swarm 使用 Routing Mesh 发布；Kubernetes 通过 LoadBalancer Service 暴露。</div>
        </el-form-item>
        <template v-else>
          <el-form-item label="绑定域名" prop="custom_domains_text">
            <el-input v-model="ruleForm.custom_domains_text" type="textarea" :rows="2" placeholder="每行一个域名，例如 app.example.com" />
          </el-form-item>
          <el-form-item label="路径匹配">
            <el-input v-model="ruleForm.locations_text" placeholder="多个路径用逗号分隔，例如 /api,/admin" />
          </el-form-item>
          <el-form-item label="重写 Host">
            <el-input v-model.trim="ruleForm.host_header_rewrite" placeholder="可选" />
          </el-form-item>
        </template>
        <el-form-item label="传输选项">
          <el-checkbox v-model="ruleForm.transport_encryption">应用层加密</el-checkbox>
          <el-checkbox v-model="ruleForm.transport_compression">压缩传输</el-checkbox>
          <el-checkbox v-model="ruleForm.enabled">启用规则</el-checkbox>
        </el-form-item>
        <el-form-item label="带宽限制">
          <el-input v-model.trim="ruleForm.bandwidth_limit" placeholder="可选，例如 10MB" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="ruleVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRule">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  networkTunnelTopology,
  networkTunnelSourceServices,
  networkTunnelAutomaticRuleSave,
  networkTunnelServerCreate,
  networkTunnelServerUpdate,
  networkTunnelServerDelete,
  networkTunnelClientCreate,
  networkTunnelClientUpdate,
  networkTunnelClientDelete,
  networkTunnelRuleSave,
  networkTunnelRuleDelete,
  networkTunnelSync,
  networkTunnelSyncAll
} from '@/api/network-tunnel'
import { routeBreadcrumb } from '@/utils/helpers'
import Breadcrumb from '@/views/components/Breadcrumb.vue'

const serverBlank = () => ({
  server_id: null,
  title: '',
  deployment_mode: 'managed',
  cluster_id: null,
  advertise_host: '',
  bind_port: 7000,
  vhost_http_port: 0,
  vhost_https_port: 0,
  dashboard_port: 7500,
  dashboard_user: '',
  dashboard_password: '',
  dashboard_password_configured: false,
  image: 'fatedier/frps:v0.69.0',
  namespace: 'galaxy-frp',
  auth_token: ''
})
const clientBlank = () => ({
  client_id: null,
  server_id: null,
  title: '',
  deployment_mode: 'managed',
  cluster_id: null,
  frp_user: '',
  image: 'fatedier/frpc:v0.69.0',
  namespace: 'galaxy-frp'
})
const ruleBlank = () => ({
  tunnel_id: null,
  client_id: null,
  title: '',
  proxy_name: '',
  type: 'tcp',
  local_host: '',
  local_port: 80,
  remote_port: 0,
  custom_domains_text: '',
  locations_text: '',
  host_header_rewrite: '',
  transport_encryption: true,
  transport_compression: false,
  bandwidth_limit: '',
  enabled: true
})
const automaticBlank = () => ({
  tunnel_id: null,
  title: '',
  source_cluster_id: null,
  source_service_ref: '',
  source_service_name: '',
  source_service_namespace: '',
  source_port: 80,
  destination_target: '',
  destination_cluster_id: null,
  destination_server_id: null,
  destination_port: 0,
  protocol: 'tcp',
  frps_bind_port: 7000,
  frps_dashboard_port: 7500,
  use_encryption: true,
  use_compression: true,
  pool_count: 5,
  bandwidth_limit: '2MB'
})

export default {
  name: 'NetworkTunnels',
  components: { Breadcrumb },
  props: { orgId: { type: Number, required: true } },
  data () {
    return {
      loading: false,
      saving: false,
      syncingId: null,
      syncingAll: false,
      servers: [],
      clusters: [],
      defaults: {},
      serverVisible: false,
      clientVisible: false,
      ruleVisible: false,
      automaticVisible: false,
      automaticAdvanced: [],
      resourceVisible: false,
      serviceLoading: false,
      sourceServices: [],
      serverForm: serverBlank(),
      clientForm: clientBlank(),
      ruleForm: ruleBlank(),
      automaticForm: automaticBlank(),
      serverRules: {
        title: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        cluster_id: [{ validator: (rule, value, callback) => this.serverForm.deployment_mode === 'managed' && !value ? callback(new Error('请选择运行集群')) : callback(), trigger: 'change' }],
        advertise_host: [{ required: true, message: '请输入 FRPC 可连接的地址', trigger: 'blur' }],
        bind_port: [{ required: true, message: '请输入控制端口', trigger: 'change' }],
        image: [{ validator: (rule, value, callback) => this.serverForm.deployment_mode === 'managed' && !String(value || '').trim() ? callback(new Error('请输入 FRPS 镜像')) : callback(), trigger: 'blur' }],
        namespace: [{ pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, message: 'Namespace 格式不正确', trigger: 'blur' }]
      },
      clientRules: {
        title: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        cluster_id: [{ required: true, message: '请选择运行集群', trigger: 'change' }],
        image: [{ required: true, message: '请输入 FRPC 镜像', trigger: 'blur' }]
      },
      ruleRules: {
        title: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
        proxy_name: [
          { required: true, message: '请输入规则标识', trigger: 'blur' },
          { pattern: /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, message: '只能使用字母、数字、下划线和连字符', trigger: 'blur' }
        ],
        type: [{ required: true, message: '请选择协议', trigger: 'change' }],
        local_host: [{ required: true, message: '请输入内网目标', trigger: 'blur' }],
        local_port: [{ required: true, message: '请输入目标端口', trigger: 'change' }],
        remote_port: [{ validator: (rule, value, callback) => this.isPortRule && !value ? callback(new Error('请输入外部端口')) : callback(), trigger: 'change' }],
        custom_domains_text: [{ validator: (rule, value, callback) => !this.isPortRule && !String(value).trim() ? callback(new Error('请输入至少一个域名')) : callback(), trigger: 'blur' }]
      },
      automaticRules: {
        title: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
        source_cluster_id: [{ required: true, message: '请选择来源集群', trigger: 'change' }],
        source_service_ref: [{ required: true, message: '请选择来源 Service', trigger: 'change' }],
        source_port: [{ required: true, message: '请输入 Service 端口', trigger: 'change' }],
        destination_target: [
          { required: true, message: '请选择映射入口', trigger: 'change' },
          {
            validator: (rule, value, callback) => value === `cluster:${this.automaticForm.source_cluster_id}`
              ? callback(new Error('来源和映射集群不能相同'))
              : callback(),
            trigger: 'change'
          }
        ],
        destination_port: [{ required: true, message: '请输入映射端口', trigger: 'change' }],
        protocol: [{ required: true, message: '请选择网络协议', trigger: 'change' }],
        bandwidth_limit: [
          { pattern: /^$|^[1-9][0-9]*(KB|MB|GB)$/i, message: '请输入 KB、MB 或 GB，例如 2MB', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    breadcrumb () {
      return [...routeBreadcrumb(this), { title: '网络穿透', to: '' }]
    },
    clusterGroups () {
      return [
        { type: 'docker_swarm', label: 'Docker Swarm', items: this.clusters.filter(item => item.orchestrator_type === 'docker_swarm') },
        { type: 'kubernetes', label: 'Kubernetes', items: this.clusters.filter(item => item.orchestrator_type === 'kubernetes') }
      ].filter(group => group.items.length)
    },
    externalServers () {
      return this.servers.filter(item => item.deployment_mode === 'external')
    },
    isExternalDestination () {
      return String(this.automaticForm.destination_target || '').startsWith('server:')
    },
    isPortRule () {
      return ['tcp', 'udp'].includes(this.ruleForm.type)
    },
    sourceServiceGroups () {
      const groups = {}
      this.sourceServices.forEach(service => {
        const namespace = service.namespace || ''
        if (!groups[namespace]) {
          groups[namespace] = {
            namespace,
            label: namespace || 'Docker Swarm Services',
            items: []
          }
        }
        groups[namespace].items.push(service)
      })
      return Object.values(groups)
    },
    tunnelRows () {
      const rows = []
      this.servers.forEach(server => {
        ;(server.clients || []).forEach(client => {
          ;(client.tunnels || []).forEach(tunnel => rows.push({ server, client, tunnel }))
        })
      })
      return rows
    }
  },
  created () {
    this.load()
  },
  methods: {
    load () {
      this.loading = true
      return networkTunnelTopology(this.orgId).then(res => {
        this.servers = res.data.servers || []
        this.clusters = res.data.clusters || []
        this.defaults = res.data.defaults || {}
      }).finally(() => { this.loading = false })
    },
    openServer (server = null) {
      this.serverForm = server
        ? {
            server_id: server.id,
            title: server.title,
            deployment_mode: server.deployment_mode || 'managed',
            cluster_id: server.cluster_id,
            advertise_host: server.advertise_host,
            bind_port: server.bind_port,
            vhost_http_port: server.vhost_http_port,
            vhost_https_port: server.vhost_https_port,
            dashboard_port: server.dashboard_port || 0,
            dashboard_user: server.dashboard_user || '',
            dashboard_password: '',
            dashboard_password_configured: !!server.dashboard_password_configured,
            image: server.image,
            namespace: server.namespace,
            auth_token: ''
          }
        : serverBlank()
      this.serverVisible = true
      this.$nextTick(() => this.$refs.serverForm && this.$refs.serverForm.clearValidate())
    },
    openClient (server, client = null) {
      this.clientForm = client
        ? {
            client_id: client.id,
            server_id: server.id,
            title: client.title,
            deployment_mode: client.deployment_mode || 'managed',
            cluster_id: client.cluster_id,
            frp_user: client.frp_user,
            image: client.image,
            namespace: client.namespace
          }
        : { ...clientBlank(), server_id: server.id }
      this.clientVisible = true
      this.$nextTick(() => this.$refs.clientForm && this.$refs.clientForm.clearValidate())
    },
    openRule (client, tunnel = null) {
      this.ruleForm = tunnel
        ? {
            tunnel_id: tunnel.id,
            client_id: client.id,
            title: tunnel.title,
            proxy_name: tunnel.proxy_name,
            type: tunnel.type,
            local_host: tunnel.local_host,
            local_port: tunnel.local_port,
            remote_port: tunnel.remote_port,
            custom_domains_text: (tunnel.custom_domains || []).join('\n'),
            locations_text: (tunnel.locations || []).join(','),
            host_header_rewrite: tunnel.host_header_rewrite,
            transport_encryption: tunnel.transport_encryption,
            transport_compression: tunnel.transport_compression,
            bandwidth_limit: tunnel.bandwidth_limit,
            enabled: tunnel.enabled
          }
        : { ...ruleBlank(), client_id: client.id }
      this.ruleVisible = true
      this.$nextTick(() => this.$refs.ruleForm && this.$refs.ruleForm.clearValidate())
    },
    openAutomaticRule (server = null, client = null, tunnel = null) {
      this.automaticForm = tunnel
        ? {
            tunnel_id: tunnel.id,
            title: tunnel.title || '',
            source_cluster_id: client.cluster_id,
            source_service_ref: tunnel.source_service_ref || '',
            source_service_name: tunnel.source_service_name || '',
            source_service_namespace: tunnel.source_service_namespace || '',
            source_port: tunnel.local_port,
            destination_target: server.deployment_mode === 'external'
              ? `server:${server.id}`
              : `cluster:${server.cluster_id}`,
            destination_cluster_id: server.cluster_id,
            destination_server_id: server.deployment_mode === 'external' ? server.id : null,
            destination_port: tunnel.remote_port,
            protocol: tunnel.type || 'tcp',
            frps_bind_port: server.bind_port || 7000,
            frps_dashboard_port: Number.isInteger(server.dashboard_port) ? server.dashboard_port : 7500,
            use_encryption: tunnel.transport_encryption !== false,
            use_compression: tunnel.transport_compression !== false,
            pool_count: client.transport_pool_count || 5,
            bandwidth_limit: tunnel.bandwidth_limit || '2MB'
          }
        : automaticBlank()
      this.automaticAdvanced = []
      this.sourceServices = []
      this.automaticVisible = true
      const load = this.automaticForm.source_cluster_id
        ? this.loadSourceServices(this.automaticForm.source_cluster_id)
        : Promise.resolve()
      load.finally(() => {
        this.$nextTick(() => this.$refs.automaticForm && this.$refs.automaticForm.clearValidate())
      })
    },
    sourceClusterChanged (clusterId) {
      this.automaticForm.source_service_ref = ''
      this.automaticForm.source_service_name = ''
      this.automaticForm.source_service_namespace = ''
      this.sourceServices = []
      if (this.automaticForm.destination_target === `cluster:${clusterId}`) {
        this.automaticForm.destination_target = ''
        this.automaticForm.destination_cluster_id = null
      }
      if (clusterId) this.loadSourceServices(clusterId)
    },
    destinationTargetChanged (target) {
      const [type, rawId] = String(target || '').split(':')
      const id = Number(rawId) || null
      this.automaticForm.destination_cluster_id = type === 'cluster' ? id : null
      this.automaticForm.destination_server_id = type === 'server' ? id : null
      const server = type === 'server'
        ? this.servers.find(item => item.id === id && item.deployment_mode === 'external')
        : this.servers.find(item => item.cluster_id === id && item.deployment_mode === 'managed')
      this.automaticForm.frps_bind_port = server ? server.bind_port : (this.defaults.bind_port || 7000)
      this.automaticForm.frps_dashboard_port = server ? server.dashboard_port : (this.defaults.dashboard_port || 7500)
    },
    loadSourceServices (clusterId) {
      this.serviceLoading = true
      return networkTunnelSourceServices(this.orgId, clusterId).then(res => {
        this.sourceServices = res.data.services || []
      }).finally(() => { this.serviceLoading = false })
    },
    sourceServiceChanged (reference) {
      const service = this.sourceServices.find(item => item.ref === reference)
      if (!service) return
      this.automaticForm.source_service_name = service.name
      this.automaticForm.source_service_namespace = service.namespace || ''
      if (service.ports && service.ports.length === 1) {
        this.automaticForm.source_port = service.ports[0]
      }
    },
    saveAutomaticRule () {
      this.$refs.automaticForm.validate(valid => {
        if (!valid) return
        this.saving = true
        networkTunnelAutomaticRuleSave(this.orgId, this.automaticForm).then(() => {
          this.automaticVisible = false
          this.$message.success('网络穿透规则已保存并部署完成')
          return this.load()
        }).finally(() => { this.saving = false })
      })
    },
    saveServer () {
      this.$refs.serverForm.validate(valid => {
        if (!valid) return
        this.saving = true
        const action = this.serverForm.server_id ? networkTunnelServerUpdate : networkTunnelServerCreate
        action(this.orgId, this.serverForm).then(() => {
          this.serverVisible = false
          this.$message.success('FRP 服务端已保存，请同步到集群')
          return this.load()
        }).finally(() => { this.saving = false })
      })
    },
    saveClient () {
      this.$refs.clientForm.validate(valid => {
        if (!valid) return
        this.saving = true
        const action = this.clientForm.client_id ? networkTunnelClientUpdate : networkTunnelClientCreate
        action(this.orgId, this.clientForm).then(() => {
          this.clientVisible = false
          this.$message.success('FRP 客户端已保存，请同步到集群')
          return this.load()
        }).finally(() => { this.saving = false })
      })
    },
    saveRule () {
      this.$refs.ruleForm.validate(valid => {
        if (!valid) return
        const data = {
          ...this.ruleForm,
          custom_domains: this.splitValues(this.ruleForm.custom_domains_text),
          locations: this.splitValues(this.ruleForm.locations_text)
        }
        delete data.custom_domains_text
        delete data.locations_text
        this.saving = true
        networkTunnelRuleSave(this.orgId, data).then(() => {
          this.ruleVisible = false
          this.$message.success('穿透规则已保存并同步完成')
          return this.load()
        }).finally(() => { this.saving = false })
      })
    },
    toggleRule (server, client, tunnel, enabled) {
      if (tunnel.source_service_ref) {
        networkTunnelAutomaticRuleSave(this.orgId, {
          tunnel_id: tunnel.id,
          title: tunnel.title,
          source_cluster_id: client.cluster_id,
          source_service_ref: tunnel.source_service_ref,
          source_service_name: tunnel.source_service_name,
          source_service_namespace: tunnel.source_service_namespace,
          source_port: tunnel.local_port,
          destination_cluster_id: server.cluster_id,
          destination_server_id: server.deployment_mode === 'external' ? server.id : null,
          destination_port: tunnel.remote_port,
          protocol: tunnel.type,
          frps_bind_port: server.bind_port,
          frps_dashboard_port: server.dashboard_port,
          use_encryption: tunnel.transport_encryption,
          use_compression: tunnel.transport_compression,
          pool_count: client.transport_pool_count || 5,
          bandwidth_limit: tunnel.bandwidth_limit,
          enabled
        }).then(() => this.load())
        return
      }
      networkTunnelRuleSave(this.orgId, {
        ...tunnel, tunnel_id: tunnel.id, client_id: client.id, enabled
      }).then(() => this.load())
    },
    syncServer (server) {
      this.syncingId = server.id
      networkTunnelSync(this.orgId, server.id).then(() => {
        this.$message.success(server.deployment_mode === 'external' ? '托管的 FRPC 已同步到集群' : 'FRPS、FRPC 与全部规则已同步到集群')
        return this.load()
      }).finally(() => { this.syncingId = null })
    },
    syncAll () {
      this.syncingAll = true
      networkTunnelSyncAll(this.orgId).then(res => {
        const results = res.data.results || []
        const failed = results.filter(item => item.status === 'error')
        if (failed.length) {
          this.$message.warning(`同步完成，${failed.length} 个 FRP 服务存在异常`)
        } else {
          this.$message.success('全部网络穿透资源已恢复并同步')
        }
        return this.load()
      }).finally(() => { this.syncingAll = false })
    },
    handleMoreCommand (command) {
      if (command === 'sync') {
        this.syncAll()
      } else if (command === 'server') {
        this.openServer()
      } else if (command === 'resources') {
        this.resourceVisible = true
      }
    },
    editTunnelRow (row) {
      if (row.tunnel.source_service_ref) {
        this.openAutomaticRule(row.server, row.client, row.tunnel)
      } else {
        this.openRule(row.client, row.tunnel)
      }
    },
    serverTunnelCount (server) {
      return (server.clients || []).reduce((total, client) => total + (client.tunnels || []).length, 0)
    },
    rowStatusLabel (row) {
      if (!row.tunnel.enabled) return '已停用'
      if (row.server.runtime_status === 'error' || row.client.runtime_status === 'error') return '异常'
      if (['running', 'external'].includes(row.server.runtime_status) && row.client.runtime_status === 'running') return '运行中'
      return '待同步'
    },
    rowStatusType (row) {
      return { 运行中: 'success', 异常: 'danger', 待同步: 'warning' }[this.rowStatusLabel(row)] || 'info'
    },
    removeServer (server) {
      this.$confirm(`将删除「${server.title}」以及全部 FRPC 和穿透规则，并移除集群运行资源。`, '删除 FRP 服务端', { type: 'warning' })
        .then(() => networkTunnelServerDelete(this.orgId, server.id))
        .then(() => this.load())
        .catch(() => {})
    },
    removeClient (client) {
      this.$confirm(`将删除 FRPC「${client.title}」及其全部规则。`, '删除客户端', { type: 'warning' })
        .then(() => networkTunnelClientDelete(this.orgId, client.id))
        .then(() => this.load())
        .catch(() => {})
    },
    removeRule (tunnel) {
      this.$confirm(`确认删除规则「${tunnel.title}」？`, '删除穿透规则', { type: 'warning' })
        .then(() => networkTunnelRuleDelete(this.orgId, tunnel.id))
        .then(() => this.load())
        .catch(() => {})
    },
    splitValues (value) {
      return String(value || '').split(/[\n,]/).map(item => item.trim()).filter(Boolean)
    },
    publicEndpoint (server, tunnel) {
      if (['tcp', 'udp'].includes(tunnel.type)) return `${server.advertise_host}:${tunnel.remote_port}`
      return (tunnel.custom_domains || []).join(', ') || '未设置域名'
    },
    ingressPort (server, tunnel) {
      if (tunnel.type === 'http') return server.vhost_http_port || '未设置'
      if (tunnel.type === 'https') return server.vhost_https_port || '未设置'
      return tunnel.remote_port
    },
    openDashboard (server) {
      const host = String(server.advertise_host || '').includes(':')
        ? `[${server.advertise_host}]`
        : server.advertise_host
      window.open(`http://${host}:${server.dashboard_port}`, '_blank', 'noopener,noreferrer')
    },
    orchestratorLabel (type) {
      return type === 'kubernetes' ? 'Kubernetes' : 'Docker Swarm'
    },
    resourceLocation (resource) {
      return resource.deployment_mode === 'external'
        ? '外部资源'
        : `${this.orchestratorLabel(resource.orchestrator_type)} · ${resource.cluster_title || '-'}`
    },
    runtimeRoute (resource) {
      if (resource.deployment_mode === 'external' || !resource.cluster_id || !resource.runtime_ref) return null
      if (resource.orchestrator_type === 'docker_swarm') {
        return {
          name: 'ClusterSwarmServiceDetail',
          params: { clusterId: resource.cluster_id, serviceId: resource.runtime_ref }
        }
      }
      if (resource.orchestrator_type === 'kubernetes') {
        return {
          name: 'ClusterK8sDeployments',
          params: { clusterId: resource.cluster_id },
          query: { namespace: resource.namespace, name: resource.runtime_name }
        }
      }
      return null
    },
    statusLabel (status) {
      return {
        not_deployed: '未部署',
        deploying: '部署中',
        running: '运行中',
        pending_sync: '待同步',
        external: '外部资源',
        error: '异常'
      }[status] || status || '未知'
    },
    statusType (status) {
      return { running: 'success', pending_sync: 'warning', error: 'danger', deploying: 'primary' }[status] || 'info'
    }
  }
}
</script>

<style lang="scss" scoped>
.content {
  padding: 20px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 0;
}
.toolbar-spacer { flex: 1; }
.endpoint-title {
  color: #303133;
  font-weight: 500;
  line-height: 22px;
  overflow-wrap: anywhere;
}
.secondary {
  margin-top: 3px;
  color: #909399;
  font-size: 12px;
  line-height: 18px;
}
.flow-direction {
  color: #409eff;
  font-size: 20px;
}
.advanced-options {
  margin-top: 8px;
  border-top: 1px solid #ebeef5;
}
.advanced-title {
  color: #606266;
  font-weight: 500;
}
.advanced-title i { margin-right: 6px; }
.shared-option-help {
  margin: -8px 0 18px 120px;
  color: #909399;
  font-size: 12px;
  line-height: 18px;
}
.port-row { margin-bottom: -2px; }
.section-help { margin: -10px 0 18px 130px; color: #909399; font-size: 12px; line-height: 1.5; }
.danger-action { color: #f56c6c; }
.full-control { width: 100%; }
.form-help { color: #909399; font-size: 12px; line-height: 20px; }
.automatic-alert { margin-bottom: 18px; }
.inline-help { margin-left: 10px; color: #909399; font-size: 12px; }
.service-option-ports { float: right; margin-left: 20px; color: #909399; font-size: 12px; }
</style>
