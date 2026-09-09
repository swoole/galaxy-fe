<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <el-card shadow="never" class="deploy-card">
      <div slot="header" class="page-header">
        <div>
          <h3>项目发布</h3>
          <p>将不可变镜像制品发布为 Docker Swarm Service 或 Kubernetes Deployment，并跟踪每次变更</p>
        </div>
        <el-button
          v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role)"
          type="primary"
          size="small"
          icon="el-icon-plus"
          @click="openCreate()">新建发布</el-button>
      </div>

      <div class="filter-bar">
        <div class="filters">
          <el-select v-model="filters.env_id" clearable size="small" placeholder="全部环境" @change="search">
            <el-option v-for="item in options.environments" :key="item.id" :label="`${item.title}${item.archived_at ? '（已归档）' : ''}`" :value="item.id" />
          </el-select>
          <el-select v-model="filters.cluster_id" clearable size="small" placeholder="全部集群" @change="search">
            <el-option v-for="item in options.clusters" :key="item.id" :label="clusterOptionLabel(item)" :value="item.id" />
          </el-select>
          <el-select v-model="filters.status" clearable size="small" placeholder="全部状态" @change="search">
            <el-option v-for="(item, key) in statuses" :key="key" :label="item.label" :value="key" />
          </el-select>
        </div>
        <span class="result-count">共 {{ total }} 条发布记录</span>
      </div>

      <el-table v-loading="loading" :data="rows" fit class="deploy-table" empty-text="暂无发布记录">
        <el-table-column label="发布" width="135">
          <template #default="{ row }">
            <el-link class="release-id" type="primary" :underline="false" @click="showDetail(row)">#{{ row.id }}</el-link>
            <div class="release-version" :title="row.version">{{ row.version || '-' }}</div>
            <div class="cell-sub">{{ operationLabel(row.operation) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="实例" min-width="180">
          <template #default="{ row }">
            <div class="service-name"><i class="el-icon-cpu" /> {{ row.desired_spec.instance_name || row.desired_spec.service_name }}</div>
            <div class="cell-sub">{{ row.env ? row.env.title : `环境 #${row.env_id}` }} · {{ row.cluster ? row.cluster.title : `集群 #${row.cluster_id}` }}</div>
            <el-tag class="workload-tag" :type="workloadTagType(row)" size="mini" effect="plain">{{ workloadTypeLabel(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="镜像 Tag" min-width="180">
          <template #default="{ row }">
            <image-reference
              v-if="row.artifact"
              :value="row.artifact.reference"
              :digest="row.artifact.digest || ''"
              :size="row.artifact.size || 0"
              :created-at="row.artifact.created_at || 0"
              clickable
              compact
              @click="showImage(row.artifact)" />
            <span v-else class="text-danger">制品已删除</span>
          </template>
        </el-table-column>
        <el-table-column label="副本" width="130">
          <template #default="{ row }">
            <template v-if="row.runtime">
              <div class="replica-line"><strong>{{ row.runtime.running_count }}</strong><span>/ {{ row.runtime.desired_count }}</span></div>
              <el-progress :percentage="replicaPercent(row.runtime)" :show-text="false" :stroke-width="4" :status="replicaProgressStatus(row.runtime)" />
            </template>
            <span v-else class="cell-sub">尚未创建</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }"><el-tag :type="statusOf(row.status).type" size="small">{{ statusOf(row.status).label }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column label="创建时间" width="158">
          <template #default="{ row }"><span class="date-text">{{ row.created_at | formatDate }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="145" align="right" fixed="right">
          <template #default="{ row }">
            <el-link type="primary" @click="showDetail(row)">详情</el-link>
            <template v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role) && canRollback(row)">
              <el-divider direction="vertical" />
              <el-link type="warning" @click="rollback(row)">回滚至此</el-link>
            </template>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" :total="total" :page.sync="page" :limit.sync="pageSize" @pagination="load" />
    </el-card>

    <el-dialog
      class="deploy-create-dialog"
      :title="releaseDialogTitle"
      :visible.sync="createVisible"
      width="920px"
      top="4vh"
      :close-on-click-modal="false"
      @closed="resetForm">
      <el-form ref="releaseForm" :model="form" :rules="rules" label-width="105px" class="release-form">
        <div class="form-section-title"><span>发布目标</span><small>选择环境、集群和不可变镜像制品</small></div>
        <el-row :gutter="18">
          <el-col :span="12"><el-form-item label="环境" prop="env_id">
            <el-select v-model="form.env_id" style="width: 100%" placeholder="请选择环境" @change="ensureCluster">
              <el-option
                v-for="item in options.environments"
                :key="item.id"
                :label="environmentOptionLabel(item)"
                :value="item.id"
                :disabled="!item.deployable" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="目标集群" prop="cluster_id">
            <el-select v-model="form.cluster_id" style="width: 100%" placeholder="请选择集群" @change="loadNetworks">
              <el-option v-for="item in availableClusters" :key="item.id" :label="clusterOptionLabel(item)" :value="item.id" />
            </el-select>
          </el-form-item></el-col>
        </el-row>
        <el-alert
          v-if="selectedCluster"
          class="workload-target-alert"
          :title="`本次发布的主工作负载：${workloadTypeLabel(selectedCluster)}`"
          :description="isKubernetes ? '配置容器端口时会附带创建同名 ClusterIP Service；Service 和 Ingress 属于网络暴露资源。' : 'Task 和容器是该 Service 的运行副本，不作为独立项目实例。'"
          type="info"
          :closable="false"
          show-icon />
        <el-form-item label="镜像制品" prop="artifact_id">
          <el-select v-model="form.artifact_id" filterable style="width: 100%" placeholder="请选择成功构建的镜像制品" @change="applyArtifactDefaults">
            <el-option v-for="item in options.artifacts" :key="item.id" :label="artifactOptionLabel(item)" :value="item.id">
              <span class="artifact-option-main">#{{ item.id }}</span>
              <image-reference
                :value="item.reference"
                :digest="item.digest || ''"
                :size="item.size || 0"
                :created-at="item.created_at || 0"
                compact />
            </el-option>
          </el-select>
        </el-form-item>
        <el-row :gutter="18">
          <el-col :span="8"><el-form-item label="实例名称" prop="instance_name">
            <el-input v-model.trim="form.instance_name" maxlength="128" placeholder="例如 开发环境 Web" />
            <div class="form-help">项目内唯一，仅用于界面展示，不会作为 Service、Deployment 或 Pod 名称。</div>
          </el-form-item></el-col>
          <el-col :span="8"><el-form-item label="发布版本" prop="version">
            <el-input v-model.trim="form.version" maxlength="128" placeholder="例如 v1.2.0" />
          </el-form-item></el-col>
          <el-col :span="8"><el-form-item label="副本数" prop="replicas">
            <el-input-number v-model="form.replicas" :min="0" :max="100" style="width: 100%" />
          </el-form-item></el-col>
        </el-row>

        <el-tabs v-model="activeTab" class="config-tabs">
          <el-tab-pane label="1. 网络与端口" name="network">
            <el-alert
              v-if="isKubernetes"
              class="network-priority-alert"
              title="Kubernetes 将根据端口创建 ClusterIP Service；发布完成后可在实例列表中配置 Ingress 路由。"
              type="info"
              :closable="false"
              show-icon />
            <el-alert
              v-else
              class="network-priority-alert"
              title="请优先确认 Service 网络和容器监听端口；Traefik 等网关需要通过共享的 Overlay 网络访问容器端口。只有需要从集群外直接访问时，才需要设置发布端口。"
              type="warning"
              :closable="false"
              show-icon />
            <el-form-item v-if="!isKubernetes" label="容器网络">
              <div class="network-select-row">
                <el-select
                  v-model="form.networks"
                  multiple
                  filterable
                  style="width: 100%"
                  placeholder="请选择已有网络">
                  <el-option v-for="item in networks" :key="item.id" :label="`${item.name} (${item.driver}/${item.scope})`" :value="item.id || item.name" />
                </el-select>
                <el-button icon="el-icon-plus" :disabled="!form.cluster_id" @click="openNetworkCreate">创建新网络</el-button>
              </div>
              <div class="field-tip">Web Service 通常应选择与网关共享的 Overlay 网络；无网络需求的 Worker 可留空。</div>
            </el-form-item>
            <div class="port-heading">
              <span>容器端口</span><span>发布端口</span><span>协议</span><span>发布模式</span><span></span>
            </div>
            <div v-for="(item, index) in form.ports" :key="`port-${index}`" class="array-row">
              <el-input-number v-model="item.target" :min="1" :max="65535" placeholder="容器端口" />
              <el-input-number v-model="item.published" :min="0" :max="65535" placeholder="发布端口" />
              <el-select v-model="item.protocol"><el-option label="TCP" value="tcp" /><el-option label="UDP" value="udp" /></el-select>
              <el-select v-model="item.mode"><el-option label="Ingress" value="ingress" /><el-option label="Host" value="host" /></el-select>
              <el-button icon="el-icon-delete" @click="form.ports.splice(index, 1)" />
            </div>
            <el-empty v-if="!form.ports.length" :image-size="52" description="该镜像没有可用的默认端口，请手动添加" />
            <el-button size="mini" icon="el-icon-plus" @click="addPort">添加端口</el-button>
            <div v-if="form.ports.length" class="field-tip">
              初始容器端口来自镜像的构建模板或项目设置；
              {{ isKubernetes ? 'Service 端口为 0 时使用容器端口。' : '发布端口为 0 时由 Swarm 自动分配，您可以直接修改。' }}
            </div>
          </el-tab-pane>

          <el-tab-pane label="2. 资源与更新" name="resources">
            <resource-config-editor v-model="deploymentResources" />
            <el-row :gutter="18">
              <el-col :span="8"><el-form-item label="更新并发"><el-input-number v-model="form.parallelism" :min="1" :max="100" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="更新顺序"><el-select v-model="form.update_order"><el-option label="先停止旧任务" value="stop-first" /><el-option label="先启动新任务" value="start-first" /></el-select></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="失败策略"><el-select v-model="form.failure_action"><el-option label="暂停" value="pause" /><el-option label="自动回滚" value="rollback" /><el-option label="继续" value="continue" /></el-select></el-form-item></el-col>
            </el-row>
            <el-form-item label="启动命令"><el-input v-model="form.command" placeholder="每行一个参数；留空使用镜像默认命令" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="启动参数"><el-input v-model="form.args" placeholder="每行一个参数" type="textarea" :rows="2" /></el-form-item>
          </el-tab-pane>

          <el-tab-pane label="3. 持久化存储" name="storage">
            <el-alert
              v-if="isKubernetes"
              title="Kubernetes PVC/StorageClass 映射尚未开放，本次发布不支持 Docker Volume、Bind 或 Tmpfs。"
              type="info"
              :closable="false"
              show-icon />
            <template v-else>
              <el-alert
                title="Bind Mount 由集群管理员自行授权，平台不会拦截。挂载 Docker/containerd socket 或 /etc、/proc、/sys、/dev、/run 等路径等同于向容器授予宿主机高级权限，请仅用于 Portainer 等确有需要且可信的镜像。"
                type="warning"
                :closable="false" />
              <el-alert
                v-if="dangerousBindMounts.length"
                :title="`检测到 ${dangerousBindMounts.length} 个高风险 Bind：${dangerousBindMounts.join('、')}`"
                type="error"
                :closable="false"
                show-icon />
              <div v-for="(item, index) in form.mounts" :key="`mount-${index}`" class="array-row mount-row">
                <el-select v-model="item.type"><el-option label="Volume" value="volume" /><el-option label="Bind" value="bind" /><el-option label="Tmpfs" value="tmpfs" /></el-select>
                <el-input v-model.trim="item.source" :disabled="item.type === 'tmpfs'" placeholder="Volume 名称或主机绝对路径" />
                <el-input v-model.trim="item.target" placeholder="容器路径，如 /data" />
                <el-checkbox v-model="item.readonly">只读</el-checkbox>
                <el-button icon="el-icon-delete" @click="form.mounts.splice(index, 1)" />
              </div>
              <el-button size="mini" icon="el-icon-plus" @click="form.mounts.push(newMount())">添加目录映射</el-button>
            </template>
          </el-tab-pane>

          <el-tab-pane label="4. 配置与 Secret" name="config">
            <el-alert
              :title="`本次发布会自动继承项目配置中心的 ${inheritedCounts.env} 个环境变量、${inheritedCounts.config} 个 Config、${inheritedCounts.secret} 个 Secret，并冻结快照。下面仅填写本次发布需要新增或覆盖的同名配置。`"
              type="info"
              :closable="false" />
            <h4>环境变量覆盖</h4>
            <div v-for="(item, index) in form.env" :key="`env-${index}`" class="array-row config-row">
              <el-input v-model.trim="item.name" placeholder="变量名" />
              <el-input v-model="item.value" placeholder="值" />
              <el-button icon="el-icon-delete" @click="form.env.splice(index, 1)" />
            </div>
            <el-button size="mini" icon="el-icon-plus" @click="form.env.push({ name: '', value: '' })">添加普通配置</el-button>
            <h4>配置文件覆盖</h4>
            <div v-for="(item, index) in form.configs" :key="`file-${index}`" class="array-row file-row">
              <el-input v-model.trim="item.name" placeholder="Config 名称" />
              <el-input v-model.trim="item.target" placeholder="绝对路径，如 /etc/project/config.yml" />
              <el-input v-model="item.value" type="textarea" :rows="2" maxlength="512000" placeholder="文件内容" />
              <el-button icon="el-icon-delete" @click="form.configs.splice(index, 1)" />
            </div>
            <el-button :disabled="form.configs.length >= 64" size="mini" icon="el-icon-plus" @click="form.configs.push({ name: '', value: '', target: '', file_mode: 292 })">添加配置文件覆盖</el-button>
            <h4>Secret 覆盖</h4>
            <div v-for="(item, index) in form.secrets" :key="`secret-${index}`" class="array-row secret-row">
              <el-input v-model.trim="item.name" placeholder="Secret 名称" />
              <el-input v-model="item.value" type="password" show-password maxlength="512000" placeholder="Secret 值（最大 500 KiB）" />
              <el-input v-model.trim="item.target" placeholder="挂载文件名" />
              <el-button icon="el-icon-delete" @click="form.secrets.splice(index, 1)" />
            </div>
            <el-button :disabled="form.secrets.length >= 64" size="mini" icon="el-icon-plus" @click="form.secrets.push({ name: '', value: '', target: '', file_mode: 288 })">添加 Secret 覆盖</el-button>
          </el-tab-pane>
        </el-tabs>
        <el-form-item label="发布备注" prop="remark" class="release-remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            maxlength="500"
            show-word-limit
            placeholder="说明本次发布的目的或变更内容" />
        </el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="createVisible = false">取消</el-button><el-button type="primary" icon="el-icon-upload2" :loading="submitting" @click="submit">开始发布</el-button></span>
    </el-dialog>

    <el-dialog
      title="创建项目网络"
      :visible.sync="networkCreateVisible"
      width="520px"
      append-to-body
      :close-on-click-modal="false"
      @closed="networkName = ''">
      <el-alert title="将创建可供 Swarm Service 使用的 Attachable Overlay 网络，并自动标记为当前项目资源。" type="info" :closable="false" show-icon />
      <el-form label-width="95px" class="network-create-form" @submit.native.prevent>
        <el-form-item label="网络名称" required>
          <el-input v-model.trim="networkName" maxlength="40" show-word-limit placeholder="例如 backend 或 web" @keyup.enter.native="createNetwork" />
          <div v-if="networkName" class="field-tip">实际名称：galaxy-p{{ projectId }}-{{ networkName.toLowerCase() }}</div>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="networkCreateVisible = false">取消</el-button>
        <el-button type="primary" :loading="networkCreating" @click="createNetwork">创建并选择</el-button>
      </span>
    </el-dialog>

    <el-drawer title="发布详情" :visible.sync="detailVisible" size="48%" custom-class="release-detail-drawer">
      <div v-if="detail.id" class="detail">
        <el-alert v-if="detail.error" :title="detail.error" type="error" :closable="false" show-icon />
        <el-descriptions :column="2" border>
          <el-descriptions-item label="发布 ID">#{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="发布版本">{{ detail.version || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusOf(detail.status).label }}</el-descriptions-item>
          <el-descriptions-item label="主工作负载">
            <el-tag :type="workloadTagType(detail)" size="small" effect="plain">{{ workloadTypeLabel(detail) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="资源名称"><span class="mono">{{ workloadResourceName(detail) }}</span></el-descriptions-item>
          <el-descriptions-item label="Namespace">{{ workloadNamespace(detail) }}</el-descriptions-item>
          <el-descriptions-item label="资源引用" :span="2"><span class="mono">{{ detail.runtime_ref || '-' }}</span></el-descriptions-item>
          <el-descriptions-item label="执行耗时">{{ duration(detail) }}</el-descriptions-item>
        </el-descriptions>
        <h4>期望配置（不包含 Secret 明文）</h4>
        <pre>{{ pretty(detail.desired_spec) }}</pre>
        <h4>执行结果</h4>
        <pre>{{ pretty(detail.result) }}</pre>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import Pagination from '@/components/Pagination'
import ResourceConfigEditor from '@/views/components/ResourceConfigEditor'
import { releaseCreate, releaseNetworkCreate, releaseOptions, releaseProfile, releaseRollback, releases } from '@/api/project'
import { formatDate } from '@/utils/filters'
import { routeBreadcrumb } from '@/utils/helpers'

const STATUSES = {
  pending: { label: '等待执行', type: 'info' },
  deploying: { label: '发布中', type: 'warning' },
  succeeded: { label: '成功', type: 'success' },
  failed: { label: '失败', type: 'danger' },
  'rolled-back': { label: '已回滚', type: 'info' }
}
const newPort = (target = 80, published = 0) => ({ target, published, protocol: 'tcp', mode: 'ingress' })
const newMount = () => ({ type: 'volume', source: '', target: '/data', readonly: false })
const emptyForm = () => ({
  env_id: null,
  cluster_id: null,
  artifact_id: null,
  instance_name: 'Web',
  version: '',
  replicas: 1,
  cpu_limit: 1,
  memory_limit: 512,
  cpu_reservation: 0.1,
  memory_reservation: 128,
  parallelism: 1,
  update_order: 'stop-first',
  failure_action: 'rollback',
  command: '',
  args: '',
  networks: [],
  ports: [],
  mounts: [],
  env: [],
  configs: [],
  secrets: [],
  remark: ''
})

export default {
  name: 'ProjectDeploy',
  components: { Breadcrumb, Pagination, ResourceConfigEditor },
  filters: { formatDate },
  props: {
    project: { type: Object, default: null },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return {
      statuses: STATUSES,
      rows: [],
      total: 0,
      page: 1,
      pageSize: 20,
      loading: false,
      filters: { env_id: null, cluster_id: null, status: null },
      options: { environments: [], clusters: [], environment_clusters: [], artifacts: [], project_configurations: [] },
      networks: [],
      suggestedPublishedPort: 0,
      createVisible: false,
      detailVisible: false,
      detail: {},
      submitting: false,
      networkCreateVisible: false,
      networkCreating: false,
      networkName: '',
      activeTab: 'network',
      form: emptyForm(),
      refreshTimer: null,
      rules: {
        env_id: [{ required: true, message: '请选择环境', trigger: 'change' }],
        cluster_id: [{ required: true, message: '请选择集群', trigger: 'change' }],
        artifact_id: [{ required: true, message: '请选择镜像制品', trigger: 'change' }],
        instance_name: [
          { required: true, message: '请输入实例名称', trigger: 'blur' },
          { max: 128, message: '实例名称不能超过 128 个字符', trigger: 'blur' }
        ],
        version: [
          { required: true, message: '请输入发布版本', trigger: 'blur' },
          { pattern: /^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/, message: '版本只能包含字母、数字、点号、下划线、加号和连字符', trigger: 'blur' }
        ],
        remark: [{ required: true, message: '请输入发布备注', trigger: 'blur' }]
      }
    }
  },
  computed: {
    breadcrumb () { return [...routeBreadcrumb(this), { title: '部署', to: '' }, { title: '项目发布', to: '' }] },
    deploymentResources: {
      get () {
        return {
          cpu_limit: this.form.cpu_limit,
          memory_limit: this.form.memory_limit,
          cpu_reservation: this.form.cpu_reservation,
          memory_reservation: this.form.memory_reservation
        }
      },
      set (resources) {
        this.form.cpu_limit = resources.cpu_limit
        this.form.memory_limit = resources.memory_limit
        this.form.cpu_reservation = resources.cpu_reservation
        this.form.memory_reservation = resources.memory_reservation
      }
    },
    availableClusters () {
      if (!this.form.env_id) return this.options.clusters
      const ids = this.options.environment_clusters.filter(item => Number(item.env_id) === Number(this.form.env_id)).map(item => Number(item.cluster_id))
      return this.options.clusters.filter(item => ids.includes(Number(item.id)))
    },
    selectedCluster () {
      return this.options.clusters.find(item => Number(item.id) === Number(this.form.cluster_id)) || null
    },
    isKubernetes () {
      return Boolean(this.selectedCluster && this.selectedCluster.orchestrator_type === 'kubernetes')
    },
    releaseDialogTitle () {
      return this.isKubernetes ? '发布到 Kubernetes' : '发布到 Docker Swarm'
    },
    dangerousBindMounts () {
      return this.form.mounts.filter(item => item.type === 'bind' && this.isDangerousBind(item.source)).map(item => item.source)
    },
    bindMounts () {
      return this.form.mounts.filter(item => item.type === 'bind').map(item => item.source).filter(Boolean)
    },
    inheritedCounts () {
      const envId = Number(this.form.env_id || 0)
      const scoped = (this.options.project_configurations || [])
        .filter(item => Number(item.env_id || 0) === 0 || Number(item.env_id) === envId)
      return ['env', 'config', 'secret'].reduce((result, kind) => {
        const effective = new Map()
        scoped.filter(item => item.kind === kind).forEach(item => effective.set(item.name, item))
        result[kind] = effective.size
        return result
      }, {})
    }
  },
  created () {
    releaseOptions(this.orgId, this.groupId, this.projectId).then(res => {
      this.options = res.data
      const artifactId = Number(this.$route.query.artifact || 0)
      if (artifactId) this.$nextTick(() => this.openCreate(artifactId))
    })
    this.load()
  },
  beforeDestroy () { this.clearRefresh() },
  methods: {
    newPort,
    newMount,
    load () {
      this.loading = true
      this.clearRefresh()
      return releases(this.orgId, this.groupId, this.projectId, this.filters.env_id, this.filters.cluster_id, this.filters.status, this.page, this.pageSize).then(res => {
        this.rows = res.data.data || []
        this.total = Number(res.data.total || 0)
        this.page = Number(res.data.page || 1)
        this.pageSize = Number(res.data.pagesize || this.pageSize)
        if (this.rows.some(row => ['pending', 'deploying'].includes(row.status))) this.refreshTimer = setTimeout(this.load, 4000)
      }).finally(() => { this.loading = false })
    },
    search () { this.page = 1; this.load() },
    openCreate (preferredArtifactId = 0) {
      if (!this.options.artifacts.length) return this.$message.warning('请先完成一次镜像构建，生成可部署制品')
      if (!this.options.environments.some(item => item.deployable)) {
        return this.$message.warning('当前项目没有可部署环境，请先配置环境关联和项目组集群授权')
      }
      const preferred = this.options.artifacts.find(item => Number(item.id) === Number(preferredArtifactId))
      this.form.artifact_id = (preferred || this.options.artifacts[0]).id
      this.applyArtifactDefaults(this.form.artifact_id)
      this.createVisible = true
    },
    environmentOptionLabel (environment) {
      if (environment.deployable) return `${environment.title} · ${environment.available_cluster_count} 个可用集群`
      return `${environment.title} · ${environment.unavailable_reason || '当前不可部署'}`
    },
    clusterOptionLabel (cluster) {
      return `${cluster.title} · ${this.workloadTypeLabel(cluster)}`
    },
    orchestratorType (row) {
      return (row.runtime && row.runtime.orchestrator_type) ||
        row.orchestrator_type ||
        (row.cluster && row.cluster.orchestrator_type) ||
        ''
    },
    workloadTypeLabel (row) {
      const type = this.orchestratorType(row)
      if (type === 'kubernetes') return 'Kubernetes · Deployment'
      if (type === 'docker_swarm') return 'Docker Swarm · Service'
      return '未知工作负载'
    },
    workloadTagType (row) {
      return this.orchestratorType(row) === 'docker_swarm' ? 'success' : 'primary'
    },
    workloadResourceName (row) {
      const runtime = row.runtime || {}
      const result = row.result || {}
      const spec = row.desired_spec || {}
      return runtime.service_name || result.deployment_name || result.service_name || spec.service_name || '-'
    },
    workloadNamespace (row) {
      if (this.orchestratorType(row) !== 'kubernetes') return '不适用'
      const runtime = row.runtime || {}
      const result = row.result || {}
      return runtime.runtime_namespace || result.namespace || '-'
    },
    ensureCluster () {
      if (!this.availableClusters.some(item => Number(item.id) === Number(this.form.cluster_id))) this.form.cluster_id = null
    },
    loadNetworks (clusterId) {
      this.networks = []
      this.form.networks = []
      if (!clusterId) return
      if (this.isKubernetes) {
        this.form.mounts = []
      }
      releaseOptions(this.orgId, this.groupId, this.projectId, clusterId).then(res => {
        this.networks = res.data.networks || []
        this.suggestedPublishedPort = Number(res.data.suggested_published_port || 0)
        if (!this.isKubernetes) {
          this.form.ports.forEach(port => { if (!Number(port.published)) port.published = this.nextPublishedPort() })
        }
      })
    },
    applyArtifactDefaults (artifactId) {
      const artifact = this.options.artifacts.find(item => Number(item.id) === Number(artifactId))
      const port = Number(artifact && artifact.default_port)
      this.form.ports = port >= 1 && port <= 65535 ? [newPort(port)] : []
      this.form.version = artifact ? this.imageTag(artifact.reference) : ''
    },
    addPort () { this.form.ports.push(newPort(80, this.nextPublishedPort())) },
    nextPublishedPort () {
      const used = new Set(this.form.ports.map(port => Number(port.published || 0)).filter(Boolean))
      let candidate = Number(this.suggestedPublishedPort || 0)
      if (candidate >= 1024 && candidate <= 9999 && !used.has(candidate)) return candidate
      for (let attempt = 0; attempt < 200; attempt++) {
        candidate = 1024 + Math.floor(Math.random() * 8976)
        if (!used.has(candidate)) return candidate
      }
      return 0
    },
    openNetworkCreate () {
      if (!this.form.cluster_id || this.isKubernetes) return this.$message.warning('请先选择 Docker Swarm 集群')
      this.networkCreateVisible = true
    },
    createNetwork () {
      const name = this.networkName.toLowerCase()
      if (!/^[a-z0-9][a-z0-9_.-]{0,39}$/.test(name)) {
        return this.$message.warning('网络名称只能包含小写字母、数字、下划线、点号和连字符，长度不能超过 40 个字符')
      }
      this.networkCreating = true
      releaseNetworkCreate(this.orgId, this.groupId, this.projectId, this.form.cluster_id, name).then(res => {
        const network = res.data.network
        if (!this.networks.some(item => item.id === network.id)) this.networks.push(network)
        if (!this.form.networks.includes(network.id)) this.form.networks.push(network.id)
        this.$message.success(network.created ? `网络 ${network.name} 已创建并选择` : `已选择现有项目网络 ${network.name}`)
        this.networkCreateVisible = false
      }).finally(() => { this.networkCreating = false })
    },
    submit () {
      // Do not use v-model.trim on el-input: it trims every emitted input
      // value and makes a newly typed, meaningful space disappear.
      this.form.remark = String(this.form.remark || '').trim()
      this.$refs.releaseForm.validate(valid => {
        if (!valid) return
        if (this.bindMounts.length) {
          const dangerous = this.dangerousBindMounts.length > 0
          const paths = (dangerous ? this.dangerousBindMounts : this.bindMounts).join('、')
          this.$confirm(
            dangerous
              ? `即将挂载高风险宿主机路径：${paths}。容器可能获得宿主机或 Docker Swarm 集群控制权限。请确认镜像与配置完全可信。`
              : `即将使用宿主机 Bind Mount：${paths}。该 Service 依赖节点本地路径，并可能读写宿主机数据。`,
            dangerous ? '确认高风险 Bind Mount' : '确认 Bind Mount',
            { type: dangerous ? 'error' : 'warning', confirmButtonText: '我已了解风险，继续发布', cancelButtonText: '取消' }
          ).then(() => this.createRelease(true)).catch(() => {})
          return
        }
        this.createRelease(false)
      })
    },
    createRelease (bindRiskAcknowledged) {
      this.submitting = true
      const f = this.form
      const payload = {
        env_id: f.env_id,
        cluster_id: f.cluster_id,
        artifact_id: f.artifact_id,
        version: f.version,
        remark: f.remark,
        spec: {
          instance_name: f.instance_name,
          replicas: f.replicas,
          command: this.lines(f.command),
          args: this.lines(f.args),
          networks: this.isKubernetes ? [] : f.networks,
          resources: { limits: { cpus: f.cpu_limit, memory_mb: f.memory_limit }, reservations: { cpus: f.cpu_reservation, memory_mb: f.memory_reservation } },
          ports: f.ports,
          mounts: this.isKubernetes ? [] : f.mounts,
          bind_risk_acknowledged: bindRiskAcknowledged,
          env: f.env,
          configs: f.configs,
          secrets: f.secrets,
          update: { parallelism: f.parallelism, delay_seconds: 0, order: f.update_order, failure_action: f.failure_action }
        }
      }
      releaseCreate(this.orgId, this.groupId, this.projectId, payload).then(res => {
        this.$message.success('发布任务已提交')
        this.createVisible = false
        this.load()
        if (res.data.release) this.showDetail(res.data.release)
      }).finally(() => { this.submitting = false })
    },
    isDangerousBind (source) {
      const path = `/${String(source || '').replace(/^\/+/, '').replace(/\/{2,}/g, '/')}`.replace(/\/$/, '') || '/'
      const protectedPaths = ['/', '/boot', '/dev', '/etc', '/proc', '/root', '/run', '/sys', '/var/run', '/var/lib/docker', '/var/lib/containerd']
      return protectedPaths.some(item => path === item || path.startsWith(`${item}/`) || (path !== '/' && item.startsWith(`${path}/`)))
    },
    resetForm () { this.form = emptyForm(); this.networks = []; this.activeTab = 'network'; if (this.$refs.releaseForm) this.$refs.releaseForm.clearValidate() },
    showDetail (row) {
      releaseProfile(this.orgId, this.groupId, this.projectId, row.id).then(res => { this.detail = res.data.release; this.detailVisible = true })
    },
    showImage (artifact) {
      this.$router.push({
        name: 'ProjectImageDetail',
        params: { groupId: this.groupId, projectId: this.projectId, artifactId: artifact.id }
      })
    },
    rollback (row) {
      this.$confirm(`确定将 ${row.desired_spec.instance_name || row.desired_spec.service_name} 回滚到发布 #${row.id}？`, '版本回滚', { type: 'warning' }).then(() => {
        releaseRollback(this.orgId, this.groupId, this.projectId, row.id).then(() => { this.$message.success('回滚任务已提交'); this.load() })
      })
    },
    canRollback (row) { return ['succeeded', 'rolled-back'].includes(row.status) && Boolean(row.runtime_ref) },
    statusOf (status) { return STATUSES[status] || { label: status || '未知', type: 'info' } },
    operationLabel (operation) { return operation === 'rollback' ? '回滚' : operation === 'scale' ? '伸缩' : operation === 'update-image' ? '更新版本' : '发布' },
    replicaPercent (runtime) {
      const desired = Number(runtime.desired_count || 0)
      if (desired === 0) return 100
      return Math.min(100, Math.round(Number(runtime.running_count || 0) / desired * 100))
    },
    replicaProgressStatus (runtime) {
      const desired = Number(runtime.desired_count || 0)
      const running = Number(runtime.running_count || 0)
      if (desired === 0 || running >= desired) return 'success'
      return running === 0 ? 'exception' : 'warning'
    },
    imageRepository (reference) {
      const value = String(reference || '').split('@')[0]
      const slash = value.lastIndexOf('/')
      const colon = value.lastIndexOf(':')
      return colon > slash ? value.slice(0, colon) : value
    },
    shortImageTag (reference) {
      const value = String(reference || '').split('@')[0]
      const slash = value.lastIndexOf('/')
      const colon = value.lastIndexOf(':')
      const tag = colon > slash ? value.slice(colon + 1) : 'latest'
      return tag.length > 16 ? `${tag.slice(0, 13)}…` : tag
    },
    imageTag (reference) {
      const value = String(reference || '').split('@')[0]
      const slash = value.lastIndexOf('/')
      const colon = value.lastIndexOf(':')
      return colon > slash ? value.slice(colon + 1) : 'latest'
    },
    artifactOptionLabel (artifact) {
      const port = Number(artifact.default_port || 0)
      return `#${artifact.id} · ${this.shortImageTag(artifact.reference)}${port ? ` · 默认端口 ${port}` : ''}`
    },
    lines (value) { return String(value || '').split('\n').map(item => item.trim()).filter(Boolean) },
    duration (row) { return row.started_at && row.finished_at ? `${row.finished_at - row.started_at}s` : '-' },
    pretty (value) { return JSON.stringify(value || {}, null, 2) },
    clearRefresh () { if (this.refreshTimer) clearTimeout(this.refreshTimer); this.refreshTimer = null }
  }
}
</script>

<style lang="scss" scoped>
.project-main { padding-bottom: 28px; }
.deploy-card { overflow: hidden; border: 1px solid #e9edf3; border-radius: 10px; margin: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-header h3 { margin: 0; color: #263445; font-size: 17px; font-weight: 600; }
.page-header p { margin: 6px 0 0; color: #909399; font-size: 12px; }
.filter-bar { display: flex; align-items: center; justify-content: space-between; margin: -2px 0 12px; padding: 10px 12px; border-radius: 7px; background: #f7f9fc; }
.filters { display: flex; gap: 10px; }
.filters .el-select { width: 150px; }
.result-count { color: #909399; font-size: 12px; }
.release-id { font-family: SFMono-Regular, Consolas, monospace; font-size: 12px; font-weight: 600; }
.release-version { max-width: 120px; overflow: hidden; margin-top: 3px; color: #606266; font-family: SFMono-Regular, Consolas, monospace; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.service-name { overflow: hidden; color: #303133; font-size: 13px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.service-name i { margin-right: 3px; color: #7b8da6; }
.cell-sub { margin-top: 4px; color: #9aa1ac; font-size: 11px; }
.workload-tag { margin-top: 6px; }
.workload-target-alert { margin-bottom: 18px; }
.mono { font-family: SFMono-Regular, Consolas, monospace; word-break: break-all; }
.image-tag { max-width: 150px; overflow: hidden; font-family: SFMono-Regular, Consolas, monospace; font-size: 12px; text-overflow: ellipsis; vertical-align: middle; white-space: nowrap; }
.replica-line { display: flex; align-items: baseline; gap: 4px; margin-bottom: 7px; }
.replica-line strong { color: #303133; font-size: 14px; }
.replica-line span { color: #909399; font-size: 11px; }
.date-text { color: #606266; font-size: 12px; }
.form-section-title { display: flex; flex-direction: column; gap: 4px; margin-bottom: 18px; padding-left: 10px; border-left: 3px solid #409eff; }
.form-section-title span { color: #303133; font-size: 14px; font-weight: 600; }
.form-section-title small { color: #909399; font-size: 12px; }
.config-tabs { margin-top: 4px; padding: 0 14px 8px; border: 1px solid #e9edf3; border-radius: 8px; background: #fbfcfe; }
.network-priority-alert, .resource-tip { margin-bottom: 18px; }
.field-tip { margin-top: 6px; color: #909399; font-size: 12px; line-height: 1.5; }
.network-select-row { display: flex; align-items: flex-start; gap: 10px; }
.network-select-row .el-button { flex: none; }
.network-create-form { margin-top: 20px; }
.port-heading { display: grid; grid-template-columns: 1fr 1fr 120px 120px 42px; gap: 8px; margin-bottom: 7px; color: #909399; font-size: 12px; }
.port-heading span:first-child, .port-heading span:nth-child(2) { padding-left: 10px; }
.release-remark { margin-top: 18px; }
.artifact-option-main { color: #303133; font-family: SFMono-Regular, Consolas, monospace; font-size: 12px; }
.artifact-option-repo { float: right; max-width: 520px; overflow: hidden; color: #a0a6b0; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.array-row { display: grid; grid-template-columns: 1fr 1fr 120px 120px 42px; gap: 8px; margin-bottom: 10px; }
.mount-row { grid-template-columns: 120px 1.4fr 1.4fr 75px 42px; }
.config-row { grid-template-columns: 1fr 2fr 42px; }
.secret-row { grid-template-columns: 1fr 1.5fr 1fr 42px; }
.file-row { grid-template-columns: 1fr 1.4fr 2fr 42px; }
.detail { padding: 0 20px 30px; }
.detail pre { padding: 14px; overflow: auto; color: #d1d5db; background: #111827; border-radius: 4px; }
code { word-break: break-all; }
::v-deep .deploy-card > .el-card__header { padding: 17px 20px; border-bottom-color: #edf0f4; }
::v-deep .deploy-card > .el-card__body { padding: 16px 20px 4px; }
::v-deep .deploy-table th { color: #737b88; font-size: 12px; font-weight: 500; background: #fff; }
::v-deep .deploy-table td { padding: 13px 0; }
::v-deep .deploy-table::before { display: none; }
::v-deep .replica-line + .el-progress .el-progress-bar__outer { background: #edf1f5; }
::v-deep .deploy-create-dialog .el-dialog { overflow: hidden; border-radius: 10px; }
::v-deep .deploy-create-dialog .el-dialog__header { padding: 18px 22px; border-bottom: 1px solid #edf0f4; }
::v-deep .deploy-create-dialog .el-dialog__body { max-height: calc(92vh - 145px); padding: 20px 24px 10px; overflow-y: auto; }
::v-deep .deploy-create-dialog .el-dialog__footer { padding: 14px 22px; border-top: 1px solid #edf0f4; background: #fafbfd; }
::v-deep .config-tabs .el-tabs__header { margin-bottom: 18px; }
::v-deep .config-tabs .el-form-item { margin-bottom: 16px; }
@media (max-width: 900px) {
  .page-header, .filter-bar { align-items: flex-start; flex-direction: column; gap: 12px; }
  .filters { flex-wrap: wrap; width: 100%; }
  .filters .el-select { flex: 1; min-width: 135px; width: auto; }
}
</style>
