<template>
  <div class="wrapper-smscode">
    <div class="container">
      <project-login-header></project-login-header>
      <div v-if="client.id" class="authorize-box">
        <div class="authorize-target">
          <div class="authorize-avatar">
            <img :src="client.logo" alt="被授权客户端" class="avatar">
          </div>
          <div class="authorize-info">
            <div class="authorize-title">
              {{ client.name }}
            </div>
            <div class="authorize-desc">
              {{ client.desc }}
            </div>
          </div>
        </div>
        <div class="authorize-scopes">
          <div class="authorize-scopes-title">此第三方项目请求获取以下权限：</div>
          <div class="authorize-scopes-items">
            <div class="authorize-scopes-item">
              <el-checkbox checked disabled>访问您的帐号基本信息等</el-checkbox>
            </div>
            <el-checkbox-group v-model="checkedScopes">
              <div
                v-for="scope in selectorScopes"
                :key="scope"
                class="authorize-scopes-item">
                <el-checkbox :label="scope">{{ scopesTitles[scope] || scope }}</el-checkbox>
              </div>
            </el-checkbox-group>
          </div>
        </div>
        <div class="authorize-buttons">
          <el-button size="small" type="primary" @click="submitAuthorize">同意授权</el-button>
          <el-button size="small" style="width: 7em; margin-left: 30px;" @click="rejectAuthorize">拒绝</el-button>
        </div>
      </div>
      <div v-else class="authorize-loading">
        授权信息加载中...
      </div>
    </div>
  </div>
</template>

<script>
import { preAuthorize, authorize } from '@/api/oauth2'
import ProjectLoginHeader from './components/LoginHeader'
import { objForeach } from '@/utils/helpers'

export default {
  name: 'LoginAuthorize',
  components: { ProjectLoginHeader },
  data () {
    return {
      client: {
        id: null,
        name: 'Git',
        logo: process.env.VUE_APP_OAUTH_CLIENT_LOGO || '',
        desc: '客户端描述客户端描述客户端描述客户端描述',
        scopes: 'write,read',
        homepage: ''
      },
      scopesTitles: {
        read: '只读权限',
        write: '读写权限'
      },
      checkedScopes: [],
      params: {
        clientId: null,
        redirectUri: null,
        responseType: 'code',
        state: null
      },
      redirect: null
    }
  },
  computed: {
    selectorScopes () {
      if (!this.client.scopes) {
        return []
      }

      return this.client.scopes.split(',')
    }
  },
  created () {
    const clientId = this.$route.query.client_id
    if (!clientId) {
      return this.$message.error('缺少client_id参数')
    }
    const redirectUri = this.$route.query.redirect_uri || ''
    const responseType = this.$route.query.response_type
    if (!responseType) {
      return this.$message.error('缺少response_type参数')
    }
    const state = this.$route.query.state || ''
    this.params = {
      clientId,
      redirectUri,
      responseType,
      state
    }

    this.loadPreAuthorize()
  },
  methods: {
    // 预授权
    loadPreAuthorize () {
      const loading = this.$loading()
      preAuthorize(
        this.params.clientId,
        this.params.responseType,
        this.params.redirectUri,
        this.params.state
      ).then(res => {
        this.redirect = res.data.redirect
        if (res.data.client) {
          this.client = res.data.client
        } else {
          location.href = this.redirect
        }
      }).finally(() => {
        loading.close()
      })
    },
    // 提交申请授权
    submitAuthorize () {
      const loading = this.$loading()
      authorize(
        this.params.clientId,
        this.params.responseType,
        this.params.redirectUri,
        this.params.state,
        this.checkedScopes.join(',')
      ).then(res => {
        this.redirect = res.data.redirect
        location.href = this.redirect
      }).finally(() => {
        loading.close()
      })
    },
    // 拒绝授权
    rejectAuthorize () {
      const parts = this.redirect.split('?')
      const query = {
        error: 403,
        message: 'user reject authorize'
      }
      if (parts[1]) {
        parts[1].split('&').forEach(item => {
          const itemParts = item.split('=')
          if (!itemParts[0] || query[itemParts[0]]) {
            return false
          }
          query[itemParts[0]] = decodeURIComponent(itemParts[1] || '')
        })
      }

      const queryStr = objForeach(query, (key, value) => `${key}=${encodeURIComponent(value)}`).join('&')

      return `${parts[0]}?${queryStr}`
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss">
.wrapper-smscode {
  position: relative;
  width: 100%;
  height: 100%;
  background-image: url('../../assets/img/background.png');
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  background-origin: content-box;
  background-clip: content-box;
  background-attachment: fixed;
  .container {
    display: inline-block;
    padding: 25px 30px 36px;
    position: relative;
    z-index: 2;
    background: #fff;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    border-radius: 3px;
    width: 380px;
    height: 420px;
    position: absolute;
    top: -100px;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
  }
  .authorize-box {
    .authorize-target {
      position: relative;
      .authorize-avatar {
        .avatar {
          width: 60px;
          height: 60px;
        }
      }
      .authorize-info {
        position: absolute;
        left: 75px;
        top: 0;
        .authorize-title {
          font-size: 16px;
          font-weight: 450;
          margin-bottom: 10px;
        }
        .authorize-desc {
          font-size: 13px;
          color: #909399;
        }
      }
    }
    .authorize-scopes {
      margin-top: 30px;
      .authorize-scopes-title {
        margin-bottom: 10px;
      }
      .authorize-scopes-items {
        .authorize-scopes-item {
          padding: 3px 0;
        }
      }
    }
    .authorize-buttons {
      margin-top: 20px;
    }
  }
}

</style>
