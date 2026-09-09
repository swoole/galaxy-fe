import request from '@/utils/request'

// 项目组列表
export function groupList (orgId, keyword = null, page = 1, pagesize = 20) {
  return request({
    url: '/group',
    method: 'get',
    params: { org: orgId, keyword, page, pagesize }
  })
}

// 创建项目组
export function groupCreate (orgId, title = null, desc = null, alias = null) {
  return request({
    url: '/group',
    method: 'post',
    data: { org: orgId, title, desc, alias }
  })
}

// 更新项目组信息
export function groupUpdate (orgId, groupId, title = null, desc = null, alias = null) {
  return request({
    url: '/group',
    method: 'put',
    data: { org: orgId, group: groupId, title, desc, alias }
  })
}

// 项目组详情
export function groupProfile (orgId, groupId) {
  return request({
    url: '/group/profile',
    method: 'get',
    params: { org: orgId, group: groupId }
  })
}

// 退出项目组
export function groupExit (orgId, groupId) {
  return request({
    url: '/group/exit',
    method: 'post',
    data: { org: orgId, group: groupId }
  })
}

// 删除项目组
export function groupDelete (orgId, groupId) {
  return request({
    url: '/group',
    method: 'delete',
    data: { org: orgId, group: groupId }
  })
}

// 简单项目组列表
export function groupSimple (orgId, keyword = null, requireWrite = null) {
  return request({
    url: '/group/simple',
    method: 'get',
    params: { org: orgId, keyword, require_write: requireWrite }
  })
}

export function groupSshkey (orgId, groupId) {
  return request({
    url: '/group/sshkey',
    method: 'get',
    params: { org: orgId, group: groupId }
  })
}

export function groupSshkeyReset (orgId, groupId, algo, confirmToken) {
  return request({
    url: '/group/sshkey/reset',
    method: 'post',
    data: { org: orgId, group: groupId, algo, confirm_token: confirmToken }
  })
}
