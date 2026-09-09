import request from '@/utils/request'

// 项目列表
export function projects (orgId, groupId = null, keyword = null, page = 1, pageSize = 20) {
  return request({
    url: 'project',
    method: 'get',
    params: { org: orgId, group: groupId, keyword, page, pagesize: pageSize }
  })
}

// 项目简单列表
export function projectSimple (orgId, groupId, keyword = null) {
  return request({
    url: 'project/simple',
    method: 'get',
    params: { org: orgId, group: groupId, keyword }
  })
}

// 创建项目
export function projectCreate (orgId, groupId, form) {
  return request({
    url: 'project',
    method: 'post',
    data: {
      org: orgId,
      group: groupId,
      alias: form.alias,
      title: form.title,
      desc: form.desc,
      develop: form.develop,
      build_cluster_id: form.build_cluster_id,
      repository: form.repository,
      build_profile: form.build_profile,
      default_port: form.default_port,
      image_name: form.image_name,
      image_tag: form.image_tag,
      source_registry_id: form.source_registry_id,
      runtime_import: form.runtime_import,
      import_env_id: form.import_env_id,
      import_source: form.import_source,
      registries: form.registries
    }
  })
}

// 更新项目
export function projectUpdate (orgId, groupId, projectId, form) {
  return request({
    url: 'project',
    method: 'put',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      title: form.title,
      desc: form.desc,
      default_port: form.default_port,
      image_name: form.image_name,
      registries: form.registries,
      repository: form.repository,
      build_cluster_id: form.build_cluster_id,
      build_profile: form.build_profile
    }
  })
}

export function dockerfileTemplateCatalog () {
  return request({ url: 'dockerfile-template/catalog', method: 'get' })
}

export function dockerfileTemplateRender (templateKey, options) {
  return request({
    url: 'dockerfile-template/render',
    method: 'post',
    data: { template_key: templateKey, options }
  })
}

export function projectBuildProfileUpgradePreview (orgId, groupId, projectId) {
  return request({
    url: 'project/build-profile/upgrade-preview',
    method: 'post',
    data: { org: orgId, group: groupId, project: projectId }
  })
}

export function projectBuildProfileRevisions (orgId, groupId, projectId) {
  return request({
    url: 'project/build-profile/revisions',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId }
  })
}

export function projectBuildProfileRollback (orgId, groupId, projectId, revisionId) {
  return request({
    url: 'project/build-profile/rollback',
    method: 'post',
    data: { org: orgId, group: groupId, project: projectId, revision_id: revisionId }
  })
}

// 项目详情
export function projectProfile (orgId, groupId, projectId, withDefaultRegistry = null) {
  return request({
    url: 'project/profile',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, with_default_registry: withDefaultRegistry }
  })
}

// 项目简单信息
export function projectBasicProfile (orgId, groupId, projectId) {
  return request({
    url: 'project/basic',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId }
  })
}

export function projectRepositoryProfile (orgId, groupId, projectId) {
  return request({
    url: 'project/repository',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId }
  })
}

export function projectAuditLogs (orgId, groupId, projectId, filters = {}, page = 1, pageSize = 20) {
  return request({
    url: 'project/governance/audit',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, ...filters, page, pagesize: pageSize }
  })
}

export function projectRetentionPolicy (orgId, groupId, projectId) {
  return request({
    url: 'project/governance/retention',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId }
  })
}

export function projectRetentionPolicySave (orgId, groupId, projectId, form) {
  return request({
    url: 'project/governance/retention',
    method: 'put',
    data: { org: orgId, group: groupId, project: projectId, ...form }
  })
}

// 获取项目创建/编辑特殊属性
export function projectCreateProps (orgId, groupId = null) {
  return request({
    url: 'project/createprops',
    method: 'get',
    params: { org: orgId, group: groupId }
  })
}

// 退出项目
export function projectExit (orgId, groupId, projectId) {
  return request({
    url: 'project/exit',
    method: 'post',
    data: { org: orgId, group: groupId, project: projectId }
  })
}

