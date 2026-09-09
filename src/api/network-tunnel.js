import request from '@/utils/request'

export function networkTunnelTopology (orgId) {
  return request({ url: 'resources/network-tunnels', method: 'get', params: { org: orgId } })
}

export function networkTunnelSourceServices (orgId, clusterId) {
  return request({
    url: 'resources/network-tunnels/source-services',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId },
    timeout: 60000
  })
}

export function networkTunnelAutomaticRuleSave (orgId, data) {
  return request({
    url: 'resources/network-tunnels/rules/automatic',
    method: 'post',
    data: { org: orgId, ...data },
    timeout: 180000
  })
}

export function networkTunnelServerCreate (orgId, data) {
  return request({ url: 'resources/network-tunnels/servers', method: 'post', data: { org: orgId, ...data } })
}

export function networkTunnelServerUpdate (orgId, data) {
  return request({ url: 'resources/network-tunnels/servers', method: 'put', data: { org: orgId, ...data } })
}

export function networkTunnelServerDelete (orgId, serverId) {
  return request({ url: 'resources/network-tunnels/servers', method: 'delete', data: { org: orgId, server_id: serverId } })
}

export function networkTunnelClientCreate (orgId, data) {
  return request({ url: 'resources/network-tunnels/clients', method: 'post', data: { org: orgId, ...data } })
}

export function networkTunnelClientUpdate (orgId, data) {
  return request({ url: 'resources/network-tunnels/clients', method: 'put', data: { org: orgId, ...data } })
}

export function networkTunnelClientDelete (orgId, clientId) {
  return request({ url: 'resources/network-tunnels/clients', method: 'delete', data: { org: orgId, client_id: clientId } })
}

export function networkTunnelRuleSave (orgId, data) {
  return request({
    url: 'resources/network-tunnels/rules',
    method: 'post',
    data: { org: orgId, ...data },
    timeout: 180000
  })
}

export function networkTunnelRuleDelete (orgId, tunnelId) {
  return request({ url: 'resources/network-tunnels/rules', method: 'delete', data: { org: orgId, tunnel_id: tunnelId } })
}

export function networkTunnelSync (orgId, serverId) {
  return request({ url: 'resources/network-tunnels/sync', method: 'post', data: { org: orgId, server_id: serverId }, timeout: 120000 })
}

export function networkTunnelSyncAll (orgId, clusterId = null) {
  return request({
    url: 'resources/network-tunnels/sync-all',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId },
    timeout: 300000
  })
}
