<template>
  <div class="project-container governance-page">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <div class="project-main">
      <div class="page-heading">
        <div>
          <h3>操作记录</h3>
          <p>查看项目内的重要操作、执行结果及请求来源</p>
        </div>
        <el-button size="small" icon="el-icon-setting" @click="openPolicy">设置</el-button>
      </div>
      <div class="audit-filter">
        <el-input v-model.trim="filters.action" clearable size="small" placeholder="操作名称" @keyup.enter.native="search" />
        <el-select v-model="filters.status" clearable size="small" placeholder="全部结果" @change="search">
          <el-option label="成功" value="succeeded" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-button size="small" type="primary" @click="search">查询</el-button>
      </div>
      <el-table v-loading="auditLoading" :data="rows" fit>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ row.created_at | formatDate }}</template>
        </el-table-column>
        <el-table-column label="操作者" min-width="180">
          <template #default="{ row }">{{ row.actor ? row.actor.email : `UID ${row.uid}` }}</template>
        </el-table-column>
        <el-table-column label="操作" min-width="170">
          <template #default="{ row }"><code>{{ actionLabel(row.action) }}</code></template>
        </el-table-column>
        <el-table-column label="请求" min-width="230" show-overflow-tooltip>
          <template #default="{ row }"><span class="method">{{ row.method }}</span> {{ row.path }}</template>
        </el-table-column>
        <el-table-column label="结果" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'succeeded' ? 'success' : 'danger'" size="mini">
              {{ row.status === 'succeeded' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="90" align="right">
          <template #default="{ row }">{{ row.duration_ms }} ms</template>
        </el-table-column>
        <el-table-column label="来源 IP" width="145" prop="ip" />
        <el-table-column label="详情" width="80" align="center">
          <template #default="{ row }"><el-link type="primary" @click="showDetail(row)">查看</el-link></template>
        </el-table-column>
      </el-table>
      <pagination
        v-show="total > 0"
        :total="total"
        :page.sync="page"
        :limit.sync="pageSize"
        @pagination="loadAudit" />
    </div>

    <el-dialog title="操作详情" :visible.sync="detailVisible" width="680px">
      <el-descriptions v-if="detail" :column="2" border>
        <el-descriptions-item label="Controller" :span="2">{{ detail.controller }}</el-descriptions-item>
        <el-descriptions-item label="HTTP 状态">{{ detail.http_status }}</el-descriptions-item>
        <el-descriptions-item label="User-Agent">{{ detail.user_agent || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.error" label="错误" :span="2"><span class="error">{{ detail.error }}</span></el-descriptions-item>
      </el-descriptions>
      <pre class="metadata">{{ prettyMetadata }}</pre>
    </el-dialog>

    <el-dialog title="数据保留策略" :visible.sync="policyVisible" width="680px" @closed="resetPolicyForm">
      <el-alert
        title="保留任务只清理历史指标、事件、已恢复告警、构建日志正文和过期操作记录；不会删除 Git 代码、镜像制品、发布记录或当前运行实例。"
        type="info"
        :closable="false"
        show-icon />
      <el-form
        ref="policyForm"
        v-loading="policyLoading"
        class="policy-form"
        :model="policy"
        :rules="rules"
        label-width="170px">
        <el-form-item label="启用自动清理" prop="enabled"><el-switch v-model="policy.enabled" /></el-form-item>
        <el-form-item label="运行指标" prop="metric_days"><el-input-number v-model="policy.metric_days" :min="1" :max="3650" /> <span class="unit">天</span></el-form-item>
        <el-form-item label="Docker 事件" prop="event_days"><el-input-number v-model="policy.event_days" :min="1" :max="3650" /> <span class="unit">天</span></el-form-item>
        <el-form-item label="已恢复告警" prop="resolved_alert_days"><el-input-number v-model="policy.resolved_alert_days" :min="1" :max="3650" /> <span class="unit">天</span></el-form-item>
        <el-form-item label="构建日志正文" prop="build_log_days"><el-input-number v-model="policy.build_log_days" :min="1" :max="3650" /> <span class="unit">天</span></el-form-item>
        <el-form-item label="操作记录" prop="audit_days"><el-input-number v-model="policy.audit_days" :min="30" :max="3650" /> <span class="unit">天（至少 30 天）</span></el-form-item>
        <el-form-item v-if="policy.last_purged_at" label="最近清理">{{ policy.last_purged_at | formatDate }}</el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="policyVisible = false">取消</el-button>
        <el-button type="primary" :loading="policySaving" @click="savePolicy">保存设置</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import Pagination from '@/components/Pagination'
import { projectAuditLogs, projectRetentionPolicy, projectRetentionPolicySave } from '@/api/project'
import { formatDate } from '@/utils/filters'
import { routeBreadcrumb } from '@/utils/helpers'

const defaultPolicy = () => ({
  enabled: true,
  metric_days: 30,
  event_days: 90,
  resolved_alert_days: 180,
  build_log_days: 90,
  audit_days: 365,
  last_purged_at: 0
})

export default {
  name: 'ProjectGovernance',
  components: { Breadcrumb, Pagination },
  filters: { formatDate },
  props: {
    project: { type: Object, default: null },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return {
      policy: defaultPolicy(),
      policyLoading: false,
      policySaving: false,
      policyVisible: false,
      auditLoading: false,
      rows: [],
      total: 0,
      page: 1,
      pageSize: 20,
      filters: { action: '', status: '' },
      detail: null,
      detailVisible: false,
      rules: {
        metric_days: [{ required: true, type: 'number', min: 1, max: 3650, trigger: 'change' }],
        event_days: [{ required: true, type: 'number', min: 1, max: 3650, trigger: 'change' }],
        resolved_alert_days: [{ required: true, type: 'number', min: 1, max: 3650, trigger: 'change' }],
        build_log_days: [{ required: true, type: 'number', min: 1, max: 3650, trigger: 'change' }],
        audit_days: [{ required: true, type: 'number', min: 30, max: 3650, trigger: 'change' }]
      }
    }
  },
  computed: {
    breadcrumb () {
      return [...routeBreadcrumb(this), { title: '设置', to: '' }, { title: '操作记录', to: '' }]
    },
    prettyMetadata () {
      return JSON.stringify((this.detail && this.detail.metadata) || {}, null, 2)
    }
  },
  created () {
    this.loadAudit()
  },
  methods: {
    openPolicy () {
      this.policyVisible = true
      this.loadPolicy()
    },
    loadPolicy () {
      this.policyLoading = true
      return projectRetentionPolicy(this.orgId, this.groupId, this.projectId).then(res => {
        this.policy = { ...defaultPolicy(), ...(res.data.policy || {}) }
      }).finally(() => { this.policyLoading = false })
    },
    savePolicy () {
      this.$refs.policyForm.validate(valid => {
        if (!valid) return
        this.policySaving = true
        projectRetentionPolicySave(this.orgId, this.groupId, this.projectId, this.policy).then(res => {
          this.policy = { ...defaultPolicy(), ...(res.data.policy || {}) }
          this.$message.success('数据保留策略已保存')
          this.policyVisible = false
          this.loadAudit()
        }).finally(() => { this.policySaving = false })
      })
    },
    resetPolicyForm () {
      if (this.$refs.policyForm) this.$refs.policyForm.clearValidate()
    },
    loadAudit () {
      this.auditLoading = true
      const filters = {
        action: this.filters.action || null,
        status: this.filters.status || null
      }
      return projectAuditLogs(this.orgId, this.groupId, this.projectId, filters, this.page, this.pageSize).then(res => {
        this.rows = res.data.data || []
        this.total = Number(res.data.total || 0)
        this.page = Number(res.data.page || 1)
        this.pageSize = Number(res.data.pagesize || this.pageSize)
      }).finally(() => { this.auditLoading = false })
    },
    search () {
      this.page = 1
      this.loadAudit()
    },
    showDetail (row) {
      this.detail = row
      this.detailVisible = true
    },
    actionLabel (action) {
      const labels = {
        create: '创建',
        update: '更新',
        delete: '删除',
        state: '启停 Workspace',
        initialize: '初始化 Git',
        pull: 'Git Pull',
        push: 'Git Push',
        commit: 'Git Commit',
        newDeploy: '发布',
        rollback: '回滚',
        scaleRuntime: '调整副本',
        restartRuntime: '重启实例',
        removeRuntime: '删除实例',
        save: '保存',
        savePolicy: '保存保留策略',
        rebuild: '重新构建',
        cancelBuild: '取消构建'
      }
      return labels[action] || action
    }
  }
}
</script>

<style lang="scss" scoped>
.page-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding: 0 20px; }
.page-heading h3 { margin: 0 0 6px; color: #263445; font-size: 18px; }
.page-heading p { margin: 0; color: #909399; font-size: 13px; }
.policy-form { max-width: 580px; margin-top: 20px; }
.unit, .last-purged { margin-left: 10px; color: #909399; }
.audit-filter { display: flex; gap: 10px; margin-bottom: 16px; }
.audit-filter .el-input, .audit-filter .el-select { width: 190px; }
.method { display: inline-block; min-width: 48px; font-weight: 600; color: #409eff; }
.metadata { max-height: 360px; overflow: auto; padding: 14px; background: #1e1e1e; color: #d4d4d4; border-radius: 4px; }
.error { color: #f56c6c; white-space: pre-wrap; }
</style>
