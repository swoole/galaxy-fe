import request from '@/utils/request'

export function pipelineOptions (orgId, groupId, projectId) {
  return request({
    url: 'pipeline/options',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId }
  })
}

// 流水线列表
export function pipelines (
  orgId,
  groupId,
  projectId,
  keyword = null,
  page = 1,
  pageSize = 20
) {
  return request({
    url: 'pipeline',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      project: projectId,
      keyword,
      page,
      pagesize: pageSize
    }
  })
}

// 新建流水线
export function pipelineCreate (orgId, groupId, projectId, form) {
  return request({
    url: 'pipeline',
    method: 'post',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      title: form.title,
      remark: form.remark,
      yml: form.yml,
      cluster_id: form.cluster_id
    }
  })
}

// 更新流水线
export function pipelineUpdate (orgId, groupId, projectId, pipelineId, form) {
  return request({
    url: 'pipeline',
    method: 'put',
    data: {
      pipeline_id: pipelineId,
      org: orgId,
      group: groupId,
      project: projectId,
      title: form.title,
      remark: form.remark,
      yml: form.yml,
      cluster_id: form.cluster_id
    }
  })
}

// 删除流水线
export function pipelineDelete (orgId, groupId, projectId, pipelineId) {
  return request({
    url: 'pipeline',
    method: 'delete',
    data: { org: orgId, group: groupId, project: projectId, pipeline_id: pipelineId }
  })
}

// 流水线详情
export function pipelineProfile (orgId, groupId, projectId, pipelineId) {
  return request({
    url: 'pipeline/profile',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, pipeline_id: pipelineId }
  })
}

export function pipelineSecrets (orgId, groupId, projectId, pipelineId) {
  return request({
    url: 'pipeline/secrets',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId, pipeline_id: pipelineId }
  })
}

export function pipelineSecretPut (orgId, groupId, projectId, pipelineId, name, value) {
  return request({
    url: 'pipeline/secrets',
    method: 'put',
    data: { org: orgId, group: groupId, project: projectId, pipeline_id: pipelineId, name, value }
  })
}

export function pipelineSecretDelete (orgId, groupId, projectId, pipelineId, name) {
  return request({
    url: 'pipeline/secrets',
    method: 'delete',
    data: { org: orgId, group: groupId, project: projectId, pipeline_id: pipelineId, name }
  })
}

// 简单流水线列表
export function pipelineSimple (
  orgId,
  groupId,
  projectId,
  keyword = null
) {
  return request({
    url: 'pipeline/simple',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      project: projectId,
      keyword
    }
  })
}

// 流水线钩子列表
export function pipelineHooks (orgId, groupId, projectId) {
  return request({
    url: 'pipeline/hook',
    method: 'get',
    params: {
      org: orgId,
      group: groupId,
      project: projectId
    }
  })
}

// 创建钩子
export function pipelineHookCreate (
  orgId,
  groupId,
  projectId,
  pipelineId,
  branch,
  status,
  autoDeploy = 0,
  autoDeployTargets = []
) {
  return request({
    url: 'pipeline/hook',
    method: 'post',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      pipeline_id: pipelineId,
      branch,
      status,
      auto_deploy: autoDeploy,
      auto_deploy_targets: autoDeployTargets
    }
  })
}

// 更新钩子
export function pipelineHookUpdate (
  orgId,
  groupId,
  projectId,
  hookId,
  pipelineId,
  branch,
  status,
  autoDeploy = 0,
  autoDeployTargets = []
) {
  return request({
    url: 'pipeline/hook',
    method: 'put',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      id: hookId,
      pipeline_id: pipelineId,
      branch,
      status,
      auto_deploy: autoDeploy,
      auto_deploy_targets: autoDeployTargets
    }
  })
}

// 删除钩子
export function pipelineHookDelete (orgId, groupId, projectId, hookId) {
  return request({
    url: 'pipeline/hook',
    method: 'delete',
    data: {
      org: orgId,
      group: groupId,
      project: projectId,
      id: hookId
    }
  })
}

// 启用钩子
export function pipelineHookEnable (orgId, groupId, projectId, hookId) {
  return request({
    url: 'pipeline/hook/enable',
    method: 'put',
    params: {
      org: orgId,
      group: groupId,
      project: projectId,
      id: hookId
    }
  })
}

// 禁用钩子
export function pipelineHookDisable (orgId, groupId, projectId, hookId) {
  return request({
    url: 'pipeline/hook/disable',
    method: 'put',
    params: {
      org: orgId,
      group: groupId,
      project: projectId,
      id: hookId
    }
  })
}

export function pipelineHookSecretRotate (orgId, groupId, projectId) {
  return request({
    url: 'pipeline/hook/secret/rotate',
    method: 'post',
    data: { org: orgId, group: groupId, project: projectId }
  })
}
