<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />

    <div class="project-main" v-loading="loading">
      <easy-title title="基本信息" margin-set="0 20" />
      <el-empty v-if="!loading && !repository.id" description="当前项目没有关联代码仓库" />
      <el-descriptions
        v-else
        direction="vertical"
        :column="1"
        :colon="false"
        labelClassName="desc-label"
        contentClassName="desc-content">
        <el-descriptions-item label="仓库类型">
          {{ repository.type_name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="Git 服务商">
          {{ repository.provider_name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="仓库地址">
          <code>{{ repository.clone_url }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="默认分支">
          {{ repository.default_branch || 'main' }}
        </el-descriptions-item>
        <el-descriptions-item label="仓库数据读取">
          <el-tag size="small" type="success">Git Vendor API</el-tag>
          <span class="api-tip">分支、标签和提交信息不会通过构建集群临时 Clone 获取</span>
        </el-descriptions-item>
        <el-descriptions-item label="Webhook 状态">
          <el-tag size="small" :type="repository.webhook_status === 'configured' ? 'success' : 'info'">
            {{ repository.webhook_status === 'configured' ? '已配置' : '尚未确认' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="仓库链接">
          <a v-if="repository.web_url" :href="repository.web_url" target="_blank" rel="noopener noreferrer">
            <el-link type="primary">
              {{ repository.web_url }}
            </el-link>
          </a>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '../../components/EasyTitle'
import { routeBreadcrumb } from '@/utils/helpers'
import { projectRepositoryProfile } from '@/api/project'

export default {
  name: 'ProjectGitRepoProfile',
  components: {
    Breadcrumb,
    EasyTitle
  },
  props: {
    project: {
      type: Object,
      default: null
    },
    projectId: {
      type: [Number, String],
      required: true
    },
    groupId: {
      type: [Number, String],
      required: true
    },
    orgId: {
      type: [Number, String],
      required: true
    }
  },
  data () {
    return {
      // 常量定义
      loading: false,
      repository: {}
    }
  },
  created () {
    this.loadRepository()
  },
  computed: {
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: '开发', to: '' },
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  methods: {
    loadRepository () {
      this.loading = true
      projectRepositoryProfile(this.orgId, this.groupId, this.projectId).then(res => {
        this.repository = (res.data && res.data.repository) || {}
      }).finally(() => { this.loading = false })
    }
  }
}
</script>

<style lang="scss" scoped>
.api-tip { margin-left: 10px; color: #909399; font-size: 12px; }
</style>
