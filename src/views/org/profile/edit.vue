<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="project-main">
      <easy-title title="基本信息" margin-set="0 20" />

      <el-form
        ref="main-form"
        class="main-form"
        label-position="right"
        label-width="100px"
        size="medium"
        :model="mainForm"
        :rules="mainFormRules"
        @submit.native.prevent="submit">
        <el-form-item label="组织名称" prop="title">
          <el-input
            v-model="mainForm.title"
            class="form-item-control"
            placeholder="组织名称"
            name="title" />
        </el-form-item>
        <el-form-item label="别名" prop="alias">
          <el-input
            v-model="mainForm.alias"
            disabled
            class="form-item-control"
            placeholder="别名，可为空" />
          <span class="little-tips tag-item-5">
            用于URL等场景，小写字母数字及-_组成，不可以数字-_开头以及-_结尾，不可超过50个字符串长度，全局唯一
          </span>
        </el-form-item>
        <el-form-item label="LOGO" prop="logo">
          <el-upload
            ref="avatar-uploader"
            class="avatar-uploader"
            :action="avatarUploadAction"
            :headers="avatarUpload.headers"
            :multiple="false"
            name="org_logo"
            accept=".jpg, .jpeg, .png"
            :show-file-list="false"
            :on-progress="handleAvatarProcess"
            :before-upload="beforeAvatarUpload"
            :on-change="handleAvatarChange"
            :on-success="handleAvatarSuccess"
            :on-error="handleAvatarError"
            :auto-upload="false">
            <img v-if="avatarUpload.previewSrc" :src="avatarUpload.previewSrc" class="avatar">
            <i v-else class="el-icon-plus avatar-uploader-icon"></i>
          </el-upload>
        </el-form-item>
        <el-form-item label="组织描述" prop="desc">
          <el-input
            v-model="mainForm.desc"
            :maxlength="500"
            show-word-limit
            :rows="5"
            type="textarea"
            class="form-item-textarea"
            placeholder="组织描述"
            name="desc" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitLoading" @click="submit" style="margin-right: 60px;">更新</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import EasyTitle from '../../components/EasyTitle'
import Breadcrumb from '../../components/Breadcrumb'
import { orgProfile, orgProfileUpdate } from '@/api/org'
import { orgLogo } from '@/utils/filters'
import { ALIAS_REGEX } from '@/consts/org'
import { routeBreadcrumb, routeBreadcrumbFind } from '@/utils/helpers'

