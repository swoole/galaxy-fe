export const ORCHESTRATOR_DOCKER_SWARM = 'docker_swarm'
export const ORCHESTRATOR_KUBERNETES = 'kubernetes'

const modules = {
  [ORCHESTRATOR_DOCKER_SWARM]: {
    namespace: 'swarm',
    overviewRoute: 'ClusterSwarmOverview',
    listRoute: 'ClusterSwarmList',
    available: true
  },
  [ORCHESTRATOR_KUBERNETES]: {
    namespace: 'k8s',
    overviewRoute: 'ClusterK8sOverview',
    listRoute: 'ClusterK8sList',
    available: true
  }
}

export function orchestratorModule (type) {
  return modules[type] || null
}

export function clusterEntryRoute (cluster) {
  const module = orchestratorModule(cluster && cluster.orchestrator_type)
  if (!module || !module.available) return { name: 'ClusterSwarmList' }
  return { name: module.overviewRoute, params: { clusterId: Number(cluster.id) } }
}
