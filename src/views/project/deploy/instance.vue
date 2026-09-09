<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />
    <div class="project-main">
      <easy-title title="运行实例" margin-set="0 20" />
      <el-alert
        title="每个项目实例对应一个主工作负载：Docker Swarm Service 或 Kubernetes Deployment。Kubernetes Service / Ingress 仅负责网络暴露。"
        type="info"
        :closable="false"
        show-icon />
      <el-table v-loading="loading" :data="rows" fit class="runtime-table">
        <el-table-column label="实例 / 主工作负载" min-width="240">
          <template #default="{ row }">
            <el-link type="primary" @click="openWorkload(row)">{{ row.name }}</el-link>
            <div class="secondary">{{ workloadResourceLabel(row) }}</div>
            <div class="secondary">ID: {{ shortId(row.runtime_ref) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="环境 / 集群" min-width="190">
          <template #default="{ row }">
            {{ row.env ? row.env.title : `#${row.env_id}` }} / {{ row.cluster ? row.cluster.title : `#${row.cluster_id}` }}
            <div><el-tag :type="workloadTagType(row)" size="mini" effect="plain">{{ workloadTypeLabel(row) }}</el-tag></div>
          </template>
        </el-table-column>
        <el-table-column label="镜像" min-width="260">
          <template #default="{ row }">
            <image-reference
              v-if="row.release && row.release.artifact"
              :value="row.release.artifact.reference"
              :digest="row.release.artifact.digest || ''"
              :size="row.release.artifact.size || 0"
              compact />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="副本" width="110" align="center">
          <template #default="{ row }"><strong>{{ row.running_count }}</strong> / {{ row.desired_count }}</template>
        </el-table-column>
        <el-table-column label="健康" width="110" align="center">
          <template #default="{ row }"><el-tag :type="healthType(row.health)" size="small">{{ row.health }}</el-tag></template>
        </el-table-column>
        <el-table-column label="同步时间" width="170" align="center">
          <template #default="{ row }">{{ (row.last_synced_at || row.updated_at) | formatDate }}</template>
        </el-table-column>
        <el-table-column label="操作" width="285" align="right" fixed="right">
          <template #default="{ row }">
            <el-button
              type="text"
              icon="el-icon-edit"
              :loading="operationLoading(row, 'rename')"
              :disabled="operationBusy(row)"
              @click="rename(row)">
              改名
            </el-button>
            <el-button
              type="text"
              icon="el-icon-connection"
              :loading="operationLoading(row, 'route')"
              :disabled="operationBusy(row)"
              @click="openRoutes(row)">
              路由设置
            </el-button>
            <el-button
              type="text"
              icon="el-icon-refresh-right"
              :loading="operationLoading(row, 'restart')"
              :disabled="operationBusy(row) || !row.runtime_ref"
              @click="restart(row)">
              重启
            </el-button>
            <el-button
              type="text"
              class="danger-action"
              icon="el-icon-delete"
              :loading="operationLoading(row, 'remove')"
              :disabled="operationBusy(row)"
              @click="remove(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import {
  projectRoutes,
  projectRuntimes,
  projectRuntimeRename,
  projectRuntimeRestart,
  projectRuntimeRemove
} from '@/api/project'
import { formatDate } from '@/utils/filters'
import { routeBreadcrumb } from '@/utils/helpers'
import { projectRouteCreateLocation, projectRouteEditLocation } from '@/utils/projectRouteNavigation'

export default {
  name: 'ProjectInstance',
  components: { Breadcrumb, EasyTitle },
  filters: { formatDate },
  props: {
    project: { type: Object, default: null },
    orgId: { type: [Number, String], required: true },
    groupId: { type: [Number, String], required: true },
    projectId: { type: [Number, String], required: true }
  },
  data () {
    return { rows: [], loading: false, operations: {} }
  },
  computed: {
    breadcrumb () { return [...routeBreadcrumb(this), { title: '部署', to: '' }, { title: '运行实例', to: '' }] }
  },
  created () { this.load() },
  methods: {
    load () {
      this.loading = true
      return projectRuntimes(this.orgId, this.groupId, this.projectId).then(res => { this.rows = res.data.runtimes || [] }).finally(() => { this.loading = false })
    },
    openWorkload (row) {
      if (!row.runtime_ref) return this.$message.warning('该实例尚未关联运行时工作负载')
      const type = row.orchestrator_type || (row.cluster && row.cluster.orchestrator_type)
      if (type === 'kubernetes') {
        return this.$router.push({
          name: 'ProjectKubernetesDeploymentDetail',
          params: {
            groupId: this.groupId,
            projectId: this.projectId,
            runtimeId: row.id
          },
          query: {
            cluster_id: row.cluster_id,
            namespace: row.runtime_namespace,
            name: row.service_name
          }
        })
      }
      if (type !== 'docker_swarm') {
        return this.$message.warning('该实例的运行时 Provider 不受支持')
      }
      this.$router.push({
        name: 'ProjectSwarmServiceDetail',
        params: {
          groupId: this.groupId,
          projectId: this.projectId,
          runtimeId: row.id,
          serviceId: row.runtime_ref
        },
        query: { cluster_id: row.cluster_id }
      })
    },
    orchestratorType (row) {
      return row.orchestrator_type || (row.cluster && row.cluster.orchestrator_type) || ''
    },
    workloadTypeLabel (row) {
      const type = this.orchestratorType(row)
      if (type === 'docker_swarm') return 'Docker Swarm · Service'
      if (type === 'kubernetes') return 'Kubernetes · Deployment'
      return '未知工作负载'
    },
    workloadTagType (row) {
      return this.orchestratorType(row) === 'docker_swarm' ? 'success' : 'primary'
    },
    workloadResourceLabel (row) {
      const name = row.service_name || '-'
      return this.orchestratorType(row) === 'kubernetes'
        ? `Deployment：${row.runtime_namespace ? `${row.runtime_namespace}/` : ''}${name}`
        : `Service：${name}`
    },
    async openRoutes (row) {
      this.setOperation(row, 'route')
      try {
        const response = await projectRoutes(this.orgId, this.groupId, this.projectId, 1, 1, row.id)
        const existing = (response.data.data || [])[0]
        const scope = { groupId: this.groupId, projectId: this.projectId }
        if (existing) {
          await this.$router.push(projectRouteEditLocation(scope, existing))
          return
        }
        const orchestratorType = row.orchestrator_type || (row.cluster && row.cluster.orchestrator_type)
        await this.$router.push(projectRouteCreateLocation(scope, {
          ...row,
          runtime_id: row.id,
          orchestrator_type: orchestratorType
        }))
      } finally {
        this.setOperation(row)
      }
    },
    operationKey (row) {
      return String(row.id)
    },
    operationLoading (row, operation) {
      return this.operations[this.operationKey(row)] === operation
    },
    operationBusy (row) {
      return Boolean(this.operations[this.operationKey(row)])
    },
    setOperation (row, operation = '') {
      const key = this.operationKey(row)
      if (operation) this.$set(this.operations, key, operation)
      else this.$delete(this.operations, key)
    },
    rename (row) {
      return this.$prompt(
        '实例名称仅用于项目内识别，不会修改或重启底层 Service 或 Deployment。',
        '修改实例名称',
        {
          confirmButtonText: '保存',
          cancelButtonText: '取消',
          inputValue: row.name,
          inputPlaceholder: '请输入实例名称',
          inputValidator: value => {
            const name = String(value || '').trim()
            if (!name) return '实例名称不能为空'
            if ([...name].length > 128) return '实例名称不能超过 128 个字符'
            if ([...name].some(character => {
              const code = character.charCodeAt(0)
              return code <= 31 || code === 127
            })) return '实例名称不能包含控制字符'
            return true
          }
        }
      ).then(({ value }) => {
        this.setOperation(row, 'rename')
        return projectRuntimeRename(
          this.orgId,
          this.groupId,
          this.projectId,
          row.id,
          String(value).trim()
        ).then(() => {
          this.$message.success('实例名称已修改')
          return this.load()
        }).finally(() => this.setOperation(row))
      }).catch(error => {
        if (error !== 'cancel' && error !== 'close') throw error
      })
    },
    restart (row) {
      const target = `${row.env ? row.env.title : `#${row.env_id}`} / ${row.cluster ? row.cluster.title : `#${row.cluster_id}`}`
      return this.$confirm(
        `确认重启实例“${row.name}”吗？${target} 中的工作负载将执行滚动重启。`,
        '重启实例',
        {
          confirmButtonText: '确认重启',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        this.setOperation(row, 'restart')
        return projectRuntimeRestart(this.orgId, this.groupId, this.projectId, row.id)
          .then(() => {
            this.$message.success('已提交实例重启')
            return this.load()
          })
          .finally(() => this.setOperation(row))
      }).catch(error => {
        if (error !== 'cancel' && error !== 'close') throw error
      })
    },
    remove (row) {
      const target = `${row.env ? row.env.title : `#${row.env_id}`} / ${row.cluster ? row.cluster.title : `#${row.cluster_id}`}`
      return this.$confirm(
        `确认删除实例“${row.name}”吗？将从 ${target} 删除对应工作负载及其关联运行资源；发布记录和镜像制品会保留。`,
        '删除实例',
        {
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
          type: 'error'
        }
      ).then(() => {
        this.setOperation(row, 'remove')
        return projectRuntimeRemove(this.orgId, this.groupId, this.projectId, row.id)
          .then(() => {
            this.$message.success('实例已删除')
            return this.load()
          })
          .finally(() => this.setOperation(row))
      }).catch(error => {
        if (error !== 'cancel' && error !== 'close') throw error
      })
    },
    healthType (health) { return health === 'healthy' ? 'success' : health === 'unhealthy' ? 'danger' : 'info' },
    shortId (id) { return id ? String(id).slice(0, 16) : '-' }
  }
}
</script>

<style lang="scss" scoped>
.runtime-table { margin-top: 18px; }
.secondary { margin-top: 4px; color: #909399; font-size: 12px; }
.danger-action { color: #f56c6c; }
code { word-break: break-all; }
</style>
