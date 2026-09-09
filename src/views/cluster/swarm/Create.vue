<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="project-main">
      <easy-title title="创建 Docker Swarm 集群" margin-set="0 20" />

      <el-form
        ref="main-form"
        class="main-form"
        label-position="right"
        label-width="120px"
        size="medium"
        :model="mainForm"
        :rules="mainFormRules"
        @submit.native.prevent="submit">
        <el-form-item label="集群名称" prop="title">
          <el-input
            v-model.trim="mainForm.title"
            class="form-item-control"
            maxlength="20"
            show-word-limit
            placeholder="集群名称"
            name="title" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="mainForm.remark"
            class="form-item-control"
            maxlength="2000"
            show-word-limit
            :rows="4"
            type="textarea"
            placeholder="备注" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitLoading" @click="submit">创建集群</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import EasyTitle from '@/views/components/EasyTitle'
import Breadcrumb from '@/views/components/Breadcrumb'
import { routeBreadcrumb, routeBreadcrumbFind } from '@/utils/helpers'
import { clusterCreate } from '@/api/cluster'

export default {
  name: 'ClusterSwarmCreate',
  components: {
    EasyTitle,
    Breadcrumb
  },
  data () {
    return {
      mainForm: {
        title: '',
        remark: ''
      },
      mainFormRules: {
        title: [
          { required: true, message: '请输入集群名称', trigger: 'blur' },
          { max: 20, message: '集群名称不能超过20个字符', trigger: 'blur' }
        ]
      },
      submitLoading: false
    }
  },
  computed: {
    orgId () {
      return this.$store.getters.orgId
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        routeBreadcrumbFind(this, { name: 'ClusterSwarmList' }),
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  methods: {
    submit () {
      this.$refs['main-form'].validate(valid => {
        if (!valid) return
        this.submitLoading = true
        clusterCreate(this.orgId, this.mainForm).then(res => {
          this.$message.success('集群已创建，请连接 Galaxy Agent')
          this.$router.replace({
            name: 'ClusterSwarmAgent',
            params: { clusterId: Number(res.data.cluster_id) }
          })
        }).finally(() => {
          this.submitLoading = false
        })
      })
    },
    goBack () {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push({ name: 'ClusterSwarmList' })
    }
  }
}
</script>

<style lang="scss" scoped>
.main-form {
  max-width: 760px;

  .form-item-control {
    width: 520px;
    max-width: 100%;
  }
}
</style>