// 删除项目
export function projectDelete (orgId, groupId, projectId, confirmToken) {
  return request({
    url: 'project',
    method: 'delete',
    data: { org: orgId, group: groupId, project: projectId, confirm_token: confirmToken }
  })
}

// 获取删除项目资源概览
export function projectDeleteOverview (orgId, groupId, projectId) {
  return request({
    url: 'project/deleteoverview',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId }
  })
}

// 成员列表
export function projectMember (orgId, groupId, projectId, role = null, keyword = null, page = 1, pageSize = 20) {
  return request({
    url: 'project/member',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      project: projectId,
      role,
      keyword,
      page,
      pagesize: pageSize
    }
  })
}

// 添加成员
export function projectMemberCreate (orgId, groupId, projectId, uid, role) {
  return request({
    url: 'project/member',
    method: 'post',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      uid,
      role
    }
  })
}

// 更新成员角色
export function projectMemberRoleUpdate (orgId, groupId, projectId, uid, role) {
  return request({
    url: 'project/member/role',
    method: 'put',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      uid,
      role
    }
  })
}

// 批量更新成员角色
export function projectMemberRoleBatchUpdate (orgId, groupId, projectId, uids, role) {
  return request({
    url: 'project/member/batchrole',
    method: 'put',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      uids,
      role
    }
  })
}

// 移除成员
export function projectMemberRemove (orgId, groupId, projectId, uid) {
  return request({
    url: 'project/member',
    method: 'delete',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      uid
    }
  })
}

// 批量移除成员
export function projectMemberBatchRemove (orgId, groupId, projectId, uids) {
  return request({
    url: 'project/member/batch',
    method: 'delete',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      uids
    }
  })
}

// 从项目组成员搜索
export function projectMemberSearchFromGroup (orgId, groupId, role = null, keyword = null) {
  return request({
    url: 'project/member/searchfromgroup',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      role,
      keyword
    }
  })
}

// 项目可用的registry列表
export function projectRegistries (orgId, groupId = null, projectId = null, linked = false) {
  return request({
    url: 'project/registries',
    method: 'get',
    params: {
      org: orgId,
      ...(groupId !== null && groupId !== '' ? { group: groupId } : {}),
      ...(linked ? { project: projectId, linked: 1 } : {})
    }
  })
}

export function projectRegistryCatalog (orgId, groupId, registryId, search = '') {
  return request({
    url: 'project/registry/catalog',
    method: 'get',
    params: { org: orgId, group: groupId, registry_id: registryId, search }
  })
}

export function projectRegistryTags (orgId, groupId, registryId, repository) {
  return request({
    url: 'project/registry/tags',
    method: 'get',
    params: { org: orgId, group: groupId, registry_id: registryId, repository }
  })
}

export function projectImportSources (orgId, groupId, clusterId, type, nodeId = '') {
  return request({
    url: 'project/import/sources',
    method: 'get',
    params: { org: orgId, group: groupId, cluster_id: clusterId, type, node_id: nodeId }
  })
}

export function projectImportSourceProfile (orgId, groupId, source) {
  return request({
    url: 'project/import/source-profile',
    method: 'post',
    data: { org: orgId, group: groupId, source }
  })
}

// 项目概览
export function projectOverview (orgId, groupId, projectId) {
  return request({
    url: 'project/overview',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      project: projectId
    }
  })
}

// 项目概览源码统计（Git Vendor 慢数据）
export function projectOverviewSource (orgId, groupId, projectId) {
  return request({
    url: 'project/overview/source',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      project: projectId
    }
  })
}

// 构建记录
export function builds (
  orgId,
  groupId,
  projectId,
  pipelineId = null,
  status = null,
  hookId = null,
  page = 1,
  pageSize = 20
) {
  return request({
    url: 'build',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      project: projectId,
      pipeline_id: pipelineId,
      status,
      hook_id: hookId,
      page,
      pagesize: pageSize
    }
  })
}

// 新建构建
export function buildCreate (
  orgId,
  groupId,
  projectId,
  pipelineId,
  branch,
  commitId,
  remark,
  hookId,
  revisionType = 'commit'
) {
  return request({
    url: 'build',
    method: 'post',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      pipeline_id: pipelineId,
      branch,
      commit_id: commitId,
      revision_type: revisionType,
      remark,
      hook_id: hookId
    }
  })
}