export default {
  name: 'UserMyOrgCreate',
  components: {
    EasyTitle,
    Breadcrumb
  },
  data () {
    return {
      mainForm: {
        title: null,
        alias: null,
        logo: null,
        desc: null
      },
      // 头像上传
      avatarUpload: {
        headers: {
          Authorization: 'Bearer ' + this.$store.state.user.token
        },
        previewSrc: null
      },
      // 提交按钮loading
      submitLoading: false
    }
  },
  computed: {
    orgId () {
      return this.$store.getters.orgId
    },
    avatarUploadAction () {
      return process.env.VUE_APP_BASE_API + 'org/logo/upload?org=' + this.orgId
    },
    mainFormRules () {
      const rules = {
        title: [
          { required: true, message: '请输入组织名称', trigger: 'blur' },
          { max: 50, message: '组织名称不能超过50个字符串长度', trigger: 'blur' }
        ],
        logo: [
          { required: true, message: '请上传组织LOGO', trigger: 'blur' }
        ],
        desc: [
          { max: 500, message: '组织描述不能超过500个字符串长度', trigger: 'blur' }
        ],
        alias: [
          { max: 50, message: '别名不可超过50个字符串长度', trigger: 'blur' },
          { type: 'string', pattern: ALIAS_REGEX, message: '小写字母数字及-_组成，不可以数字-_开头以及-_结尾', trigger: 'blur' }
        ]
      }
      return rules
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        routeBreadcrumbFind(this, { name: 'OrgProfile' }),
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  created () {
    // 加载组织信息
    this.loadOrgProfile()
  },
  methods: {
    // 加载组织信息
    loadOrgProfile () {
      const loading = this.$loading()
      orgProfile(this.orgId).then(res => {
        this.mainForm = {
          id: res.data.org.id,
          title: res.data.org.title,
          alias: res.data.org.alias,
          logo: res.data.org.logo || '',
          desc: res.data.org.desc
        }
        this.avatarUpload.previewSrc = orgLogo(this.mainForm.logo, '100x100')
      }).finally(() => {
        loading.close()
      })
    },
    // 提交表单
    submit () {
      this.$refs['main-form'].validate((valid) => {
        if (valid) {
          this.submitLoading = true
          const file = this.$refs['avatar-uploader'].uploadFiles.filter(file => file).pop()
          this.$refs['avatar-uploader'].uploadFiles = file ? [file] : []

          if (!file) {
            // 没有上传LOGO，直接更新
            this.updateOrg().then(res => {
              this.$message.success('更新成功')
              this.goBack()
            }).finally(() => {
              this.submitLoading = false
            })
          } else {
            this.$refs['avatar-uploader'].submit()
          }
        }
      })
    },
    // 更新组织组织
    updateOrg () {
      const form = {
        title: this.mainForm.title,
        logo: this.mainForm.logo,
        desc: this.mainForm.desc,
        alias: this.mainForm.alias
      }
      return new Promise((resolve, reject) => {
        orgProfileUpdate(this.mainForm.id, form).then(res => {
          resolve(res)
        }).catch(err => {
          reject(err)
        })
      })
    },
    // 选择头像/上传成功失败
    handleAvatarChange (file, fileList) {
      if (file.status == 'ready') {
        this.avatarUpload.previewSrc = URL.createObjectURL(file.raw)
        this.mainForm.logo = this.avatarUpload.previewSrc
      }
    },
    // 上传成功
    handleAvatarSuccess (resp, file, fileList) {
      if (file.response.code) {
        // 修复组件上传失败无法重新上传的bug
        file.status = 'ready'
        this.submitLoading = false
        return this.$message.error(`LOGO上传失败：${file.response.msg}(${file.response.code})`)
      }
      this.mainForm.logo = file.response.data.logo
      this.updateOrg().then(res => {
        this.$message.success('更新成功')
        this.goBack()
      }).finally(() => {
        this.submitLoading = false
      })
    },
    // 上传失败
    handleAvatarError (err, file, fileList) {
      // 修复组件上传失败无法重新上传的bug
      file.status = 'ready'
      this.$message.error(`LOGO上传失败：${err.message.slice(20)}`)
      console.error('LOGO上传失败：', err)
      this.submitLoading = false
    },
    // 进度条
    handleAvatarProcess (event, file, fileList) {
      // do nothing
    },
    // 上传之前校验等
    beforeAvatarUpload (file) {
      const isLt2M = file.size / 1024 / 1024 < 2
      if (!isLt2M) {
        this.$message.error('上传头像图片大小不能超过 2MB!')
        this.submitLoading = false
        this.avatarUpload.previewSrc = orgLogo(this.mainForm.logo, '100x100')
      }
      return isLt2M
    },
    // 取消返回
    goBack () {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push({ path: '/user/myorg' })
    }
  }
}
</script>

<style lang="scss" scoped>
.project-main {
  width: 100%;
  background: #fff;
  padding: 25px 15px;
  .main-form {
    .form-item-control {
      width: 240px;
    }
    .form-item-textarea {
      width: 500px;
    }
  }
}

.box-shadow {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
</style>

<style lang="scss">
.project-main {
  .avatar-uploader .el-upload {
    border: 1px dashed #d9d9d9;
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }
  .avatar-uploader .el-upload:hover {
    border-color: #409EFF;
  }
  .avatar-uploader-icon {
    font-size: 28px;
    color: #8c939d;
    width: 100px;
    height: 100px;
    line-height: 100px;
    text-align: center;
  }
  .avatar {
    width: 100px;
    height: 100px;
    display: block;
  }
}
</style>
