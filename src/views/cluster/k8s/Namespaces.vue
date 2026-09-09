<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <div class="project-main">
      <div class="heading">
        <easy-title title="Kubernetes Namespaces" margin-set="0" />
        <div class="actions">
          <el-input
            v-model="keyword"
            size="small"
            clearable
            class="search"
            placeholder="搜索名称 / 标签"
            prefix-icon="el-icon-search" />
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
          <el-button size="small" type="primary" icon="el-icon-plus" @click="openCreate">新建 Namespace</el-button>
        </div>
      </div>
      <el-table v-loading="loading" :data="displayRows" fit class="table">
        <el-table-column label="名称" min-width="220">
          <template #default="{ row }">
            <router-link
              class="link-name"
              :to="{ name: 'ClusterK8sNamespaceDetail', params: { clusterId }, query: { namespace: row.name } }">
              {{ row.name }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }"><el-tag size="small" :type="row.status === 'Active' ? 'success' : 'warning'">{{ row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column label="Labels" min-width="420">
          <template #default="{ row }">
            <el-tag v-for="(value, key) in row.labels" :key="key" size="mini" class="label">{{ key }}={{ value }}</el-tag>
            <span v-if="!Object.keys(row.labels || {}).length">-</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="190">
          <template #default="{ row }">{{ formatK8sDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-popconfirm
              title="删除 Namespace 会级联删除其下所有资源，确定？"
              confirm-button-text="确定删除"
              confirm-button-type="danger"
              @confirm="remove(row)">
              <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">删除</el-button>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <el-dialog title="新建 Namespace" :visible.sync="createVisible" width="480px">
      <el-form label-width="100px" size="small">
        <el-form-item label="名称" required>
          <el-input v-model="createForm.name" placeholder="如 my-app（仅小写字母、数字与 -）" />
        </el-form-item>
        <el-form-item label="标签">
          <key-value-editor v-model="createForm.labels" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="createVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="confirmCreate">创建</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import KeyValueEditor from './components/KeyValueEditor'
import { routeBreadcrumb } from '@/utils/helpers'
import { formatK8sDate } from '@/utils/filters'
import { kubernetesClusterNamespaces, kubernetesClusterNamespaceCreate, kubernetesClusterNamespaceDelete } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sNamespaces',
  components: { Breadcrumb, EasyTitle, KeyValueEditor },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      loading: false,
      rows: [],
      keyword: '',
      createVisible: false,
      saving: false,
      createForm: { name: '', labels: [] }
    }
  },
  computed: {
    breadcrumb () { return [...routeBreadcrumb(this), { title: 'Namespaces', to: '' }] },
    displayRows () {
      const kw = this.keyword.trim().toLowerCase()
      if (!kw) return this.rows
      return this.rows.filter(row => this.matchKeyword(row, kw))
    }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      kubernetesClusterNamespaces(this.orgId, this.clusterId).then(res => {
        this.rows = res.data.namespaces || []
      }).finally(() => { this.loading = false })
    },
    openCreate () {
      this.createForm = { name: '', labels: [] }
      this.createVisible = true
    },
    matchKeyword (row, kw) {
      return JSON.stringify(row).toLowerCase().includes(kw)
    },
    confirmCreate () {
      if (!this.createForm.name.trim()) return this.$message.warning('请输入名称')
      this.saving = true
      kubernetesClusterNamespaceCreate(this.orgId, this.clusterId, this.createForm).then(() => {
        this.$message.success('Namespace 已创建')
        this.createVisible = false
        this.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '创建失败')
      }).finally(() => { this.saving = false })
    },
    remove (row) {
      kubernetesClusterNamespaceDelete(this.orgId, this.clusterId, row.name).then(() => {
        this.$message.success('Namespace 已删除')
        this.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '删除失败')
      })
    }
  },
  formatK8sDate
}
</script>

<style lang="scss" scoped>
.heading { display: flex; align-items: center; justify-content: space-between; }
.actions { display: flex; align-items: center; gap: 10px; }
.actions .search { width: 240px; }
.table { margin-top: 18px; }
.label { margin: 2px 5px 2px 0; }
.text-danger { color: #f56c6c; }
.link-name { color: #409eff; &:hover { text-decoration: underline; } }
</style>
