<template>
  <el-dialog :title="`项目组资源授权 · ${cluster ? cluster.title : ''}`" :visible.sync="visible" width="600px">
    <el-alert title="只有被选中的项目组及其成员才能在项目发布等功能中使用此集群。未授权即不可用。" type="warning" :closable="false" show-icon />
    <div v-loading="loading" class="grant-list">
      <el-checkbox-group v-model="grantedGroupIds">
        <el-checkbox
          v-for="group in groups"
          :key="group.id"
          :label="group.id"
          :disabled="group.granted && group.revoke_blocked"
          class="grant-project">
          <span class="grant-project-content">
            <span><strong>{{ group.title }}</strong><code>{{ group.alias }}</code></span>
            <small v-if="group.granted && group.revoke_blocked">正在使用：{{ blockerText(group.revoke_blockers) }}</small>
          </span>
        </el-checkbox>
      </el-checkbox-group>
      <el-empty v-if="!loading && !groups.length" description="组织内暂无项目组" :image-size="70" />
    </div>
    <span slot="footer">
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存授权</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { clusterGroupGrants, clusterGroupGrantsSave } from '@/api/cluster'
import { formatInArrayNumber } from '@/utils/helpers'

export default {
  name: 'ClusterGroupGrantDialog',
  props: {
    orgId: { type: [Number, String], required: true }
  },
  data () {
    return { visible: false, loading: false, saving: false, cluster: null, groups: [], grantedGroupIds: [] }
  },
  methods: {
    open (cluster) {
      this.cluster = cluster
      this.visible = true
      this.loading = true
      return clusterGroupGrants(this.orgId, cluster.id).then(res => {
        this.groups = formatInArrayNumber(res.data.groups || [], ['id'])
        this.grantedGroupIds = this.groups.filter(item => item.granted).map(item => item.id)
      }).finally(() => { this.loading = false })
    },
    save () {
      if (!this.cluster) return
      this.saving = true
      clusterGroupGrantsSave(this.orgId, this.cluster.id, this.grantedGroupIds).then(() => {
        this.$message.success('项目组集群授权已更新')
        this.visible = false
        this.$emit('saved', this.cluster)
      }).finally(() => { this.saving = false })
    },
    blockerText (blockers = {}) {
      const labels = {
        projects: '构建设置',
        pipelines: 'Pipeline',
        workspaces: 'Workspace',
        runtimes: '运行实例',
        builds: '构建任务',
        releases: '发布任务'
      }
      return Object.keys(labels).filter(key => Number(blockers[key] || 0) > 0)
        .map(key => `${labels[key]} ${Number(blockers[key])}`).join('、')
    }
  }
}
</script>

<style lang="scss" scoped>
.grant-list { min-height: 150px; margin-top: 16px; }
.grant-project { display: flex; margin: 0; padding: 12px 4px; border-bottom: 1px solid #ebeef5; }
.grant-project-content { display: inline-flex; flex-direction: column; gap: 4px; }
.grant-project-content code { margin-left: 8px; color: #909399; }
.grant-project-content small { color: #e6a23c; }
</style>
