import request from '@/utils/request'

// 环境列表
export function envs (orgId) {
  return request({
    url: 'env',
    method: 'get',
    params: { org: orgId }
  })
}

// 关联实例列表
export function envRelInstances (
  orgId,
  envId,
  page = 1,
  pageSize = 20
) {
  return request({
    url: 'env/relinstances',
    method: 'get',
    params: {
      org: orgId,
      env_id: envId,
      page,
      pagesize: pageSize
    }
  })
}

// 环境简单列表
export function envSimple (orgId, groupId = null, projectId = null) {
  return request({
    url: 'env/simple',
    method: 'get',
    params: { org: orgId, group: groupId, project: projectId }
  })
}

// 新建环境
export function envCreate (orgId, form) {
  return request({
    url: 'env',
    method: 'post',
    data: {
      org: orgId,
      title: form.title,
      remark: form.remark,
      cluster_ids: form.cluster_ids
    }
  })
}

// 更新环境
export function envUpdate (orgId, envId, form) {
  return request({
    url: 'env',
    method: 'put',
    data: {
      env_id: envId,
      org: orgId,
      title: form.title,
      remark: form.remark,
      cluster_ids: form.cluster_ids
    }
  })
}

// 归档环境（保留历史发布和所有关联数据）
export function envArchive (orgId, envId) {
  return request({
    url: 'env/archive',
    method: 'put',
    data: { org: orgId, env_id: envId }
  })
}

export function envRestore (orgId, envId) {
  return request({
    url: 'env/restore',
    method: 'put',
    data: { org: orgId, env_id: envId }
  })
}

// 环境详情
export function envProfile (orgId, envId) {
  return request({
    url: 'env/profile',
    method: 'get',
    params: { org: orgId, env_id: envId }
  })
}
