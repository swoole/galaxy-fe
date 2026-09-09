<template>
  <div class="project-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-key card-header-icon"></i>
        <span>{{ pageTitle }}</span>
      </div>
      <el-alert
        v-if="isEdit"
        type="warning"
        :closable="false"
        class="edit-tip"
        title="Secret 的值不可回显，编辑时请重新填写需要更新的键值；留空则不修改已有值" />
      <el-form label-width="100px" size="small" class="create-form">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" :disabled="isEdit" placeholder="如 tls-secret" />
        </el-form-item>
        <el-form-item label="命名空间" required>
          <el-select v-model="form.namespace" :disabled="isEdit" filterable placeholder="选择命名空间">
            <el-option v-for="item in namespaces" :key="item.name" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" placeholder="Opaque">
            <el-option label="Opaque" value="Opaque" />
            <el-option label="kubernetes.io/tls" value="kubernetes.io/tls" />
            <el-option label="kubernetes.io/dockerconfigjson" value="kubernetes.io/dockerconfigjson" />
            <el-option label="kubernetes.io/basic-auth" value="kubernetes.io/basic-auth" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <key-value-editor v-model="form.labels" />
        </el-form-item>
        <el-form-item label="数据" required>
          <key-value-editor v-model="form.data" :value-type="'password'" />
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
import { kubernetesClusterNamespaces, kubernetesClusterSecretDetail, kubernetesClusterSecretCreate, kubernetesClusterSecretUpdate } from '@/api/kubernetes'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'K8sSecretCreate',
  components: { Breadcrumb, KeyValueEditor },
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
      form: { name: '', namespace: '', type: 'Opaque', labels: [], data: [] }
    }
  },
  computed: {
    sourceName () { return this.$route.query.name || '' },
    sourceNamespace () { return this.$route.query.namespace || '' },
    isEdit () { return !!this.sourceName },
    pageTitle () { return this.isEdit ? '编辑 Secret' : '新增 Secret' },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: 'Secrets', to: { name: 'ClusterK8sSecrets', params: { clusterId: this.clusterId } } },
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
    }
  },
  methods: {
    loadSource () {
      this.loading = true
      kubernetesClusterSecretDetail(this.orgId, this.clusterId, this.sourceNamespace, this.sourceName).then(res => {
        const secret = res.data.secret || {}
        const metadata = secret.metadata || {}
        const toPairs = (obj) => Object.keys(obj || {}).map(k => ({ key: k, value: '' }))
        this.form.name = metadata.name || ''
        this.form.namespace = metadata.namespace || this.sourceNamespace
        this.form.type = secret.type || 'Opaque'
        this.form.labels = toPairs(metadata.labels)
        // 明文不可回显，data 值留空，提示用户重新输入
        this.form.data = (secret.data && Object.keys(secret.data).length)
          ? Object.keys(secret.data).map(k => ({ key: k, value: '' }))
          : []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载源 Secret 失败')
      }).finally(() => { this.loading = false })
    },
    save () {
      if (!this.form.name.trim()) return this.$message.warning('请输入名称')
      if (!this.form.namespace) return this.$message.warning('请选择命名空间')
      if (!this.form.data.length) return this.$message.warning('请至少添加一条数据')
      const form = {
        namespace: this.form.namespace,
        name: this.form.name.trim(),
        type: this.form.type,
        labels: this.form.labels,
        data: this.form.data
      }
      this.saving = true
      const request = this.isEdit
        ? kubernetesClusterSecretUpdate(this.orgId, this.clusterId, form)
        : kubernetesClusterSecretCreate(this.orgId, this.clusterId, form)
      request.then(() => {
        this.$message.success(this.isEdit ? 'Secret 已更新' : 'Secret 已创建')
        this.goBack()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '保存失败')
      }).finally(() => { this.saving = false })
    },
    goBack () {
      this.$router.push({ name: 'ClusterK8sSecrets', params: { clusterId: this.clusterId } })
    }
  }
}
</script>

<style lang="scss" scoped>
.content-card { border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.card-header { display: flex; align-items: center; font-size: 15px; font-weight: 600; color: #303133; }
.card-header-icon { margin-right: 8px; color: #409eff; font-size: 16px; }
.create-form { max-width: 880px; }
.edit-tip { margin-bottom: 12px; }
</style>
