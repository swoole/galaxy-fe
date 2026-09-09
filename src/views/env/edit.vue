<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="project-main">
      <easy-title title="基础信息" margin-set="0 20" />

      <el-form
        ref="main-form"
        class="main-form"
        label-position="right"
        label-width="100px"
        size="medium"
        :model="mainForm"
        :rules="mainFormRules"
        @submit.native.prevent="submit">
        <el-alert class="purpose-tip" title="部署环境是项目发布阶段，不是资源权限边界。这里关联集群后，发布时还会与项目组的集群授权取交集。" type="info" :closable="false" />
        <el-form-item label="环境名称" prop="title">
          <el-input
            v-model="mainForm.title"
            class="form-item-control"
            placeholder="环境名称"
            name="title" />
        </el-form-item>
        <el-form-item label="关联集群" prop="cluster_ids">
          <el-select
            v-model="mainForm.cluster_ids"
            class="form-item-control form-item-select"
            multiple
            placeholder="请选择关联集群">
            <el-option
              v-for="iCluster in selectorClusters"
              :key="iCluster.id"
              :label="iCluster.title"
              :value="iCluster.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="mainForm.remark"
            :maxlength="200"
            show-word-limit
            :rows="5"
            type="textarea"
            class="form-item-control form-item-textarea"
            placeholder="备注"
            name="desc" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitLoading" @click="submit" style="margin-right: 60px;">保存</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>

    </div>

  </div>
</template>

<script>
import EasyTitle from '@/views/components/EasyTitle'
import Breadcrumb from '@/views/components/Breadcrumb'
import { envProfile, envUpdate } from '@/api/env'
import { clusterSimple } from '@/api/cluster'
import { formatInArrayNumber, routeBreadcrumb, routeBreadcrumbFind } from '@/utils/helpers'

export default {
  name: 'EnvEdit',
  components: {
    EasyTitle,
    Breadcrumb
  },
  computed: {
    orgId () {
      return this.$store.getters.orgId
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        routeBreadcrumbFind(this, { name: 'Env' }),
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  data () {
    return {
      envId: 0,
      mainForm: {
        title: null,
        remark: null,
        cluster_ids: []
      },
      mainFormRules: {
        title: [
          { required: true, message: '请输入环境名称', trigger: 'blur' },
          { max: 50, message: '环境名称不能超过50个字符', trigger: 'blur' }
        ],
        remark: [
          { max: 200, message: '备注不能超过200个字符串长度', trigger: 'blur' }
        ]
      },
      // 提交按钮loading
      submitLoading: false,
      // 常量定义
      selectorClusters: []
    }
  },
  created () {
    this.envId = Number(this.$route.params.envId)
    this.loadEnvProfile()
    this.loadSelectorClusters()
  },
  methods: {
    // 加载环境信息
    loadEnvProfile () {
      const loading = this.$loading()
      envProfile(this.orgId, this.envId).then(res => {
        this.mainForm = {
          title: res.data.env.title,
          remark: res.data.env.remark,
          cluster_ids: res.data.env.clusters.map(item => Number(item.id))
        }
      }).finally(() => {
        loading.close()
      })
    },
    // 加载关联集群选项
    loadSelectorClusters () {
      clusterSimple(this.orgId).then(res => {
        this.selectorClusters = formatInArrayNumber(res.data.clusters, ['id'])
      })
    },
    // 提交表单
    submit () {
      this.$refs['main-form'].validate((valid) => {
        if (valid) {
          this.submitLoading = true
          envUpdate(
            this.orgId,
            this.envId,
            this.mainForm
          ).then(res => {
            this.$message.success('更新成功')
            this.goBack()
          }).finally(() => {
            this.submitLoading = false
          })
        }
      })
    },
    // 取消返回
    goBack () {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push({ name: 'Env' })
    }
  }
}
</script>

<style lang="scss" scoped>
.main-form {
  .form-item-control {
    width: 420px;
  }
}
.purpose-tip { margin-bottom: 20px; }
</style>
