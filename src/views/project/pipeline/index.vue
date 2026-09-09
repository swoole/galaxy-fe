<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <div class="project-main">
      <easy-title title="镜像构建流水线" margin-set="0 20" />
      <div class="toolbar">
        <router-link :to="{ name: 'ProjectPipelineCreate', params: { groupId, projectId } }">
          <el-button v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role)" type="primary" size="small">
            新建流水线
          </el-button>
        </router-link>
        <el-input
          v-model.trim="keyword"
          class="search"
          size="small"
          clearable
          placeholder="名称或 ID"
          @keyup.enter.native="search">
          <el-button slot="append" icon="el-icon-search" @click="search" />
        </el-input>
      </div>
      <el-table v-loading="loading" :data="rows" fit>
        <el-table-column label="名称" min-width="220">
          <template #default="{ row }">
            <router-link :to="{ name: 'ProjectPipelineProfile', params: { groupId, projectId, pipelineId: row.id } }">
              <el-link type="primary">{{ row.title }}</el-link>
              <el-tag v-if="row.is_default" size="mini" type="success">默认</el-tag>
            </router-link>
            <div class="secondary">#{{ row.id }} · {{ row.schema_version }} · {{ row.runner_kind }}</div>
          </template>
        </el-table-column>
        <el-table-column label="构建集群" width="180">
          <template #default="{ row }">{{ clusterName(row.cluster_id) }}</template>
        </el-table-column>
        <el-table-column label="创建人" width="150" align="center">
          <template #default="{ row }"><org-user :user="row.creator_info" /></template>
        </el-table-column>
        <el-table-column label="更新时间" width="180" align="center">
          <template #default="{ row }">{{ (row.updated_at || row.created_at) | formatDate }}</template>
        </el-table-column>
        <el-table-column label="操作" width="230" align="center">
          <template #default="{ row }">
            <router-link :to="{ name: 'ProjectBuild', params: { groupId, projectId }, query: { pipeline_id: row.id } }">
              <el-link type="primary">构建记录</el-link>
            </router-link>
            <template v-if="$p('project.no_viewer', project.org_role, project.group_role, project.role)">
              <el-divider direction="vertical" />
              <router-link :to="{ name: 'ProjectPipelineEdit', params: { groupId, projectId, pipelineId: row.id } }">
                <el-link type="primary">编辑</el-link>
              </router-link>
              <el-divider direction="vertical" />
              <el-link type="danger" @click="remove(row)">归档</el-link>
            </template>
          </template>
        </el-table-column>
      </el-table>
      <pagination
        v-show="total > 0"
        :total="total"
        :page.sync="page"
        :limit.sync="pageSize"
        @pagination="load" />
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import OrgUser from '@/views/components/OrgUser'
import Pagination from '@/components/Pagination'
import { pipelineDelete, pipelineOptions, pipelines } from '@/api/pipeline'
import { formatDate } from '@/utils/filters'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'ProjectPipeline',
  components: { Breadcrumb, EasyTitle, OrgUser, Pagination },
  filters: { formatDate },
  props: {
    project: { type: Object, default: null },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return { rows: [], clusters: [], loading: false, keyword: '', page: 1, pageSize: 20, total: 0 }
  },
  computed: {
    breadcrumb () {
      return [...routeBreadcrumb(this), { title: '构建', to: '' }, { title: '流水线', to: '' }]
    }
  },
  created () {
    pipelineOptions(this.orgId, this.groupId, this.projectId).then(res => { this.clusters = res.data.clusters || [] })
    this.load()
  },
  methods: {
    load () {
      this.loading = true
      pipelines(this.orgId, this.groupId, this.projectId, this.keyword, this.page, this.pageSize).then(res => {
        this.rows = res.data.data || []
        this.total = Number(res.data.total || 0)
        this.page = Number(res.data.page || 1)
        this.pageSize = Number(res.data.pagesize || 20)
      }).finally(() => { this.loading = false })
    },
    search () {
      this.page = 1
      this.load()
    },
    clusterName (id) {
      const cluster = this.clusters.find(item => Number(item.id) === Number(id))
      return cluster ? cluster.title : `#${id}`
    },
    remove (row) {
      this.$confirm(`确定归档流水线“${row.title}”吗？归档后不能再用于新构建，但历史构建仍会保留关联。`, '归档流水线', { type: 'warning' }).then(() => {
        pipelineDelete(this.orgId, this.groupId, this.projectId, row.id).then(() => {
          this.$message.success('流水线已归档')
          this.load()
        })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.toolbar { display: flex; justify-content: space-between; margin-bottom: 18px; }
.search { width: 320px; }
.secondary { margin-top: 5px; color: #909399; font-size: 12px; }
</style>