// 重新构建
export function buildRebuild (orgId, groupId, projectId, buildId) {
  return request({
    url: 'build/rebuild',
    method: 'post',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      build_id: buildId
    }
  })
}

export function buildArtifactImport (orgId, groupId, projectId, form) {
  return request({
    url: 'build/artifact/import',
    method: 'post',
    data: { org: orgId, group: groupId, project: projectId, ...form }
  })
}

export function buildArtifactProfile (orgId, groupId, projectId, artifactId) {
  return request({
    url: 'build/artifact/profile',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, artifact: artifactId }
  })
}

export function buildArtifacts (orgId, groupId, projectId, page = 1, pageSize = 20) {
  return request({
    url: 'build/artifacts',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, page, pagesize: pageSize }
  })
}

// 取消构建
export function buildCancel (orgId, groupId, projectId, buildId) {
  return request({
    url: 'build/cancel',
    method: 'post',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      build_id: buildId
    }
  })
}

// 构建日志
export function buildLog (orgId, groupId, projectId, buildId) {
  return request({
    url: 'build/log',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      project: projectId,
      build_id: buildId
    }
  })
}

// Docker Swarm 发布选项
export function releaseOptions (orgId, groupId, projectId, clusterId = null) {
  return request({
    url: 'deploy/options',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, cluster_id: clusterId }
  })
}

export function releaseNetworkCreate (orgId, groupId, projectId, clusterId, name) {
  return request({
    url: 'deploy/network',
    method: 'post',
    data: { org: orgId, group: groupId, project: projectId, cluster_id: clusterId, name }
  })
}

export function projectConfigurations (orgId, groupId, projectId) {
  return request({
    url: 'project/configuration',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId }
  })
}

export function projectConfigurationCreate (orgId, groupId, projectId, form) {
  return request({
    url: 'project/configuration',
    method: 'post',
    data: { org: orgId, group: groupId, project: projectId, ...form }
  })
}

export function projectConfigurationUpdate (orgId, groupId, projectId, configurationId, form) {
  return request({
    url: 'project/configuration',
    method: 'put',
    data: { org: orgId, group: groupId, project: projectId, configuration_id: configurationId, ...form }
  })
}

export function projectConfigurationDelete (orgId, groupId, projectId, configurationId) {
  return request({
    url: 'project/configuration',
    method: 'delete',
    data: { org: orgId, group: groupId, project: projectId, configuration_id: configurationId }
  })
}

// 项目发布记录；主工作负载由目标集群决定（Swarm Service 或 Kubernetes Deployment）
export function releases (orgId, groupId, projectId, envId = null, clusterId = null, status = null, page = 1, pageSize = 20) {
  return request({
    url: 'deploy',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      project: projectId,
      env_id: envId,
      cluster_id: clusterId,
      status,
      page,
      pagesize: pageSize
    }
  })
}

// 创建项目发布；后端按目标集群选择 Runtime Driver
export function releaseCreate (orgId, groupId, projectId, form) {
  return request({
    url: 'deploy',
    method: 'post',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      env_id: form.env_id,
      cluster_id: form.cluster_id,
      artifact_id: form.artifact_id,
      version: form.version,
      remark: form.remark,
      spec: form.spec
    }
  })
}

export function projectRoutes (orgId, groupId, projectId, page = 1, pageSize = 20, runtimeId = null) {
  return request({
    url: 'deploy/route',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, page, pagesize: pageSize, runtime_id: runtimeId }
  })
}

export function projectRouteProfile (orgId, groupId, projectId, routeId) {
  return request({
    url: 'deploy/route/profile',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, route_id: routeId }
  })
}

export function projectRouteCreate (orgId, groupId, projectId, form) {
  return request({
    url: 'deploy/route',
    method: 'post',
    data: { ...form, org: orgId, group: groupId, project: projectId }
  })
}

