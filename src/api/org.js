import request from '@/utils/request'

// 简单组织列表
export function orgsSimple () {
  return request({
    url: 'org/simple',
    method: 'get'
  })
}

// 组织列表
export function orgs () {
  return request({
    url: 'org',
    method: 'get'
  })
}

// 获取创建组织属性
export function orgCreateProps () {
  return request({
    url: 'org/createprops',
    method: 'get'
  })
}

// 创建组织
// data = { type, title, realname, logo, desc }
export function orgCreate (data) {
  return request({
    url: 'org',
    method: 'post',
    data
  })
}

// 组织详情
export function orgProfile (orgId) {
  return request({
    url: 'org/profile',
    method: 'get',
    params: { org: orgId }
  })
}

// 组织简要信息
export function orgSimpleProfile (orgId) {
  return request({
    url: 'org/simpleprofile',
    method: 'get',
    params: { org: orgId }
  })
}

// 退出组织
export function orgExit (orgId) {
  return request({
    url: 'org/exit',
    method: 'post',
    data: { org: orgId }
  })
}

// 组织信息更新
// data = { title, logo, desc }
export function orgProfileUpdate (orgId, data) {
  return request({
    url: 'org/profile',
    method: 'put',
    data: { ...data, org: orgId }
  })
}

// 切换组织
export function orgSwitch (orgId) {
  return request({
    url: 'org/switch',
    method: 'post',
    data: { org: orgId }
  })
}

export function orgGetNames (orgId, groupList, projectList, envList, instanceList) {
  return request({
    url: 'org/names',
    method: 'get',
    params: {
      org: orgId,
      group_list: Array.from(groupList),
      project_list: Array.from(projectList),
      env_list: Array.from(envList),
      instance_list: Array.from(instanceList)
    }
  })
}

// 精确搜索
export function orgAdvanceSearch (orgId, searchOrgId, searchOrgTitle) {
  return request({
    url: 'org/search/advance',
    method: 'get',
    params: {
      org: orgId,
      search_org_id: searchOrgId,
      search_org_title: searchOrgTitle
    }
  })
}
