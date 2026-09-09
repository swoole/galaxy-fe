<template>
  <div class="user-main box-shadow">
    <easy-title title="我的消息" margin-set="0 20" />

    <div class="table-tools">
      <div class="table-tools-left">
        <el-button
          type="danger"
          size="small"
          :disabled="selectedRows.length == 0"
          @click="handleDelete">删除</el-button>
        <el-button
          type="primary"
          size="small"
          :disabled="selectedRows.length == 0"
          @click="handleSetRead">标记为已读</el-button>
        <el-button
          type="primary"
          size="small"
          @click="handleSetReadAll">全部标为已读</el-button>
      </div>
      <div class="table-tools-right">
        <date-picker v-model="filterForm.timerange" :shortcuts="setDatePickerShortcuts" :clearable="false" />
        <!-- <el-select
          v-model="filterForm.cluster_id"
          class="table-tools-filter"
          placeholder="集群，请先选择环境"
          size="small"
          clearable
          @change="handleFilter">
          <el-option
            v-for="(item, idx) in selectorCreateClusters"
            :key="idx"
            :label="item.title"
            :value="item.id">
          </el-option>
        </el-select> -->
      </div>
    </div>

    <el-table
      ref="table"
      style="width: 100%; margin-top: 20px; "
      :data="tableData"
      v-loading="tableLoading"
      fit
      highlight-current-row
      @selection-change="handleSelectionChange"
    >
      <el-table-column
        type="selection"
        width="55"
        align="center">
      </el-table-column>
      <el-table-column
        label="标题"
        prop="title"
      >
        <template #default="{ row }">
          <el-badge is-dot :hidden="row.read_at > 0" class="notify-title-badge">
            <el-link
              type="primary"
              :underline="false"
              :class="{ 'notify-unread': row.read_at == 0 }"
              @click="handleDetail(row)">
              {{ row.title }}
            </el-link>
          </el-badge>
        </template>
      </el-table-column>
      <el-table-column
        label="消息类型"
        align="center"
        width="150"
      >
        <template #default="{ row }">
          <template v-if="NOTIFY_SCENES[row.scene]">
            <span :class="`text-${NOTIFY_SCENES[row.scene].type}`">
              {{ NOTIFY_SCENES[row.scene].label }}
            </span>
          </template>
          <template v-else>
            {{ row.scene }}
          </template>
        </template>
      </el-table-column>
      <el-table-column
        label="接收时间"
        prop="created_at"
        align="center"
        width="180"
      >
        <template #default="{ row }">
          {{ row.created_at | formatDate }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        align="center"
        width="150"
      >
        <template #default="{ row }">
          <el-link :disabled="row.read_at > 0" type="primary" @click="handleSetRead(row.id)">标为已读</el-link>
          <el-divider direction="vertical"></el-divider>
          <el-link type="danger" @click="handleDelete(row.id)">删除</el-link>
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
      @pagination="getList"/>

    <notify-profile ref="profile" />
  </div>
</template>

<script>
import EasyTitle from '@/views/components/EasyTitle'
import Pagination from '@/components/Pagination'
import DatePicker from '@/views/components/DatePicker'
import moment from 'moment'
import {
  notifys,
  notifySetRead,
  notifySetReadAll,
  notifyDelete
} from '@/api/user'
import { formatDate } from '@/utils/filters'
import { formatInArrayNumber } from '@/utils/helpers'
import {
  NOTIFY_SCENES
} from '@/consts/user'
import NotifyProfile from './components/NotifyProfile'

export default {
  name: 'UserNotification',
  components: {
    EasyTitle,
    Pagination,
    DatePicker,
    NotifyProfile
  },
  data () {
    return {
      filterForm: {
        timerange: [
          moment({ d: 1, h: 0, m: 0, s: 0, ms: 0 }).valueOf(),
          moment({ h: 23, m: 59, s: 59, ms: 0 }).valueOf()
        ],
        scene: null
      },
      page: 1,
      pageSize: 20,
      total: 0,
      tableLoading: false,
      tableData: [],
      selectedRows: [],
      // 常量
      NOTIFY_SCENES
    }
  },
  filters: {
    formatDate
  },
  watch: {
    'filterForm.scene' () {
      this.handleFilter()
    },
    'filterForm.timerange' () {
      this.handleFilter()
    }
  },
  created () {
    this.getList()
  },
  methods: {
    getList () {
      this.tableLoading = true
      notifys(
        this.filterForm.timerange,
        this.filterForm.scene,
        this.page,
        this.pageSize
      ).then(res => {
        this.page = Number(res.data.page)
        this.pageSize = Number(res.data.pagesize)
        this.total = Number(res.data.total)
        this.tableData = formatInArrayNumber(res.data.data, [
          'id', 'created_at', 'read_at'
        ])
      }).finally(() => {
        this.tableLoading = false
      })
    },
    // 过滤
    handleFilter () {
      this.page = 1
      this.getList()
    },
    // 设置日历筛选组件快捷方式
    setDatePickerShortcuts (picker) {
      const weekFirst = moment({ h: 0, m: 0, s: 0, ms: 0 }).day(1)
      const monthFirst = moment({ d: 1, h: 0, m: 0, s: 0, ms: 0 })
      const shortcuts = [
        picker.shortcut('本周', weekFirst.valueOf(), moment({ h: 23, m: 59, s: 59, ms: 0 }).valueOf()),
        picker.shortcut('上周', weekFirst.clone().subtract(7, 'd').valueOf(), weekFirst.clone().subtract(1, 's').valueOf()),
        picker.shortcut('本月', monthFirst.valueOf(), moment({ h: 23, m: 59, s: 59, ms: 0 }).valueOf()),
        picker.shortcut('上月', monthFirst.clone().subtract(1, 'month').valueOf(), monthFirst.clone().subtract(1, 's').valueOf())
      ]
      return shortcuts
    },
    // 删除
    handleDelete (id = null) {
      const batch = id === null || typeof id === 'object' || isNaN(id)
      const ids = batch ? this.selectedRows.map(row => row.id) : [Number(id)]
      if (ids.length === 0) {
        return this.$message.error('请选择需要删除的消息')
      }

      this.$confirm(`您确定要删除被选中的消息吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loading = this.$loading()
        notifyDelete(ids).then(() => {
          const deletedIds = new Set(ids.map(Number))
          const before = this.tableData.length
          this.tableData = this.tableData.filter(row => !deletedIds.has(Number(row.id)))
          const removed = before - this.tableData.length
          this.total = Math.max(0, this.total - removed)
          this.selectedRows = []
          this.$message.success('删除成功')
          this.$refs.table.clearSelection()
          if (this.tableData.length === 0 && this.total > 0) {
            this.page = Math.max(1, Math.ceil(this.total / this.pageSize))
            this.getList()
          }
        }).finally(() => {
          loading.close()
        })
      })
    },
    // 触发设置已读
    handleSetRead (id = null) {
      let ids = []
      if (isNaN(id)) {
        ids = this.selectedRows.map(row => row.id)
      } else {
        ids.push(id)
      }
      if (ids.length === 0) {
        return this.$message.error('请选择设置已读的消息')
      }

      const loading = this.$loading()
      notifySetRead(ids).then(res => {
        this.$message.success('操作成功')
        this.tableData.forEach(row => {
          if (ids.indexOf(row.id) > -1) {
            row.read_at = parseInt(Date.now() / 1000)
          }
        })
        this.$refs.table.clearSelection()
      }).finally(() => {
        loading.close()
      })
    },
    // 触发设置所有已读
    handleSetReadAll () {
      const loading = this.$loading()
      notifySetReadAll().then(res => {
        this.$message.success('操作成功')
        this.tableData.forEach(row => {
          row.read_at = parseInt(Date.now() / 1000)
        })
      }).finally(() => {
        loading.close()
      })
    },
    // 消息详情
    handleDetail (row) {
      this.$refs.profile.handleDetail(row)
    },
    // 多选
    handleSelectionChange (val) {
      this.selectedRows = val
    }
  }
}
</script>

<style lang="scss" scoped>
.user-main {
  width: 100%;
  background: #fff;
  padding: 25px 15px 100px 15px;
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
  .notify-title-badge {
    max-width: 100%;
  }
  .notify-title-badge ::v-deep .el-badge__content.is-fixed {
    right: -2px;
  }
  .notify-title-badge .el-link {
    max-width: 100%;
    vertical-align: middle;
  }
  .notify-title-badge ::v-deep .el-link--inner {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .notify-unread { font-weight: 600; }
}

.box-shadow {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.dialog-form {
  .dialog-form-item-control {
    width: 420px;
  }
  .form-tips {
    width: 420px;
    margin-top: 10px;
  }
}
</style>
