import request from '@/utils/request'

export const domains = (orgId, page = 1, pageSize = 100, keyword = null) => request({ url: 'resources/domains', method: 'get', params: { org: orgId, page, pagesize: pageSize, keyword } })
export const domainCreate = (orgId, form) => request({ url: 'resources/domains', method: 'post', data: { org: orgId, ...form } })
export const domainUpdate = (orgId, domainId, form) => request({ url: 'resources/domains', method: 'put', data: { org: orgId, domain_id: domainId, ...form } })
export const domainDelete = (orgId, domainId) => request({ url: 'resources/domains', method: 'delete', data: { org: orgId, domain_id: domainId } })
export const domainGroups = (orgId, domainId) => request({ url: 'resources/domains/group-grants', method: 'get', params: { org: orgId, domain_id: domainId } })
export const domainGroupsSave = (orgId, domainId, groupIds) => request({ url: 'resources/domains/group-grants', method: 'put', data: { org: orgId, domain_id: domainId, group_ids: groupIds } })
export const domainOptions = (orgId, groupId, projectId) => request({ url: 'resources/domains/options', method: 'get', params: { org: orgId, group: groupId, project: projectId } })
