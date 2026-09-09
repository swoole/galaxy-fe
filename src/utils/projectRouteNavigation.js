import {
  ORCHESTRATOR_KUBERNETES
} from '@/constants/orchestrators'

function scopeParams (scope) {
  return {
    groupId: scope.groupId,
    projectId: scope.projectId,
    clusterId: Number(scope.clusterId)
  }
}

export function projectRouteCreateLocation (scope, target) {
  const params = scopeParams({
    ...scope,
    clusterId: target.cluster_id
  })
  const runtimeId = Number(target.runtime_id || target.id)
  if (target.orchestrator_type === ORCHESTRATOR_KUBERNETES) {
    return {
      name: 'ProjectKubernetesRouteCreate',
      params,
      query: { runtime_id: runtimeId }
    }
  }
  return {
    name: 'ProjectGatewayRouteCreate',
    params,
    query: {
      runtime_id: runtimeId,
      target_service: target.target_service || target.service_name || ''
    }
  }
}

export function projectRouteEditLocation (scope, route) {
  const params = {
    ...scopeParams({
      ...scope,
      clusterId: route.cluster_id
    }),
    routeId: route.id
  }
  if (route.orchestrator_type === ORCHESTRATOR_KUBERNETES) {
    return {
      name: 'ProjectKubernetesRouteEdit',
      params,
      query: { runtime_id: route.runtime_id }
    }
  }
  return {
    name: 'ProjectGatewayRouteEdit',
    params: {
      ...params,
      source: route.route_source || 'project'
    },
    query: { runtime_id: route.runtime_id }
  }
}