export function projectRouteUpdate (orgId, groupId, projectId, routeId, form) {
  return request({
    url: 'deploy/route',
    method: 'put',
    data: { ...form, org: orgId, group: groupId, project: projectId, route_id: routeId }
  })
}

export function projectRouteDelete (orgId, groupId, projectId, routeId) {
  return request({
    url: 'deploy/route',
    method: 'delete',
    data: { org: orgId, group: groupId, project: projectId, route_id: routeId }
  })
}

export function projectRouteImportCandidates (orgId, groupId, projectId, runtimeId) {
  return request({
    url: 'deploy/route/import-candidates',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, runtime_id: runtimeId }
  })
}

export function projectRouteImport (orgId, groupId, projectId, runtimeId, vhostIds) {
  return request({
    url: 'deploy/route/import',
    method: 'post',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      runtime_id: runtimeId,
      vhost_ids: vhostIds
    }
  })
}

// 回滚到指定历史发布
export function releaseRollback (orgId, groupId, projectId, releaseId) {
  return request({
    url: 'deploy/rollback',
    method: 'post',
    data: { org: orgId, group: groupId, project: projectId, release_id: releaseId }
  })
}

export function releaseArtifactUpdate (orgId, groupId, projectId, runtimeId, artifactId, remark) {
  return request({
    url: 'deploy/artifact/update',
    method: 'post',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      runtime_id: runtimeId,
      artifact_id: artifactId,
      remark
    }
  })
}

export function releaseProfile (orgId, groupId, projectId, releaseId) {
  return request({
    url: 'deploy/profile',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, release_id: releaseId }
  })
}

export function projectRuntimes (orgId, groupId, projectId) {
  return request({
    url: 'deploy/runtime',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      project: projectId
    }
  })
}

export function projectRuntimeRename (orgId, groupId, projectId, runtimeId, name) {
  return request({
    url: 'deploy/runtime',
    method: 'put',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      runtime_id: runtimeId,
      name
    }
  })
}

export function projectRuntimeScale (orgId, groupId, projectId, runtimeId, replicas) {
  return request({
    url: 'deploy/runtime/scale',
    method: 'put',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      runtime_id: runtimeId,
      replicas
    }
  })
}

export function projectRuntimeRestart (orgId, groupId, projectId, runtimeId) {
  return request({
    url: 'deploy/runtime/restart',
    method: 'post',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      runtime_id: runtimeId
    }
  })
}

export function projectRuntimeRemove (orgId, groupId, projectId, runtimeId) {
  return request({
    url: 'deploy/runtime',
    method: 'delete',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      runtime_id: runtimeId
    }
  })
}

export function projectServiceDestroy (orgId, groupId, projectId, serviceId) {
  return request({
    url: 'deploy/runtime',
    method: 'delete',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      service_id: serviceId
    }
  })
}

export function projectMonitoring (orgId, groupId, projectId, hours = 24, runtimeId = null) {
  return request({
    url: 'deploy/monitoring',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, hours, runtime_id: runtimeId || undefined }
  })
}

export function projectHttpMonitoring (orgId, groupId, projectId, hours = 24, routeKey = null, runtimeId = null) {
  const route = routeKey ? String(routeKey).split(':', 2) : []
  return request({
    url: 'deploy/monitoring/http',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      project: projectId,
      hours,
      runtime_id: runtimeId || undefined,
      route_source: route[0] || undefined,
      route_id: route[1] || undefined
    }
  })
}

export function projectHttpMonitoringSummary (orgId, groupId, projectId, hours = 24) {
  return request({
    url: 'deploy/monitoring/http',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      project: projectId,
      hours,
      summary_only: 1
    }
  })
}

export function projectAlertProfile (orgId, groupId, projectId, runtimeId = null) {
  return request({
    url: 'deploy/alert',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, runtime_id: runtimeId || undefined }
  })
}

export function projectAlertSave (orgId, groupId, projectId, form) {
  return request({
    url: 'deploy/alert',
    method: 'put',
    data: { org: orgId, group: groupId, project: projectId, ...form }
  })
}

