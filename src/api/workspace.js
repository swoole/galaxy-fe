import request from '@/utils/request'

const scope = (orgId, groupId, userId) => ({ org: orgId, group: groupId, user_id: userId })

export function workspaceList (orgId) {
  return request({ url: 'workspace/list', method: 'get', params: { org: orgId } })
}

export function workspaceOptions (orgId, groupId, userId) {
  return request({ url: 'workspace/options', method: 'get', params: scope(orgId, groupId, userId) })
}

export function workspaceProfile (orgId, groupId, userId) {
  return request({ url: 'workspace', method: 'get', params: scope(orgId, groupId, userId) })
}

export function workspaceCreate (orgId, groupId, userId, form) {
  return request({ url: 'workspace', method: 'post', data: { ...scope(orgId, groupId, userId), ...form } })
}

export function workspaceSetState (orgId, groupId, userId, action) {
  return request({ url: 'workspace/state', method: 'put', data: { ...scope(orgId, groupId, userId), action } })
}

export function workspaceDelete (orgId, groupId, userId) {
  return request({ url: 'workspace', method: 'delete', data: scope(orgId, groupId, userId) })
}

export function workspaceAccess (orgId, groupId, userId) {
  return request({ url: 'workspace/access', method: 'post', data: scope(orgId, groupId, userId) })
}

export function workspaceTerminal (orgId, groupId, userId) {
  return request({ url: 'workspace/terminal', method: 'post', data: scope(orgId, groupId, userId) })
}

export function workspaceProjectProfile (orgId, groupId, projectId) {
  return request({ url: 'workspace/project', method: 'get', params: { org: orgId, group: groupId, project: projectId } })
}

export function workspaceProjectOpen (orgId, groupId, projectId, workspaceId, branch) {
  return request({
    url: 'workspace/project/open',
    method: 'post',
    data: { org: orgId, group: groupId, project: projectId, workspace_id: workspaceId, branch }
  })
}
