<template>
  <div class="user-main box-shadow">
    <easy-title title="登录日志" margin-set="0 20" />

    <el-table
      style="width: 100%; "
      :data="tableData"
      v-loading="tableLoading"
      fit
      highlight-current-row>
      <el-table-column
        prop="created_at"
        label="登录时间"
        align="center"
        width="180">
        <template #default="{ row }">
          {{ row.login_at | formatDate }}
        </template>
      </el-table-column>
      <el-table-column
        prop="ip"
        label="客户端IP"
        width="150"
        align="center">
        <template #default="{ row }">
          {{ row.ip }}
        </template>
      </el-table-column>
      <el-table-column
        prop="city"
        label="客户端定位"
        width="150"
        align="center">
        <template #default="{ row }">
          {{ row.city }}
        </template>
      </el-table-column>
      <!-- <el-table-column
        prop="channel"
        label="登录渠道"
        width="100"
        align="center">
        <template #default="{ row }">
          {{ row.channel }}
        </template>
      </el-table-column> -->
      <el-table-column
        prop="result"
        label="登录结果"
        width="90"
        align="center">
        <template #default="{ row }">
          <el-tag
            v-if="row.result"
            type="success"
            size="mini">
            登录成功
          </el-tag>
          <el-tag
            v-else
            type="danger"
            size="mini">
            登录失败
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="ua"
        label="浏览器User-Agent">
      </el-table-column>
    </el-table>

    <!-- 分页组件 -->
    <pagination
      v-show="total > 0"
      :total="total"
      :page.sync="page"
      :limit.sync="pageSize"
      style="position: absolute; right: 0"
      @pagination="getList"/>
  </div>
</template>

<script>
import EasyTitle from '@/views/components/EasyTitle'
import Pagination from '@/components/Pagination'
import { userLoginHistory } from '@/api/user'
import { formatDate } from '@/utils/filters'

export default {
  name: 'UserMyOrg',
  components: {
    EasyTitle,
    Pagination
  },
  filters: {
    formatDate
  },
  data () {
    return {
      page: 1,
      pageSize: 20,
      total: 0,
      tableLoading: false,
      tableData: []
    }
  },
  created () {
    this.getList()
  },
  methods: {
    getList () {
      this.tableLoading = true
      userLoginHistory(
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
    // 过滤
    handleFilter () {
      this.page = 1
      this.getList()
    }
  }
}
</script>

<style lang="scss" scoped>
.user-main {
  width: 100%;
  background: #fff;
  padding: 25px 15px 100px 15px;
  margin-bottom: 20px;
}

.box-shadow {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

</style>
