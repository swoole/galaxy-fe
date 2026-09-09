<template>
  <div class="project-container">
    <div class="project-main">
      <div class="table-tools">
        <div class="table-tools-left">
          <router-link :to="{ name: 'ProjectCreate' }">
            <el-button type="primary" size="small">新建项目</el-button>
          </router-link>
        </div>
        <div class="table-tools-right">
          <el-select
            v-model="filterForm.groupId"
            class="form-item-control"
            filterable
            remote
            placeholder="请输入项目组ID、名称、标识搜索"
            size="small"
            clearable
            style="width: 240px"
            :remote-method="searchGroup"
            :loading="groupSearchLoading">
            <el-option
              v-for="group in groups"
              :key="group.id"
              :label="group.title"
              :value="group.id">
            </el-option>
          </el-select>
          <el-input
            v-model="filterForm.keyword"
            placeholder="请输入项目名称、标识、ID进行搜索"
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

      <div class="projects-grid" v-loading="tableLoading">
        <el-card
          v-for="(profile, index) in tableData"
          :key="index"
          class="project-card"
          shadow="hover"
        >
          <div class="project-card-head">
            <svg-icon icon-class="package" class="project-card-icon" />
            <router-link :to="{ name: 'ProjectOverview', params: { groupId: profile.group.alias || profile.group.id, projectId: profile.alias || profile.id } }">
              <el-link type="primary" class="project-card-title">{{ profile.title }}</el-link>
            </router-link>
            <span v-if="profile.alias" class="text-warning project-card-alias">[{{ profile.alias }}]</span>
          </div>
          <div class="project-card-desc">{{ profile.desc || '暂无描述' }}</div>
          <div class="project-card-group">
            <svg-icon icon-class="group" /> {{ profile.group.title }}
          </div>
          <div class="project-card-foot">
            <span><i class="el-icon-user"></i> {{ profile.member_count }} 成员</span>
            <span><i class="el-icon-cpu"></i> {{ profile.instances }} 实例</span>
            <span>{{ profile.develop ? 'Git 源码' : 'OCI 镜像' }}</span>
            <span class="project-card-time">{{ profile.last_active | formatDate }}</span>
          </div>
        </el-card>
      </div>

      <!-- 分页组件 -->
      <pagination
        v-show="total > 0"
        :total="total"
        :page.sync="page"
        :limit.sync="pageSize"
        style="position: absolute; right: 0"
        @pagination="getList"/>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '../components/Breadcrumb'
import EasyTitle from '../components/EasyTitle'
import { projects } from '@/api/project'
import { groupSimple } from '@/api/group'
import { formatDate } from '@/utils/filters'
import { formatInArrayNumber, routeBreadcrumb } from '@/utils/helpers'
import Pagination from '@/components/Pagination'

export default {
  name: 'Project',
  components: {
    Breadcrumb,
    Pagination,
    EasyTitle
  },
  filters: {
    formatDate
  },
  data () {
    return {
      // 筛选表单
      filterForm: {
        groupId: null,
        keyword: null
      },
      tableLoading: false,
      page: 1,
      pageSize: 20,
      total: 0,
      tableData: [],
      // 下拉框groups
      groups: [],
      // 项目组搜索loading
      groupSearchLoading: false
    }
  },
  computed: {
    // 组织ID
    orgId () {
      return this.$store.getters.orgId
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  created () {
    // query参数筛选
    if (this.$route.query.group) {
      this.filterForm.groupId = this.$route.query.group
      this.queryGroupSelector(this.filterForm.groupId)
    } else {
      this.queryGroupSelector()
    }

    this.getList()
  },
  methods: {
    getList () {
      this.tableLoading = true
      projects(
        this.orgId,
        this.filterForm.groupId,
        this.filterForm.keyword,
        this.page,
        this.pageSize
      ).then(res => {
        this.page = Number(res.data.page)
        this.pageSize = Number(res.data.pagesize)
        this.total = Number(res.data.total)
        this.tableData = res.data.data
      }).finally(() => {
        this.tableLoading = false
      })
    },
    // 执行筛选
    handleFilter () {
      this.page = 1
      this.getList()
    },
    // 项目组远程搜索
    searchGroup (query) {
      if (query !== '') {
        this.queryGroupSelector(query)
      }
    },
    // 查询项目组下拉框
    queryGroupSelector (keyword = null) {
      this.groupSearchLoading = true
      groupSimple(this.orgId, keyword)
        .then(res => {
          this.groups = formatInArrayNumber(res.data.groups, ['id'])
        }).finally(() => {
          this.groupSearchLoading = false
        })
    }
  }
}
</script>

<style lang="scss" scoped>
.project-main {
  padding-bottom: 100px;

  .table-tools {
    position: relative;
    margin-bottom: 20px;

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
  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 16px;
    margin-top: 20px;

    .project-card {
      .project-card-head {
        display: flex;
        align-items: center;
        overflow: hidden;

        .project-card-icon {
          color: #409eff;
          font-size: 18px;
          margin-right: 8px;
          flex-shrink: 0;
        }

        .project-card-title {
          font-size: 15px;
          font-weight: 600;
        }

        .project-card-alias {
          margin-left: 6px;
          font-size: 12px;
        }
      }

      .project-card-desc {
        color: #606266;
        font-size: 13px;
        margin: 10px 0;
        min-height: 38px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .project-card-group {
        color: #909399;
        font-size: 12px;
        margin-bottom: 12px;

        .svg-icon {
          margin-right: 4px;
        }
      }

      .project-card-foot {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        color: #909399;
        font-size: 12px;
        border-top: 1px solid #ebeef5;
        padding-top: 10px;

        .project-card-time {
          margin-left: auto;
        }
      }
    }
  }
}
</style>
