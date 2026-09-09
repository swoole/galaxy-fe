<template>
  <div class="project-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <div class="project-main">
      <div class="heading">
        <easy-title :title="'Namespace · ' + namespaceName" margin-set="0" />
        <div class="heading-actions">
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
          <el-button size="small" icon="el-icon-back" @click="goBack">返回</el-button>
        </div>
      </div>

      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        show-icon
        class="section" />

      <el-tabs v-if="loaded" v-model="activeTab" class="section">
        <el-tab-pane label="概览" name="overview">
          <div class="detail-section">
            <easy-title :level="'h4'">基本信息</easy-title>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="名称">{{ namespace.name }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag size="small" :type="namespace.status === 'Active' ? 'success' : 'warning'">
                  {{ namespace.status }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="UID">{{ namespace.uid || '-' }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ namespace.created_at || '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>
          <div class="detail-section">
            <easy-title :level="'h4'">标签</easy-title>
            <div v-if="Object.keys(namespace.labels || {}).length" class="tag-list">
              <el-tag v-for="(value, key) in namespace.labels" :key="key" size="small" type="info">
                {{ key }}={{ value }}
              </el-tag>
            </div>
            <span v-else class="secondary">暂无标签</span>
          </div>
        </el-tab-pane>

        <el-tab-pane label="资源配额" name="resources">
          <el-alert
            title="ResourceQuota 限制 Namespace 内声明的资源总量；LimitRange 为新建容器补充默认请求与限制。保存不会重启现有 Pod。"
            type="info"
            :closable="false"
            show-icon />

          <div class="detail-section">
            <div class="section-heading">
              <easy-title :level="'h4'">当前配额使用量</easy-title>
              <el-tag v-if="managedQuota" size="small" type="success">Galaxy 配额已启用</el-tag>
              <el-tag v-else size="small" type="info">未启用 Galaxy 配额</el-tag>
            </div>
            <div v-if="managedQuota && quotaEntries(managedQuota).length" class="quota-grid">
              <div v-for="item in quotaEntries(managedQuota)" :key="item.key" class="quota-card">
                <div class="quota-card-heading">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.used }} / {{ item.hard }}</strong>
                </div>
                <el-progress
                  :percentage="item.percentage"
                  :status="progressStatus(item.percentage)"
                  :stroke-width="8" />
              </div>
            </div>
            <el-empty v-else :image-size="72" description="尚未设置 Namespace 资源总量限制" />
          </div>

          <div class="detail-section policy-editor">
            <div class="policy-heading">
              <div>
                <h4>Namespace 资源总量</h4>
                <p>所有非终止 Pod 的 requests 和 limits 合计不能超过该配额。</p>
              </div>
              <el-switch
                v-model="form.quota_enabled"
                active-text="启用"
                :disabled="saving"
                @change="onQuotaToggle" />
            </div>
            <template v-if="form.quota_enabled">
              <resource-config-editor
                v-model="form.quota_resources"
                :templates="namespaceTemplates"
                :allow-unlimited="false"
                :disabled="saving"
                :max-cpu="1000000"
                :max-memory="1073741824" />
              <div class="object-limits">
                <div class="object-limit">
                  <label>存储请求总量</label>
                  <el-input-number v-model="form.storage_gib" :min="0" :max="1073741824" :step="10" controls-position="right" />
                  <span>GiB</span>
                </div>
                <div class="object-limit">
                  <label>Pod 数量</label>
                  <el-input-number v-model="form.pods" :min="0" :max="1000000000" controls-position="right" />
                  <span>个</span>
                </div>
                <div class="object-limit">
                  <label>Service 数量</label>
                  <el-input-number v-model="form.services" :min="0" :max="1000000000" controls-position="right" />
                  <span>个</span>
                </div>
                <div class="object-limit">
                  <label>PVC 数量</label>
                  <el-input-number
                    v-model="form.persistent_volume_claims"
                    :min="0"
                    :max="1000000000"
                    controls-position="right" />
                  <span>个</span>
                </div>
              </div>
            </template>
          </div>

          <div class="detail-section policy-editor">
            <div class="policy-heading">
              <div>
                <h4>容器默认资源</h4>
                <p>仅在创建新 Pod 时，为未声明资源配置的容器注入默认 requests 和 limits。</p>
              </div>
              <el-switch
                v-model="form.limit_range_enabled"
                active-text="启用"
                :disabled="saving"
                @change="onLimitRangeToggle" />
            </div>
            <resource-config-editor
              v-if="form.limit_range_enabled"
              v-model="form.default_resources"
              :allow-unlimited="false"
              :disabled="saving" />
          </div>

          <div class="save-actions">
            <el-button type="primary" icon="el-icon-check" :loading="saving" @click="save">
              保存资源策略
            </el-button>
            <el-button :disabled="saving" @click="resetForm">重置</el-button>
          </div>

          <div v-if="resourceQuotas.length || limitRanges.length" class="detail-section">
            <easy-title :level="'h4'">Namespace 中的全部策略</easy-title>
            <el-table v-if="resourceQuotas.length" :data="resourceQuotas" size="small" class="policy-table">
              <el-table-column label="ResourceQuota" prop="name" min-width="200">
                <template #default="{ row }">
                  <strong>{{ row.name }}</strong>
                  <el-tag v-if="row.managed" size="mini" type="success" class="managed-tag">Galaxy 管理</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="使用量 / 限制" min-width="420">
                <template #default="{ row }">
                  <div class="inline-values">
                    <span v-for="item in quotaEntries(row)" :key="item.key">
                      {{ item.label }} {{ item.used }}/{{ item.hard }}
                    </span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="创建时间" prop="created_at" width="190" />
            </el-table>
            <el-table v-if="limitRanges.length" :data="limitRanges" size="small" class="policy-table">
              <el-table-column label="LimitRange" prop="name" min-width="200">
                <template #default="{ row }">
                  <strong>{{ row.name }}</strong>
                  <el-tag v-if="row.managed" size="mini" type="success" class="managed-tag">Galaxy 管理</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="规则" min-width="420">
                <template #default="{ row }">{{ limitRangeSummary(row) }}</template>
              </el-table-column>
              <el-table-column label="创建时间" prop="created_at" width="190" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import ResourceConfigEditor from '@/views/components/ResourceConfigEditor'
import { routeBreadcrumb } from '@/utils/helpers'
import {
  kubernetesClusterNamespaceDetail,
  kubernetesClusterNamespaceResources
} from '@/api/kubernetes'

const emptyResources = () => ({
  cpu_reservation: 0,
  cpu_limit: 0,
  memory_reservation: 0,
  memory_limit: 0
})

const defaultForm = () => ({
  quota_enabled: false,
  quota_resources: emptyResources(),
  storage_gib: 0,
  pods: 0,
  services: 0,
  persistent_volume_claims: 0,
  limit_range_enabled: false,
  default_resources: emptyResources()
})

const RESOURCE_LABELS = {
  'requests.cpu': 'CPU 请求',
  'limits.cpu': 'CPU 限制',
  'requests.memory': '内存请求',
  'limits.memory': '内存限制',
  'requests.storage': '存储请求',
  pods: 'Pods',
  services: 'Services',
  persistentvolumeclaims: 'PVCs'
}

export default {
  name: 'ClusterK8sNamespaceDetail',
  components: { Breadcrumb, EasyTitle, ResourceConfigEditor },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      loading: false,
      saving: false,
      loaded: false,
      error: '',
      activeTab: this.$route.query.tab === 'resources' ? 'resources' : 'overview',
      namespace: { labels: {} },
      resourceQuotas: [],
      limitRanges: [],
      form: defaultForm(),
      originalForm: defaultForm(),
      namespaceTemplates: [
        { key: 'small', title: '小型', cpu_reservation: 2, cpu_limit: 4, memory_reservation: 4096, memory_limit: 8192 },
        { key: 'standard', title: '标准', cpu_reservation: 4, cpu_limit: 8, memory_reservation: 8192, memory_limit: 16384 },
        { key: 'medium', title: '中型', cpu_reservation: 8, cpu_limit: 16, memory_reservation: 16384, memory_limit: 32768 },
        { key: 'large', title: '大型', cpu_reservation: 16, cpu_limit: 32, memory_reservation: 32768, memory_limit: 65536 }
      ]
    }
  },
  computed: {
    namespaceName () { return this.$route.query.namespace || '' },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: 'Namespaces', to: { name: 'ClusterK8sNamespaces', params: { clusterId: this.clusterId } } },
        { title: this.namespaceName, to: '' }
      ]
    },
    managedQuota () {
      return this.resourceQuotas.find(item => item.managed) || null
    }
  },
  created () {
    this.load()
  },
  methods: {
    load () {
      if (!this.namespaceName) {
        this.error = '缺少 Namespace 名称'
        return
      }
      this.loading = true
      this.error = ''
      kubernetesClusterNamespaceDetail(this.orgId, this.clusterId, this.namespaceName).then(res => {
        this.applyResponse(res.data)
        this.loaded = true
      }).catch(err => {
        this.error = err.response?.data?.msg || err.response?.data?.message || err.message || '无法加载 Namespace'
      }).finally(() => { this.loading = false })
    },
    applyResponse (data) {
      this.namespace = data.namespace || { labels: {} }
      this.resourceQuotas = data.resource_quotas || []
      this.limitRanges = data.limit_ranges || []
      const managed = data.managed || {}
      const next = {
        quota_enabled: !!managed.quota_enabled,
        quota_resources: Object.assign(emptyResources(), managed.quota_resources || {}),
        storage_gib: Number(managed.storage_gib || 0),
        pods: Number(managed.pods || 0),
        services: Number(managed.services || 0),
        persistent_volume_claims: Number(managed.persistent_volume_claims || 0),
        limit_range_enabled: !!managed.limit_range_enabled,
        default_resources: Object.assign(emptyResources(), managed.default_resources || {})
      }
      this.form = JSON.parse(JSON.stringify(next))
      this.originalForm = JSON.parse(JSON.stringify(next))
    },
    onQuotaToggle (enabled) {
      if (!enabled || this.hasResourceValue(this.form.quota_resources)) return
      this.form.quota_resources = {
        cpu_reservation: 4,
        cpu_limit: 8,
        memory_reservation: 8192,
        memory_limit: 16384
      }
      this.form.storage_gib = 100
      this.form.pods = 100
      this.form.services = 50
      this.form.persistent_volume_claims = 20
    },
    onLimitRangeToggle (enabled) {
      if (!enabled || this.hasResourceValue(this.form.default_resources)) return
      this.form.default_resources = {
        cpu_reservation: 0.25,
        cpu_limit: 1,
        memory_reservation: 256,
        memory_limit: 1024
      }
    },
    hasResourceValue (resources) {
      return Object.values(resources || {}).some(value => Number(value) > 0)
    },
    save () {
      if (this.form.quota_enabled && !this.hasResourceValue(this.form.quota_resources) &&
        !this.form.storage_gib && !this.form.pods && !this.form.services && !this.form.persistent_volume_claims) {
        return this.$message.warning('请至少设置一项 Namespace 资源总量')
      }
      if (this.form.limit_range_enabled && !this.hasResourceValue(this.form.default_resources)) {
        return this.$message.warning('请设置容器默认资源')
      }
      this.saving = true
      kubernetesClusterNamespaceResources(this.orgId, this.clusterId, {
        namespace: this.namespaceName,
        ...this.form
      }).then(res => {
        this.applyResponse(res.data)
        this.$message.success('Namespace 资源策略已保存')
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '保存失败')
      }).finally(() => { this.saving = false })
    },
    resetForm () {
      this.form = JSON.parse(JSON.stringify(this.originalForm))
    },
    quotaEntries (quota) {
      const hard = quota.hard || {}
      const used = quota.used || {}
      return Object.keys(hard).map(key => ({
        key,
        label: RESOURCE_LABELS[key] || key,
        hard: hard[key],
        used: used[key] || '0',
        percentage: this.quantityPercentage(key, used[key] || '0', hard[key])
      }))
    },
    quantityPercentage (key, used, hard) {
      const usedValue = this.quantityValue(key, used)
      const hardValue = this.quantityValue(key, hard)
      if (!hardValue) return 0
      return Math.min(100, Math.round(usedValue / hardValue * 100))
    },
    quantityValue (key, value) {
      const text = String(value || '0')
      if (key.includes('cpu')) {
        const match = text.match(/^([0-9.]+)([num]?)$/)
        if (!match) return 0
        const factors = {
          n: 1e-9,
          u: 1e-6,
          m: 1e-3,
          '': 1
        }
        return Number(match[1]) * factors[match[2]]
      }
      if (key.includes('memory') || key.includes('storage')) {
        const match = text.match(/^([0-9.]+)([EPTGMK]i?|)$/i)
        if (!match) return 0
        const factors = {
          '': 1,
          k: 1e3,
          m: 1e6,
          g: 1e9,
          t: 1e12,
          p: 1e15,
          e: 1e18,
          ki: 1024,
          mi: 1024 ** 2,
          gi: 1024 ** 3,
          ti: 1024 ** 4,
          pi: 1024 ** 5,
          ei: 1024 ** 6
        }
        return Number(match[1]) * factors[match[2].toLowerCase()]
      }
      return Number(text) || 0
    },
    progressStatus (percentage) {
      if (percentage >= 95) return 'exception'
      if (percentage >= 80) return 'warning'
      return 'success'
    },
    limitRangeSummary (row) {
      const limits = row.limits || []
      if (!limits.length) return '-'
      return limits.map(item => {
        const request = Object.entries(item.defaultRequest || {}).map(([key, value]) => `${key}=${value}`).join(', ')
        const limit = Object.entries(item.default || {}).map(([key, value]) => `${key}=${value}`).join(', ')
        return `${item.type || 'Container'}：默认请求 ${request || '-'}；默认限制 ${limit || '-'}`
      }).join('；')
    },
    goBack () {
      this.$router.push({ name: 'ClusterK8sNamespaces', params: { clusterId: this.clusterId } })
    }
  }
}
</script>

