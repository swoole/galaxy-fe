<template>
  <div class="app-container">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="app-main">
      <el-alert
        v-if="loadError"
        title="加载模板详情失败"
        type="error"
        description="请确认模板存在或检查网络连接后重试。"
        show-icon
        closable
        style="margin-bottom: 16px" />
      <div class="market-tpl-main">
        <div class="market-tpl-logo">
          <img :src="profile.logo" :alt="`${profile.title}的LOGO`" class="market-tpl-logo-img" @error="$event.target.src='/app-market/logos/web.svg'">
        </div>
        <div class="market-tpl-body">
          <div class="market-tpl-title">
            {{ profile.title }}
            <el-tag v-if="profile.type && APP_MARKET_TYPES[profile.type]" class="market-tpl-type" size="mini" type="success">
              {{ APP_MARKET_TYPES[profile.type].label }}
            </el-tag>
          </div>
          <div class="market-tpl-version">
            <span class="market-tpl-label">版本：</span>
            <span class="market-tpl-desc">{{ profile.version }}（最后更新于{{ profile.updated_at | formatDate }}）</span>
          </div>
          <div class="market-tpl-intro">
            <span class="market-tpl-label">简介：</span>
            <span class="market-tpl-desc">{{ profile.intro }}</span>
          </div>
          <div class="market-tpl-note">
            <div class="market-tpl-note-item market-tpl-note-createdat">
              <span class="market-tpl-label">创建时间：</span>
              <span class="market-tpl-desc">{{ profile.created_at | formatDate }}</span>
            </div>
            <div class="market-tpl-note-item market-tpl-note-used">
              <span class="market-tpl-label">使用量：</span>
              <span class="market-tpl-desc">{{ profile.used }}</span>
            </div>
            <div class="market-tpl-note-item market-tpl-note-viewed">
              <span class="market-tpl-label">浏览量：</span>
              <span class="market-tpl-desc">{{ profile.viewed }}</span>
            </div>
          </div>
          <div class="market-tpl-tags">
            <el-tag
              v-for="(iTag, tagIndex) in profile.tags"
              :key="tagIndex"
              class="market-tpl-tag"
              size="mini"
              :type="iTag.style.type">{{ iTag.title }}</el-tag>
          </div>
        </div>
      </div>

      <div class="market-tpl-depends">
        <easy-title title="依赖" margin-set="0 10"></easy-title>
        <div class="market-tpl-depends-items">
          <div v-if="profile.client_config && profile.client_config.resource" class="market-tpl-depends-item">
            <div class="market-tpl-depends-item-header">
              云计算资源
              <el-tag size="mini" type="primary">运行环境</el-tag>
            </div>
            <div class="market-tpl-depends-item-desc">
              CPU：{{ profile.client_config.resource.limit_cpu / 1000 | formatNumber(3) }} 核
              <span style="margin-left: 10px">
                内存：{{ profile.client_config.resource.limit_mem | formatBytes(2, [' M', ' G', ' T']) }}
              </span>
            </div>
          </div>
          <div v-for="(iDep, index) in (profile.depends && profile.depends.depends ? profile.depends.depends : [])" :key="`${index}`" class="market-tpl-depends-item">
            <div class="market-tpl-depends-item-header">
              {{ iDep.title }}
              <el-tag v-if="iDep.is_dev" size="mini" type="primary">开发依赖</el-tag>
            </div>
            <div class="market-tpl-depends-item-desc">{{ iDep.reason }}</div>
          </div>
        </div>
      </div>

      <div class="market-tpl-details">
        <easy-title title="详情" margin-set="0 10"></easy-title>
        <div ref="details-markdown" class="market-tpl-details-markdown markdown-body">
        </div>
      </div>
    </div>

    <div class="market-tpl-operators">
      <el-tooltip
        :disabled="profile.installable"
        content="该模板暂未提供自动安装器"
        placement="top">
        <span>
          <el-button
            type="primary"
            size="small"
            :disabled="!profile.installable"
            style="margin-right: 5px"
            @click="handleUse">{{ profile.installable ? '安装' : '暂不可安装' }}</el-button>
        </span>
      </el-tooltip>
      <el-button type="info" size="small" @click="handleReselect">返回</el-button>
    </div>

    <template v-if="profile.id">
      <tpl-use-swarm
        v-if="profile.orchestrator == 'docker-swarm'"
        ref="tpl-use"
        :orgId="orgId"
        :profile="profile" />
      <tpl-use-kubernetes
        v-else-if="profile.orchestrator == 'kubernetes'"
        ref="tpl-use"
        :orgId="orgId"
        :profile="profile" />
    </template>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import { formatDate, formatBytes, formatNumber } from '@/utils/filters'
