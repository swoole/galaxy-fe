<template>
  <div class="user-main box-shadow">
    <easy-title title="基本信息" margin-set="0 20" />

    <el-form
      class="main-form"
      label-position="right"
      label-width="100px"
      size="medium"
      :model="mainForm"
      @submit.native.prevent="uploadAndSubmit">
      <el-form-item label="头像">
        <el-upload
          ref="avatar-uploader"
          class="avatar-uploader"
          :action="avatarUploadAction"
          :headers="avatarUpload.headers"
          :multiple="false"
          name="avatar"
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
      <el-form-item label="名称">
        <el-input
          v-model="mainForm.nickname"
          class="form-item-control"
          placeholder="名称"
          name="nickname" />
      </el-form-item>
      <el-form-item label="性别">
        <el-radio-group v-model="mainForm.gender" name="gender">
          <el-radio :label="1">男</el-radio>
          <el-radio :label="2">女</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="公司">
        <el-input
          v-model="mainForm.company"
          class="form-item-control"
          placeholder="公司"
          name="company" />
      </el-form-item>
      <el-form-item label="职务">
        <el-input
          v-model="mainForm.position"
          class="form-item-control"
          placeholder="职务"
          name="position" />
      </el-form-item>
      <el-form-item label="微信">
        <el-input
          v-model="mainForm.wechat"
          class="form-item-control"
          placeholder="微信"
          name="wechat" />
      </el-form-item>
      <el-form-item label="QQ">
        <el-input
          v-model="mainForm.qq"
          class="form-item-control"
          placeholder="QQ"
          name="qq" />
      </el-form-item>
      <el-form-item label="所在地">
        <el-cascader
          v-model="mainForm.city"
          class="form-item-control"
          name="city"
          :options="mainCitys"
          filterable
          clearable />
      </el-form-item>
      <el-form-item label="自我介绍">
        <el-input
          v-model="mainForm.introduce"
          :maxlength="200"
          show-word-limit
          type="textarea"
          class="form-item-textarea"
          placeholder="自我介绍"
          name="introduce" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitLoading" @click="uploadAndSubmit">更新</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import EasyTitle from '../components/EasyTitle'
import { userProfile, userProfileUpdate } from '@/api/user'
import { province, city } from 'province-city-china/data'
import { userAvatar } from '@/utils/filters'

export default {
  name: 'UserProfile',
  components: {
    EasyTitle
  },
  computed: {
    avatarUploadAction () {
      return process.env.VUE_APP_BASE_API + 'user/avatar/upload?org=' + this.$store.getters.orgId
    }
  },
  filters: {
    userAvatar
  },
  data () {
    return {
      mainForm: {
        nickname: null,
        avatar: null,
        gender: 0,
        company: null,
        position: null,
        wechat: null,
        qq: null,
        city: null,
        introduce: null
      },
      srcAvatar: null,
      // 头像上传
      avatarUpload: {
        headers: {
          Authorization: 'Bearer ' + this.$store.state.user.token
        },
        previewSrc: null
      },
      // 提交按钮loading
      submitLoading: false,
      // 主要城市
      mainCitys: []
    }
  },
  created () {
    this.loadUserProfile()
    this.genCitys()
  },
  methods: {
    // 加载用户信息
    loadUserProfile () {
      userProfile().then(res => {
        const profile = res.data.user
        if (profile.city) {
          profile.city = profile.city.split('/')
        }
        this.mainForm = profile
        this.srcAvatar = profile.avatar

        if (profile.avatar) {
          this.avatarUpload.previewSrc = userAvatar(profile.avatar, '100x100')
        }
      })
    },
    // 上传头像|更新用户信息
    uploadAndSubmit () {
      this.submitLoading = true
      const file = this.$refs['avatar-uploader'].uploadFiles.filter(file => file).pop()
      this.$refs['avatar-uploader'].uploadFiles = file ? [file] : []

      if (this.mainForm.avatar === null && file) {
        // 先上传，后更新
        this.$refs['avatar-uploader'].uploadFiles = [
          this.$refs['avatar-uploader'].uploadFiles.pop()
        ]
        this.$refs['avatar-uploader'].submit()
      } else {
        // 直接更新
        this.updateUserProfile().then(res => {
          this.$message.success('更新成功')
        }).finally(() => {
          this.submitLoading = false
        })
      }
    },
    // 更新用户信息
    updateUserProfile () {
      const profile = {
        nickname: this.mainForm.nickname,
        avatar: this.mainForm.avatar,
        gender: this.mainForm.gender,
        company: this.mainForm.company,
        position: this.mainForm.position,
        wechat: this.mainForm.wechat,
        qq: this.mainForm.qq,
        city: this.mainForm.city.length > 0 ? this.mainForm.city.join('/') : '',
        introduce: this.mainForm.introduce
      }
      return new Promise((resolve, reject) => {
        userProfileUpdate(profile).then(res => {
          // 更新用户信息
          this.$store.dispatch('user/updateUserProfile', {
            id: Number(res.data.user.uid),
            email: res.data.user.email,
            nickname: res.data.user.nickname,
            avatar: res.data.user.avatar
          }).then((res) => {
            resolve(res)
          }).finally(() => {
            this.formLoading = false
          })
        }).catch(err => {
          reject(err)
        })
      })
    },
    // 选择头像/上传成功失败
    handleAvatarChange (file, fileList) {
      if (file.status == 'ready') {
        this.mainForm.avatar = null
        this.avatarUpload.previewSrc = URL.createObjectURL(file.raw)
      }
    },
    // 上传成功
    handleAvatarSuccess (resp, file, fileList) {
      if (file.response.code) {
        // 修复组件上传失败无法重新上传的bug
        file.status = 'ready'
        this.submitLoading = false
        return this.$message.error(`头像上传失败：${file.response.msg}(${file.response.code})`)
      }
      this.mainForm.avatar = file.response.data.avatar
      this.updateUserProfile().then(res => {
        this.$message.success('更新成功')
      }).finally(() => {
        this.submitLoading = false
      })
    },
    // 上传失败
    handleAvatarError (err, file, fileList) {
      // 修复组件上传失败无法重新上传的bug
      file.status = 'ready'
      this.$message.error(`头像上传失败：${err.message.slice(20)}`)
      console.error('头像上传失败：', err)
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
        this.avatarUpload.previewSrc = userAvatar(this.srcAvatar, '100x100')
        this.$set(this.mainForm, 'avatar', this.srcAvatar)
        return false
      }
      return isLt2M
    },
    // 解析生成省市数据
    genCitys () {
      const pCitys = {}
      city.forEach(item => {
        if (!pCitys[item.province]) {
          pCitys[item.province] = []
        }
        pCitys[item.province].push({
          label: item.name,
          value: item.name,
          code: item.city
        })
      })

      const pProvinces = []
      province.forEach(item => {
        let children = null
        if (pCitys[item.province]) {
          children = pCitys[item.province].sort((a, b) => a.code - b.code)
        }
        pProvinces.push({
          label: item.name,
          value: item.name,
          children,
          code: item.province
        })
      })

      this.mainCitys = pProvinces.sort((a, b) => a.code - b.code)
    }
  }
}
</script>

<style lang="scss" scoped>
.user-main {
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
.user-main {
  .avatar-uploader .el-upload {
    border: 1px dashed #d9d9d9;
    border-radius: 50px;
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
    border-radius: 50px;
    display: block;
  }
}
</style>