// git分支列表
export function gitBranches (orgId, groupId, projectId, refresh = false) {
  return request({
    url: 'build/gitbranches',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, refresh: refresh ? 1 : 0 }
  })
}

export function gitTags (orgId, groupId, projectId, refresh = false) {
  return request({
    url: 'build/gittags',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, refresh: refresh ? 1 : 0 }
  })
}

// git标签或者commitID列表
export function gitCommits (orgId, groupId, projectId, branch = null, refresh = false) {
  return request({
    url: 'build/gitcommits',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, branch, refresh: refresh ? 1 : 0 }
  })
}

// 镜像仓库-帐号列表
export function registryList (orgId, keyword = null, page = 1, pageSize = 20) {
  return request({
    url: 'registry',
    method: 'get',
    params: {
      org: orgId,
      keyword,
      page,
      pagesize: pageSize
    }
  })
}

// 镜像仓库-创建帐号
export function registryCreate (orgId, address, username, password, remark = null, namespace = null, proto = 1) {
  return request({
    url: 'registry',
    method: 'post',
    data: {
      org: orgId,
      address,
      username,
      password,
      remark,
      namespace,
      proto
    }
  })
}

// 镜像仓库-更新帐号
export function registryUpdate (orgId, registryId, address, username, password, remark = null, namespace = null, proto = 1) {
  const data = {
    org: orgId,
    registry_id: registryId,
    address,
    username,
    remark,
    namespace,
    proto
  }
  if (password !== null && password !== undefined && password !== '') {
    data.password = password
  }
  return request({
    url: 'registry',
    method: 'put',
    data
  })
}

// 镜像仓库-删除帐号
export function registryDelete (orgId, registryId, confirmToken) {
  return request({
    url: 'registry',
    method: 'delete',
    data: {
      org: orgId,
      registry_id: registryId,
      confirm_token: confirmToken
    }
  })
}

// 镜像仓库-设置推送镜像仓库
export function registrySetPush (orgId, registryId) {
  return request({
    url: 'registry/push',
    method: 'put',
    data: {
      org: orgId,
      registry_id: registryId
    }
  })
}

export function registryGroupGrants (orgId, registryId) {
  return request({
    url: 'registry/group-grants',
    method: 'get',
    params: { org: orgId, registry_id: registryId }
  })
}

export function registryGroupGrantsSave (orgId, registryId, grants) {
  return request({
    url: 'registry/group-grants',
    method: 'put',
    data: { org: orgId, registry_id: registryId, grants }
  })
}

// 镜像仓库-查看密码
export function registryShowPassword (orgId, registryId, confirmToken) {
  return request({
    url: 'registry/password',
    method: 'get',
    params: {
      org: orgId,
      registry_id: registryId,
      confirm_token: confirmToken
    }
  })
}

// 仓库目录
export function registryCatalog (orgId, registryId, search = '') {
  return request({
    url: 'registry/catalog',
    method: 'get',
    params: { org: orgId, registry_id: registryId, search }
  })
}

// 镜像标签
export function registryTags (orgId, registryId, repository) {
  return request({
    url: 'registry/tags',
    method: 'get',
    params: { org: orgId, registry_id: registryId, repository }
  })
}

// 删除镜像
export function registryDeleteImage (orgId, registryId, repository, tag) {
  return request({
    url: 'registry/image',
    method: 'delete',
    params: { org: orgId, registry_id: registryId, repository, tag }
  })
}

export function registryImageMappings (orgId) {
  return request({
    url: 'registry/image-mappings',
    method: 'get',
    params: { org: orgId }
  })
}

export function registryImageMappingSave (orgId, form) {
  return request({
    url: 'registry/image-mappings',
    method: 'post',
    data: {
      org: orgId,
      id: form.id || null,
      cluster_id: form.scope === 'cluster' ? Number(form.cluster_id) : 0,
      source_image: form.source_image,
      target_image: form.target_image,
      remark: form.remark,
      enabled: !!form.enabled
    }
  })
}

export function registryImageMappingDelete (orgId, id) {
  return request({
    url: 'registry/image-mappings',
    method: 'delete',
    data: { org: orgId, id }
  })
}
