<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="project-main">
      <div class="table-tools">
        <div class="table-tools-left">
          <router-link v-if="$p('group.create', orgRole)" :to="{ name: 'GroupAdd' }">
            <el-button type="primary" size="small">新建项目组</el-button>
          </router-link>
        </div>
        <div class="table-tools-right">
          <el-input
            v-model="filterForm.keyword"
            placeholder="请输入项目组名称、标识、ID进行搜索"
            class="table-tools-filter table-tools-input-keyword"
            size="small"
            clearable
            @keyup.enter.native="handleFilter">
            <el-button slot="append" type="primary" size="small" icon="el-icon-search" @click="handleFilter">
              搜索
            </el-button>
          </el-input>
        </div>
      </div>

      <el-table
        style="width: 100%; margin-top: 20px; "
        :data="tableData"
        v-loading="tableLoading"
        fit
        highlight-current-row
      >
        <el-table-column
          label="名称"
        >
          <template #default="{ row }">
            <router-link :to="{ name: 'GroupProfile', params: { groupId: row.alias || row.id }}">
              <el-link type="primary">{{ row.title }}</el-link>
            </router-link>
          </template>
        </el-table-column>
        <el-table-column
          prop="alias"
          label="别名"
          width="160">
          <template #default="{ row }">
            <el-tag v-if="!row.alias" size="mini" type="warning">未设置</el-tag>
            <template v-else>{{ row.alias }}</template>
          </template>
        </el-table-column>
        <el-table-column
          label="项目总数"
          prop="project_count"
          align="center"
        >
          <template #default="{ row }">
            <router-link :to="{ name: 'Project', query: { group: row.alias || row.id } }">
              <el-link type="primary">{{ row.project_count }}</el-link>
            </router-link>
          </template>
        </el-table-column>

        <el-table-column
          label="成员总数"
          prop="project_count"
          align="center"
        >
          <template #default="{ row }">
            <router-link :to="{ name: 'GroupMember', params: { groupId: row.alias || row.id } }">
              <el-link type="primary">{{ row.member_count }}</el-link>
            </router-link>
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
          prop="created_at"
          align="center"
        >
          <template #default="{ row }">
            {{ row.created_at | formatDate }}
          </template>
        </el-table-column>
        <el-table-column
          label="负责人"
          prop="creator.realname"
          align="center"
        >
          <template #default="{ row }">
            <org-user :user="row.creator_info" />
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          align="center"
        >
          <template #default="{ row }">
            <router-link :to="{ name: 'Project', query: { group: row.alias || row.id } }">
              <el-link type="primary">项目</el-link>
            </router-link>
            <el-divider direction="vertical"></el-divider>
            <router-link :to="{ name: 'GroupMember', params: { groupId: row.alias || row.id } }">
              <el-link type="primary">成员</el-link>
            </router-link>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <pagination
        v-show="total > 0"
        :total="total"
        :page.sync="page"
        :limit.sync="pageSize"
        style="position: absolute; right: 0"
        @pagination="getList" />
    </div>

  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import Pagination from '@/components/Pagination'
import { groupList } from '@/api/group'
import { formatInArrayNumber, routeBreadcrumb } from '@/utils/helpers'
import { formatDate } from '@/utils/filters'
import OrgUser from '../components/OrgUser'

export default {
  name: 'GroupList',
  components: {
    Breadcrumb,
    Pagination,
    OrgUser
  },
  filters: {
    formatDate
  },
  data () {
    return {
      // 筛选表单
      filterForm: {
        keyword: null
      },
      // 表格数据
      tableData: [],
      tableLoading: false,
      page: 1,
      pageSize: 20,
      total: 0
    }
  },
  computed: {
    orgId () {
      return this.$store.getters.orgId
    },
    orgRole () {
      return this.$store.state.user.lastOrg.role || undefined
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  created () {
    // 加载列表数据
    this.getList()
  },
  methods: {
    getList () {
      this.tableLoading = true
      groupList(
        this.orgId,
        this.filterForm.keyword,
        this.page,
        this.pageSize
      ).then(res => {
        this.page = Number(res.data.page)
        this.pageSize = Number(res.data.pagesize)
        this.total = Number(res.data.total)
        this.tableData = formatInArrayNumber(res.data.data, ['id', 'join_at', 'role'])
      }).finally(() => {
        this.tableLoading = false
      })
    },
    // 执行筛选
    handleFilter () {
      this.page = 1
      this.getList()
    }
  }
}
</script>

<style lang="scss" scoped>
.project-main {
  padding-bottom: 100px;
  .member-tag {
    &:not(:first-child) {
      margin-left: 5px;
    }
  }
  .table-tools {
    position: relative;
    .table-tools-left {
      display: inline-block;
    }
    .table-tools-right {
      float: right;
      .table-tools-filter {
        margin-left: 10px;
      }
      .table-tools-input-keyword {
        width: 360px;
      }
    }
  }
}
</style>
