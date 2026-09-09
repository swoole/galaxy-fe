<template>
  <div class="project-container" v-loading="loading">
    <breadcrumb :breadcrumb="breadcrumb" :cluster="cluster" />
    <el-card shadow="never" class="content-card" style="margin: 20px">
      <div slot="header" class="card-header">
        <i class="el-icon-document card-header-icon"></i>
        <span>{{ pageTitle }}</span>
      </div>
      <el-alert v-if="isClone" type="info" :closable="false" class="clone-tip" title="已复制源 ConfigMap 的内容，修改后点击「保存」将生成一份全新的 ConfigMap" />
      <el-form label-width="100px" size="small" class="create-form">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" :disabled="isEdit" placeholder="如 nginx-config" />
        </el-form-item>
        <el-form-item label="命名空间" required>
          <el-select v-model="form.namespace" :disabled="isEdit" filterable placeholder="选择命名空间">
            <el-option v-for="item in namespaces" :key="item.name" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <key-value-editor v-model="form.labels" />
        </el-form-item>
        <el-form-item label="数据" required>
          <key-value-editor v-model="form.data" :value-type="'textarea'" />
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
import { kubernetesClusterNamespaces, kubernetesClusterConfigMapDetail, kubernetesClusterConfigMapCreate, kubernetesClusterConfigMapUpdate } from '@/api/kubernetes'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'K8sConfigMapCreate',
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
      form: { name: '', namespace: '', labels: [], data: [] }
    }
  },
  computed: {
    sourceName () { return this.$route.query.name || '' },
    sourceNamespace () { return this.$route.query.namespace || '' },
    isClone () { return this.$route.query.clone === '1' },
    isEdit () { return !!this.sourceName && !this.isClone },
    pageTitle () {
      if (this.isEdit) return '编辑 ConfigMap'
      if (this.isClone) return '克隆 ConfigMap'
      return '新增 ConfigMap'
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: 'ConfigMaps', to: { name: 'ClusterK8sConfigMaps', params: { clusterId: this.clusterId } } },
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
    if (this.sourceName) {
      this.loadSource()
    }
  },
  methods: {
    loadSource () {
      this.loading = true
      kubernetesClusterConfigMapDetail(this.orgId, this.clusterId, this.sourceNamespace, this.sourceName).then(res => {
        const cm = res.data.configmap || {}
        const metadata = cm.metadata || {}
        const toPairs = (obj) => Object.keys(obj || {}).map(k => ({ key: k, value: obj[k] }))
        this.form.name = this.isClone ? (metadata.name || '') + '.copy' : (metadata.name || '')
        this.form.namespace = metadata.namespace || this.sourceNamespace
        this.form.labels = toPairs(metadata.labels)
        this.form.data = toPairs(cm.data)
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.message || '加载源 ConfigMap 失败')
      }).finally(() => { this.loading = false })
    },
    save () {
      if (!this.form.name.trim()) return this.$message.warning('请输入名称')
      if (!this.form.namespace) return this.$message.warning('请选择命名空间')
      if (!this.form.data.length) return this.$message.warning('请至少添加一条数据')
      const form = {
        namespace: this.form.namespace,
        name: this.form.name.trim(),
        labels: this.form.labels,
        data: this.form.data
      }
      this.saving = true
      const request = this.isEdit
        ? kubernetesClusterConfigMapUpdate(this.orgId, this.clusterId, form)
        : kubernetesClusterConfigMapCreate(this.orgId, this.clusterId, form)
      request.then(() => {
        this.$message.success(this.isEdit ? 'ConfigMap 已更新' : (this.isClone ? 'ConfigMap 已克隆' : 'ConfigMap 已创建'))
        this.goBack()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '保存失败')
      }).finally(() => { this.saving = false })
    },
    goBack () {
      this.$router.push({ name: 'ClusterK8sConfigMaps', params: { clusterId: this.clusterId } })
    }
  }
}
</script>

<style lang="scss" scoped>
.content-card { border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.card-header { display: flex; align-items: center; font-size: 15px; font-weight: 600; color: #303133; }
.card-header-icon { margin-right: 8px; color: #409eff; font-size: 16px; }
.create-form { max-width: 880px; }
.clone-tip { margin-bottom: 12px; }
</style>