import EasyTitle from '@/views/components/EasyTitle'
import 'github-markdown-css/github-markdown-light.css'
import MarkdownIt from 'markdown-it'
import {
  appMarketTplProfile
} from '@/api/app'
import {
  APP_MARKET_TYPES,
  APP_MARKET_TYPE_APP
} from '@/consts/app'
import TplUseSwarm from './components/TplUseSwarm.vue'
import TplUseKubernetes from './components/TplUseKubernetes.vue'
import { routeBreadcrumb, routeBreadcrumbFind } from '@/utils/helpers'

export default {
  name: 'AppMarketProfile',
  components: {
    Breadcrumb,
    EasyTitle,
    TplUseSwarm,
    TplUseKubernetes
  },
  filters: {
    formatDate,
    formatBytes,
    formatNumber
  },
  data () {
    return {
      tplId: null,
      loadError: false,
      profile: {
        type: APP_MARKET_TYPE_APP,
        tags: [],
        config: {},
        depends: {
          depends: []
        }
      },
      // 常量定义
      APP_MARKET_TYPES
    }
  },
  computed: {
    orgId () {
      return this.$store.getters.orgId
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        routeBreadcrumbFind(this, { name: 'AppMarket' }),
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  created () {
    this.tplId = parseInt(this.$route.params.tplId)

    // 加载详情
    this.loadProfile()
  },
  methods: {
    // 加载详情
    loadProfile () {
      const loading = this.$loading()
      appMarketTplProfile(this.tplId).then(res => {
        this.profile = res.data.profile
        this.loadError = false
        this.$nextTick(() => {
          const md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true
          })
          md.linkify.set({ fuzzyEmail: false })
          const el = this.$refs['details-markdown']
          if (el && this.profile.details) {
            el.innerHTML = md.render(this.profile.details)
          }
        })
      }).catch(err => {
        this.loadError = true
        this.$message.error(err.response?.data?.message || err.message || '加载模板详情失败')
      }).finally(() => {
        loading.close()
      })
    },
    // 重新选择
    handleReselect () {
      this.$router.push({ name: 'AppMarket' })
    },
    // 使用此模板
    handleUse () {
      if (!this.orgId) {
        return this.$message.error('该功能需要进入组织之后才能使用，请加入组织或者创建组织，并切换到该组织中')
      }
      this.$refs['tpl-use'].open()
    }
  }
}
</script>

<style lang="scss" scoped>
.app-container {
  position: relative;
  padding-bottom: 70px;
}
.app-main {
}
.market-tpl-main {
  .market-tpl-logo {
    float: left;
    margin-top: 10px;
    width: 80px;
    height: 80px;
    .market-tpl-logo-img {
      width: 100%;
      height: 100%;
    }
  }
  .market-tpl-body {
    margin-left: 100px;
    .market-tpl-title {
      margin-bottom: 10px;
      font-size: 16px;
      font-weight: 450;
    }
    .market-tpl-type {
    }
    .market-tpl-version {
      font-size: 13px;
      margin-bottom: 5px;
    }
    .market-tpl-intro {
      font-size: 13px;
      line-height: 1.5em;
      margin-bottom: 5px;
    }
    .market-tpl-note {
      margin-bottom: 15px;
      .market-tpl-note-item {
        display: inline-block;
        font-size: 13px;
        &:not(:first-child) {
          margin-left: 20px;
        }
      }
    }
  }
  .market-tpl-tags {
    .market-tpl-tag {
      &:not(:first-child) {
        margin-left: 6px;
      }
    }
  }
  .market-tpl-label {
    color: #000;
    font-weight: 400;
  }
  .market-tpl-desc {
    color: #909399;
  }
}
.market-tpl-depends {
  margin-top: 20px;
  .market-tpl-depends-items {
    .market-tpl-depends-item {
      margin-bottom: 10px;
      .market-tpl-depends-item-header{
        font-size: 14px;
        margin-bottom: 5px;
        &::before {
          content: '•';
          margin-right: 5px;
        }
      }
      .market-tpl-depends-item-desc {
        font-size: 13px;
        line-height: 1.5em;
        text-indent: 2em;
        color: #909399;
      }
    }
  }
}
.market-tpl-details {
  margin-top: 20px;
  .market-tpl-details-markdown {
    box-sizing: border-box;
    padding: 20px;
  }
}
@media (max-width: 767px) {
  .market-tpl-details-markdown {
    padding: 15px;
  }
}
.market-tpl-operators {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99;
  background: #fff;
  padding: 20px 40px;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
}
</style>
