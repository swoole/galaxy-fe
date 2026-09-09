<template>
  <div>
    {{ redis_db | parseRedisUri }}
    <el-tooltip class="item" effect="dark" content="哨兵端口：26379，Redis端口：16379" placement="top-start">
      <el-tag type="success" size="small" v-if="redis_db.sentinel===1">哨兵集群</el-tag>
    </el-tooltip>
    <el-tag type="primary" size="small" v-if="redis_db.sentinel===0">单实例</el-tag>
  </div>
</template>

<script>
import { parseRedisUri } from '@/utils/filters'

export default {
  name: 'StorageRedisUri',
  filters: {
    parseRedisUri
  },
  props: {
    redis_db: {
      type: Object,
      required: true
    }
  }
}
</script>

<style scoped>

</style>
