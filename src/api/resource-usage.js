import request from '@/utils/request'

export function resourceUsageRanking (orgId, filters = {}) {
  return request({
    url: 'resources/usage-ranking',
    method: 'get',
    params: {
      org: orgId,
      metric: filters.metric || 'cpu',
      scope: filters.scope || 'project',
      cluster_id: filters.clusterId || undefined,
      orchestrator_type: filters.orchestratorType || undefined,
      limit: filters.limit || 50
    }
  })
}
