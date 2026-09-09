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
        <el-form-item label="项目组名称" prop="title">
          <el-input
            v-model="mainForm.title"
            class="form-item-control"
            placeholder="项目组名称"
            name="title" />
        </el-form-item>
        <el-form-item label="别名" prop="alias">
          <el-input
            v-model="mainForm.alias"
            disabled
            class="form-item-control"
            placeholder="别名，可为空"
            style="width: 300px;" />
          <span class="little-tips tag-item-5">
            用于URL等场景，小写字母数字及-_组成，不可以数字-_开头以及-_结尾，不可超过50个字符串长度，组织内唯一
          </span>
        </el-form-item>
        <el-form-item label="项目组描述" prop="desc">
          <el-input
            v-model="mainForm.desc"
            :maxlength="200"
            show-word-limit
            :rows="5"
            type="textarea"
            class="form-item-control form-item-textarea"
            placeholder="项目组描述"
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
import { groupUpdate, groupProfile } from '@/api/group'
import { ALIAS_REGEX } from '@/consts/org'
import { routeBreadcrumb, routeBreadcrumbFind } from '@/utils/helpers'

export default {
  name: 'GroupEdit',
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
        routeBreadcrumbFind(this, { name: 'Group' }),
        routeBreadcrumbFind(this, { name: 'GroupProfile' }, { groupId: this.groupId }),
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  data () {
    return {
      groupId: 0,
      mainForm: {
        title: null,
        desc: null,
        alias: null
      },
      mainFormRules: {
        title: [
          { required: true, message: '请输入项目组名称', trigger: 'blur' },
          { max: 50, message: '项目组名称不能超过50个字符串长度', trigger: 'blur' }
        ],
        desc: [
          { max: 200, message: '项目组描述不能超过200个字符串长度', trigger: 'blur' }
        ],
        alias: [
          { max: 50, message: '别名不可超过50个字符串长度', trigger: 'blur' },
          { type: 'string', pattern: ALIAS_REGEX, message: '小写字母数字及-_组成，不可以数字-_开头以及-_结尾', trigger: 'blur' }
        ]
      },
      // 提交按钮loading
      submitLoading: false
    }
  },
  created () {
    this.groupId = this.$route.params.groupId

    this.getGroupProfile()
  },
  methods: {
    // 获取项目组信息
    getGroupProfile () {
      groupProfile(
        this.orgId,
        this.groupId
      ).then(res => {
        this.mainForm = {
          title: res.data.group.title,
          desc: res.data.group.desc,
          alias: res.data.group.alias
        }
      })
    },
    // 提交表单
    submit () {
      this.$refs['main-form'].validate((valid) => {
        if (valid) {
          this.submitLoading = true
          groupUpdate(
            this.orgId,
            this.groupId,
            this.mainForm.title,
            this.mainForm.desc,
            this.mainForm.alias
          ).then(res => {
            this.$message.success('更新成功')
            const group = res.data.group
            this.$router.push({ name: 'GroupProfile', params: { groupId: group.alias || group.id } })
          }).finally(() => {
            this.submitLoading = false
          })
        }
      })
    },
    // 取消返回
    goBack () {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push({ name: 'GroupProfile', params: { groupId: this.groupId } })
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
</style>
