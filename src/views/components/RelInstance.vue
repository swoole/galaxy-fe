<template>
  <el-drawer
    :title="title"
    :direction="direction"
    :size="size"
    :visible.sync="drawerVisible">
    <special-instance ref="special-instance" class="specil-instance">
      <template #title="{ runtime }">
        {{ runtime.group ? runtime.group.title : '未知项目组' }} / {{ runtime.project ? runtime.project.title : '未知项目' }} / {{ runtime.name }}
      </template>
    </special-instance>

    <!-- 分页组件 -->
    <pagination
      v-show="total > pageSize"
      :total="total"
      :page.sync="page"
      :limit.sync="pageSize"
      class="clearfix"
      style="float: right;"
      @pagination="getList"/>
  </el-drawer>
</template>

<script>
import SpecialInstance from './SpecialInstance'
import Pagination from '@/components/Pagination'

export default {
  name: 'RelInstance',
  props: {
    title: {
      type: String,
      default: '关联实例'
    },
    direction: {
      type: String,
      default: 'ltr'
    },
    size: {
      type: String,
      default: '80%'
    }
  },
  components: {
    SpecialInstance,
    Pagination
  },
  data () {
    return {
      drawerVisible: false,
      page: 1,
      pageSize: 20,
      total: 0,
      callback: null,
      formattedRuntimes: null
    }
  },
  methods: {
    render (cb, formattedRuntimes = {}) {
      this.callback = cb
      this.formattedRuntimes = formattedRuntimes
      this.getList()
    },
    getList () {
      const loading = this.$loading()
      this.callback(this.page, this.pageSize).then(res => {
        this.page = Number(res.data.page)
        this.pageSize = Number(res.data.pagesize)
        this.total = Number(res.data.total)
        this.drawerVisible = true
        this.$nextTick(() => {
          this.$refs['special-instance'].formatRuntimes(res.data.data, this.objCopy(this.formattedRuntimes))
        })
      }).finally(() => {
        loading.close()
      })
    },
    objCopy (obj) {
      return JSON.parse(JSON.stringify(obj))
    }
  }
}
</script>

<style lang="scss" scoped>
.specil-instance {
  margin: 0 20px 20px 20px;
}
</style>
