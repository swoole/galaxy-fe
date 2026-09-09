<template>
  <div class="navbar-search">
    <el-input
      ref="input"
      v-model.trim="keyword"
      placeholder="搜索项目或集群"
      prefix-icon="el-icon-search"
      size="small"
      clearable
      :style="{ width: focused ? '260px' : '150px' }"
      @focus="focused = true"
      @keyup.enter.native="search" />
    <div v-show="focused" ref="panel" class="panel">
      <div class="tip">⌘/Ctrl + K 打开，Enter 搜索，Esc 关闭</div>
      <div class="section-title">项目</div>
      <el-table v-loading="loadingProjects" :data="projects" :show-header="false" size="mini" empty-text="无相关项目">
        <el-table-column><template #default="{ row }"><router-link :to="{ name: 'ProjectOverview', params: { groupId: row.group && (row.group.alias || row.group.id), projectId: row.alias || row.id } }" class="text-link">{{ row.group ? `${row.group.title} / ` : '' }}{{ row.title }}</router-link></template></el-table-column>
      </el-table>
      <div class="section-title">Docker Swarm 集群</div>
      <el-table v-loading="loadingClusters" :data="clusters" :show-header="false" size="mini" empty-text="无相关集群">
        <el-table-column><template #default="{ row }"><router-link :to="{ name: 'ClusterEntry', params: { clusterId: row.id } }" class="text-link">{{ row.title }}</router-link></template></el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
import { projectSimple } from '@/api/project'
import { clusterSimple } from '@/api/cluster'

export default {
  name: 'NavbarSearch',
  props: { orgId: { type: [Number, String], default: null } },
  data () { return { keyword: '', focused: false, projects: [], clusters: [], loadingProjects: false, loadingClusters: false } },
  mounted () { window.addEventListener('keydown', this.shortcut); window.addEventListener('click', this.outside) },
  beforeDestroy () { window.removeEventListener('keydown', this.shortcut); window.removeEventListener('click', this.outside) },
  methods: {
    search () {
      if (!this.keyword) { this.projects = []; this.clusters = []; return }
      this.loadingProjects = true
      this.loadingClusters = true
      projectSimple(this.orgId, null, this.keyword).then(res => { this.projects = res.data.projects || [] }).finally(() => { this.loadingProjects = false })
      clusterSimple(this.orgId, null, this.keyword).then(res => { this.clusters = res.data.clusters || [] }).finally(() => { this.loadingClusters = false })
    },
    shortcut (event) {
      if (event.key === 'Escape') { this.focused = false; this.$refs.input.blur() }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); this.focused = true; this.$refs.input.focus() }
    },
    outside (event) { if (!this.$el.contains(event.target)) this.focused = false }
  }
}
</script>

<style lang="scss" scoped>
.navbar-search { position: relative; }
.navbar-search ::v-deep .el-input { transition: width .2s; }
.panel { position: absolute; top: 42px; right: 0; z-index: 20; width: 500px; max-height: 70vh; overflow: auto; padding: 14px; border-radius: 6px; background: #fff; box-shadow: 0 8px 30px rgba(0,0,0,.16); }
.tip { color: #909399; font-size: 12px; }
.section-title { margin: 14px 0 6px; color: #606266; font-weight: 600; }
</style>
