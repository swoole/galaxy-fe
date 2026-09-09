import request from '@/utils/request'

// “app” 仅保留应用市场语义。项目研发域接口位于 @/api/project。
export function appMarketQueryProgress (orgId, jobId, begin = 0.0) {
  return request({
    url: 'appmarket/queryprogress',
    method: 'get',
    params: { org: orgId, job_id: jobId, begin }
  })
}

export function appMarketTpls (type = null, service = null, lang = null, framework = null, category = null, tags = [], keyword = null, sort = [], page = 1, pageSize = 20) {
  return request({
    url: 'appmarket/tpls',
    method: 'post',
    data: { type, service, lang, framework, category, tags, keyword, sort, page, pagesize: pageSize }
  })
}

export function appMarketFilterMetadata (orgId) {
  return request({ url: 'appmarket/filtermetadata', method: 'get', params: { org: orgId } })
}

export function appMarketTplProfile (tplId) {
  return request({ url: 'appmarket/tplprofile', method: 'get', params: { tpl_id: tplId } })
}

export function appMarketTplUse (orgId, tplId, form) {
  return request({ url: 'appmarket/tpluse', method: 'post', data: { org: orgId, tpl_id: tplId, form } })
}

export function appMarketSwarmClusters (orgId) {
  return request({ url: 'appmarket/swarm/clusters', method: 'get', params: { org: orgId } })
}

export function appMarketKubernetesClusters (orgId) {
  return request({ url: 'appmarket/kubernetes/clusters', method: 'get', params: { org: orgId } })
}

export function appMarketKubernetesInstallations (orgId) {
  return request({ url: 'appmarket/kubernetes/installations', method: 'get', params: { org: orgId } })
}

export function appMarketSwarmNetworks (orgId, clusterId) {
  return request({ url: 'appmarket/swarm/networks', method: 'get', params: { org: orgId, cluster_id: clusterId } })
}

export function appMarketSwarmNetworkCreate (orgId, clusterId, name) {
  return request({
    url: 'appmarket/swarm/networks/create',
    method: 'post',
    params: { org: orgId },
    data: { cluster_id: clusterId, name }
  })
}

export function appMarketSwarmContainers (orgId, clusterId) {
  return request({ url: 'appmarket/swarm/containers', method: 'get', params: { org: orgId, cluster_id: clusterId } })
}

export function appMarketReconfigure (orgId, installationId, values) {
  return request({
    url: 'appmarket/swarm/reconfigure',
    method: 'post',
    data: { org: orgId, installation_id: installationId, values }
  })
}

export function appMarketSwarmInstallations (orgId) {
  return request({ url: 'appmarket/swarm/installations', method: 'get', params: { org: orgId } })
}

export function appMarketSwarmFindInstallation (orgId, clusterId, serviceName) {
  return request({
    url: 'appmarket/swarm/find-installation',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, service_name: serviceName }
  })
}
