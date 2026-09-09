<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="project-main">
      <easy-title title="部署环境" margin-set="0 20"></easy-title>
      <el-alert
        class="environment-purpose"
        title="部署环境用于区分开发、测试、预发布、生产等发布阶段，并限定每个阶段可选择的集群。它不负责资源授权；项目组能否使用集群，请在“资源 → 集群 → 项目授权”中设置。"
        type="info"
        :closable="false"
        show-icon />

      <div class="table-tools">
        <div class="table-tools-left">
          <router-link :to="{ name: 'EnvCreate' }">
            <el-button type="primary" size="small">新建部署环境</el-button>
          </router-link>
        </div>
        <div class="table-tools-right">
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
          label="部署环境"
          prop="title"
          width="160"
        >
          <template #default="{ row }">
            <env-name :env="row"></env-name>
            <el-tag v-if="row.archived_at" type="info" size="mini">已归档</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="关联集群"
        >
          <template #default="{ row }">
            <template v-for="(iCluster, idx) in row.clusters">
              <router-link
                v-if="iCluster.org_id == orgIdInt"
                :key="idx"
                :to="{ name: 'ClusterEntry', params: { clusterId: iCluster.id } }"
                class="tag-item-5">
                <el-link type="primary">{{ iCluster.title }}</el-link>
                <el-tag :type="Number(iCluster.status) === 3 ? 'success' : 'info'" size="mini">
                  {{ Number(iCluster.status) === 3 ? '在线' : '离线' }}
                </el-tag>
              </router-link>
              <span v-else :key="`${idx}_span`">
                {{ iCluster.title }}
              </span>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="可用范围" width="190">
          <template #default="{ row }">
            <div>{{ row.ready_cluster_count }}/{{ (row.clusters || []).length }} 个集群就绪</div>
            <div :class="Number(row.authorized_group_count) > 0 ? 'secondary' : 'text-warning'">
              {{ row.authorized_group_count }} 个项目组获得授权
            </div>
          </template>
        </el-table-column>
        <el-table-column label="运行实例" width="100" align="center">
          <template #default="{ row }">{{ row.runtime_count || 0 }}</template>
        </el-table-column>
        <el-table-column label="最近发布" width="170" align="center">
          <template #default="{ row }">{{ row.last_release_at ? formatDate(row.last_release_at) : '-' }}</template>
        </el-table-column>
        <el-table-column
          label="备注"
          prop="remark"
          width="160"
        />
        <el-table-column
          label="创建人"
          prop="creator"
          width="160"
          align="center"
        >
          <template #default="{ row }">
            <org-user :user="row.creator_info" />
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
          prop="created_at"
          width="160"
          align="center"
        >
          <template #default="{ row }">
            {{ row.created_at | formatDate }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="220"
          align="center"
        >
          <template #default="{ row }">
            <el-link type="primary" @click="handleRelInstances(row)">关联实例</el-link>
            <el-divider direction="vertical"></el-divider>
            <router-link v-if="!row.archived_at" :to="{ name: 'EnvEdit', params: { envId: row.id } }">
              <el-link type="primary" >编辑</el-link>
            </router-link>
            <el-divider v-if="!row.archived_at" direction="vertical"></el-divider>
            <el-link v-if="!row.archived_at" type="warning" @click="handleArchive(row)">归档</el-link>
            <el-link v-else type="primary" @click="handleRestore(row)">恢复</el-link>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <rel-instance ref="rel-instance"></rel-instance>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import {
  envs,
  envArchive,
  envRestore,
  envRelInstances
} from '@/api/env'
import { formatInArrayNumber, routeBreadcrumb } from '@/utils/helpers'
import { formatDate } from '@/utils/filters'
import OrgUser from '@/views/components/OrgUser'
import EnvName from '@/views/components/EnvName.vue'
import EasyTitle from '@/views/components/EasyTitle'
import RelInstance from '@/views/components/RelInstance'

export default {
  name: 'EnvironmentList',
  components: {
    Breadcrumb,
    OrgUser,
    EnvName,
    EasyTitle,
    RelInstance
  },
  filters: {
    formatDate
  },
  data () {
    return {
      tableData: [],
      tableLoading: false,
      archiving: false
    }
  },
  computed: {
    orgId () {
      return this.$store.getters.orgId
    },
    orgIdInt () {
      return this.$store.state.user.lastOrg.id
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
      envs(this.orgId).then(res => {
        this.tableData = formatInArrayNumber(res.data.envs, ['id', 'org_id', 'created_at', 'creator'])
          .sort((a, b) => a.id - b.id)
      }).finally(() => {
        this.tableLoading = false
      })
    },
    handleArchive (row) {
      this.$confirm(`归档环境【${row.title}】后，它将不能用于新发布，但历史发布、配置和集群关系都会完整保留。`, '归档部署环境', { type: 'warning' })
        .then(() => envArchive(this.orgId, row.id))
        .then(() => { this.$message.success('环境已归档'); this.getList() })
    },
    handleRestore (row) {
      this.$confirm(`恢复环境【${row.title}】并重新允许用于发布？`, '恢复部署环境', { type: 'info' })
        .then(() => envRestore(this.orgId, row.id))
        .then(() => { this.$message.success('环境已恢复'); this.getList() })
    },
    // 关联实例
    handleRelInstances (row) {
      const cb = (page, pageSize) => envRelInstances(this.orgId, row.id, page, pageSize)
      this.$refs['rel-instance'].render(cb)
    },
    formatDate
  }
}
</script>

<style lang="scss" scoped>
.project-main {
  padding-bottom: 100px;
  .table-tools {
    position: relative;
    .table-tools-left {
      display: inline-block;
    }
    .table-tools-right {
      float: right;
    }
  }
}

.environment-purpose { margin: 14px 0 18px; }
.secondary { margin-top: 3px; color: #909399; font-size: 12px; }
.text-warning { margin-top: 3px; color: #e6a23c; font-size: 12px; }
.tag-item-5 .el-tag { margin-left: 5px; }
</style>
