import request from '@/utils/request'

// 成员列表
export function groupMemberList (orgId, groupId, role = null, keyword = null, page = 1, pagesize = 20) {
  return request({
    url: '/group/member',
    method: 'get',
    params: { org: orgId, group: groupId, role, keyword, page, pagesize }
  })
}

// 添加成员
export function groupMemberCreate (orgId, groupId, uid, role = null) {
  return request({
    url: '/group/member',
    method: 'post',
    data: { org: orgId, group: groupId, uid, role }
  })
}

// 更新成员角色
export function groupMemberRoleUpdate (orgId, groupId, uid, role = null) {
  return request({
    url: '/group/member/role',
    method: 'put',
    data: { org: orgId, group: groupId, uid, role }
  })
}

// 批量更新组织成员角色
export function groupMemberBatchUpdate (orgId, groupId, uids, role = null) {
  return request({
    url: '/group/member/batchrole',
    method: 'put',
    data: { org: orgId, group: groupId, uids, role }
  })
}

// 移除成员
export function groupMemberDelete (orgId, groupId, uid) {
  return request({
    url: '/group/member',
    method: 'delete',
    data: { org: orgId, group: groupId, uid }
  })
}

// 批量移除成员
export function groupMemberBatchDelete (orgId, groupId, uids) {
  return request({
    url: '/group/member/batch',
    method: 'delete',
    data: { org: orgId, group: groupId, uids }
  })
}

// 从组织成员搜索
export function groupMemberSearchFromOrg (orgId, role = null, keyword = null) {
  return request({
    url: '/group/member/searchfromorg',
    method: 'get',
    params: { org: orgId, role, keyword }
  })
}
