<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />
    <div class="project-main">
      <easy-title title="接入 Kubernetes 集群" margin-set="0 20" />
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="Galaxy API 必须能够访问 kubeconfig 中的 API Server；凭据会规范化后加密保存。" />
      <el-form
        ref="main-form"
        class="main-form"
        label-position="right"
        label-width="120px"
        :model="form"
        :rules="rules"
        @submit.native.prevent="submit">
        <el-form-item label="集群名称" prop="title">
          <el-input v-model.trim="form.title" class="form-control" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            class="form-control"
            type="textarea"
            :rows="3"
            maxlength="2000"
            show-word-limit />
        </el-form-item>
        <el-form-item label="kubeconfig" prop="kubeconfig">
          <el-input
            v-model="form.kubeconfig"
            class="kubeconfig"
            type="textarea"
            :rows="18"
            spellcheck="false"
            placeholder="粘贴 kubectl config view --raw 或 k3d kubeconfig get 输出" />
          <div class="help">仅支持内嵌 CA、客户端证书/私钥或 Token；不接受本机文件路径和 exec 插件。</div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="submit">验证并接入</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import { routeBreadcrumb, routeBreadcrumbFind } from '@/utils/helpers'
import { kubernetesClusterCreate } from '@/api/kubernetes'

export default {
  name: 'ClusterK8sCreate',
  components: { Breadcrumb, EasyTitle },
  data () {
    return {
      saving: false,
      form: { title: '', remark: '', kubeconfig: '' },
      rules: {
        title: [{ required: true, message: '请输入集群名称', trigger: 'blur' }],
        kubeconfig: [{ required: true, message: '请粘贴 kubeconfig', trigger: 'blur' }]
      }
    }
  },
  computed: {
    orgId () { return this.$store.getters.orgId },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        routeBreadcrumbFind(this, { name: 'ClusterK8sList' }),
        { title: '接入集群', to: '' }
      ]
    }
  },
  methods: {
    submit () {
      this.$refs['main-form'].validate(valid => {
        if (!valid) return
        this.saving = true
        kubernetesClusterCreate(this.orgId, this.form).then(res => {
          this.$message.success('Kubernetes 集群已接入')
          this.$router.replace({
            name: 'ClusterK8sOverview',
            params: { clusterId: Number(res.data.cluster_id) }
          })
        }).finally(() => { this.saving = false })
      })
    },
    goBack () {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push({ name: 'ClusterK8sList' })
    }
  }
}
</script>

<style lang="scss" scoped>
.main-form { max-width: 900px; margin-top: 22px; }
.form-control { width: 560px; max-width: 100%; }
.kubeconfig { width: 720px; max-width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.help { margin-top: 6px; color: #909399; font-size: 12px; line-height: 1.6; }
</style>