<style lang="scss" scoped>
.heading, .section-heading, .policy-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.heading-actions { display: flex; gap: 8px; }
.section { margin-top: 18px; }
.detail-section { margin-top: 24px; }
.section-heading ::v-deep .easy-title { margin: 0; }
.tag-list { display: flex; flex-wrap: wrap; gap: 7px; }
.secondary { color: #909399; }
.quota-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 14px;
}
.quota-card {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfd;
}
.quota-card-heading {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
}
.quota-card-heading strong { color: #303133; }
.policy-editor {
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}
.policy-heading { margin-bottom: 18px; }
.policy-heading h4 { margin: 0; color: #303133; font-size: 15px; }
.policy-heading p { margin: 6px 0 0; color: #909399; font-size: 12px; }
.object-limits {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 22px;
  margin-top: 16px;
}
.object-limit {
  display: grid;
  grid-template-columns: 110px minmax(130px, 1fr) 38px;
  align-items: center;
  gap: 8px;
}
.object-limit label { color: #606266; font-size: 13px; }
.object-limit .el-input-number { width: 100%; }
.object-limit span { color: #909399; font-size: 12px; }
.save-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 22px;
}
.policy-table { margin-top: 12px; }
.managed-tag { margin-left: 8px; }
.inline-values {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 14px;
  color: #606266;
  font-size: 12px;
}
@media (max-width: 900px) {
  .object-limits { grid-template-columns: 1fr; }
  .policy-heading { align-items: flex-start; gap: 16px; }
}
</style>
