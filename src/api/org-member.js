import request from '@/utils/request'

// 组织成员列表
export function orgMember (
  orgId,
  role = null,
  keyword = null,
  page = 1,
  pageSize = 20
) {
  return request({
    url: 'org/member',
    method: 'get',
    params: { org: orgId, role, keyword, page, pagesize: pageSize }
  })
}

// 添加已经注册的平台用户为组织成员
export function orgMemberAdd (orgId, role, uid) {
  return request({
    url: 'org/member',
    method: 'post',
    data: {
      org: orgId,
      role,
      uid
    }
  })
}

// 更新组织成员信息
export function orgMemberProfileUpdate (orgId, uid, realname, workcode, role) {
  return request({
    url: 'org/member/profile',
    method: 'put',
    data: { org: orgId, uid, realname, workcode, role }
  })
}

// 更新组织成员角色
export function orgMemberRoleUpdate (orgId, uid, role) {
  return request({
    url: 'org/member/role',
    method: 'put',
    data: { org: orgId, uid, role }
  })
}

// 组织成员信息
export function orgMemberProfile (orgId, uid) {
  return request({
    url: 'org/member/profile',
    method: 'get',
    params: { org: orgId, uid }
  })
}

// 批量更新成员角色
export function orgMemberBatchRole (orgId, uids, role) {
  return request({
    url: 'org/member/batch-role',
    method: 'put',
    data: { org: orgId, uids, role }
  })
}

// 移除组织成员
export function orgMemberRemove (orgId, uid) {
  return request({
    url: 'org/member',
    method: 'delete',
    data: { org: orgId, uid }
  })
}

// 批量移除组织成员
export function orgMemberBatchRemove (orgId, uids) {
  return request({
    url: 'org/member/batch',
    method: 'delete',
    data: { org: orgId, uids }
  })
}

// 搜索用户
export function orgMemberSearch (orgId, query) {
  return request({
    url: 'org/member/search',
    method: 'get',
    params: { org: orgId, query }
  })
}
