import request from '@/utils/request'

export function kubernetesClusters (orgId) {
  return request({ url: 'cluster/k8s', method: 'get', params: { org: orgId } })
}

export function kubernetesClusterCreate (orgId, form) {
  return request({
    url: 'cluster/k8s',
    method: 'post',
    data: { org: orgId, title: form.title, remark: form.remark, kubeconfig: form.kubeconfig }
  })
}

export function kubernetesClusterDelete (orgId, clusterId) {
  return request({
    url: 'cluster/k8s',
    method: 'delete',
    data: { org: orgId, cluster_id: clusterId }
  })
}

export function kubernetesClusterProfile (orgId, clusterId) {
  return request({
    url: 'cluster/k8s/profile',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

export function kubernetesClusterIngressSettings (orgId, clusterId, form) {
  return request({
    url: 'cluster/k8s/ingress-settings',
    method: 'put',
    data: {
      org: orgId,
      cluster_id: clusterId,
      ingress_http_port: form.ingress_http_port,
      ingress_https_port: form.ingress_https_port
    }
  })
}

export function kubernetesClusterCheck (orgId, clusterId) {
  return request({
    url: 'cluster/k8s/check',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

export function kubernetesClusterOverview (orgId, clusterId) {
  return request({
    url: 'cluster/k8s/overview',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

export function kubernetesClusterNodes (orgId, clusterId) {
  return request({
    url: 'cluster/k8s/nodes',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

export function kubernetesClusterNodeDetail (orgId, clusterId, name) {
  return request({
    url: 'cluster/k8s/nodes/detail',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, name }
  })
}

export function kubernetesClusterNamespaces (orgId, clusterId) {
  return request({
    url: 'cluster/k8s/namespaces',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

export function kubernetesClusterNamespaceDetail (orgId, clusterId, namespace) {
  return request({
    url: 'cluster/k8s/namespaces/detail',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, namespace }
  })
}

export function kubernetesClusterNamespaceResources (orgId, clusterId, form) {
  return request({
    url: 'cluster/k8s/namespaces/resources',
    method: 'put',
    data: { org: orgId, cluster_id: clusterId, ...form }
  })
}

function namespacedResource (path, orgId, clusterId, namespace = '') {
  return request({
    url: `cluster/k8s/${path}`,
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, namespace }
  })
}

export function kubernetesClusterPods (orgId, clusterId, namespace = '') {
  return namespacedResource('pods', orgId, clusterId, namespace)
}

export function kubernetesClusterDeployments (orgId, clusterId, namespace = '') {
  return namespacedResource('deployments', orgId, clusterId, namespace)
}

export function kubernetesClusterServices (orgId, clusterId, namespace = '') {
  return namespacedResource('services', orgId, clusterId, namespace)
}

// ---- ConfigMaps ----
export function kubernetesClusterConfigMaps (orgId, clusterId, namespace = '') {
  return request({ url: 'cluster/k8s/configmaps', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace } })
}
export function kubernetesClusterConfigMapDetail (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/configmaps/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterConfigMapCreate (orgId, clusterId, form) {
  return request({ url: 'cluster/k8s/configmaps', method: 'post', data: { org: orgId, cluster_id: clusterId, ...form } })
}
export function kubernetesClusterConfigMapUpdate (orgId, clusterId, form) {
  return request({ url: 'cluster/k8s/configmaps', method: 'put', data: { org: orgId, cluster_id: clusterId, ...form } })
}
export function kubernetesClusterConfigMapDelete (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/configmaps', method: 'delete', data: { org: orgId, cluster_id: clusterId, namespace, name } })
}

// ---- Secrets ----
export function kubernetesClusterSecrets (orgId, clusterId, namespace = '') {
  return request({ url: 'cluster/k8s/secrets', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace } })
}
export function kubernetesClusterSecretDetail (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/secrets/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterSecretCreate (orgId, clusterId, form) {
  return request({ url: 'cluster/k8s/secrets', method: 'post', data: { org: orgId, cluster_id: clusterId, ...form } })
}
export function kubernetesClusterSecretUpdate (orgId, clusterId, form) {
  return request({ url: 'cluster/k8s/secrets', method: 'put', data: { org: orgId, cluster_id: clusterId, ...form } })
}
export function kubernetesClusterSecretDelete (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/secrets', method: 'delete', data: { org: orgId, cluster_id: clusterId, namespace, name } })
}

// ---- Namespaces (create / delete) ----
export function kubernetesClusterNamespaceCreate (orgId, clusterId, form) {
  return request({ url: 'cluster/k8s/namespaces', method: 'post', data: { org: orgId, cluster_id: clusterId, ...form } })
}
export function kubernetesClusterNamespaceDelete (orgId, clusterId, name) {
  return request({ url: 'cluster/k8s/namespaces', method: 'delete', data: { org: orgId, cluster_id: clusterId, name } })
}

// ---- Deployments (detail / create / update / delete / scale / restart) ----
export function kubernetesClusterDeploymentDetail (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/deployments/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterDeploymentCreate (orgId, clusterId, form) {
  return request({ url: 'cluster/k8s/deployments', method: 'post', data: { org: orgId, cluster_id: clusterId, ...form } })
}
export function kubernetesClusterDeploymentUpdate (orgId, clusterId, form) {
  return request({ url: 'cluster/k8s/deployments', method: 'put', data: { org: orgId, cluster_id: clusterId, ...form } })
}
export function kubernetesClusterDeploymentDelete (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/deployments', method: 'delete', data: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterDeploymentScale (orgId, clusterId, namespace, name, replicas) {
  return request({ url: 'cluster/k8s/deployments/scale', method: 'post', data: { org: orgId, cluster_id: clusterId, namespace, name, replicas } })
}
export function kubernetesClusterDeploymentRestart (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/deployments/restart', method: 'post', data: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterDeploymentResources (orgId, clusterId, namespace, name, containers) {
  return request({ url: 'cluster/k8s/deployments/resources', method: 'post', data: { org: orgId, cluster_id: clusterId, namespace, name, containers } })
}
// 通用部分更新：传入需要变更的字段片段（containers/volumes/hostNetwork/dnsPolicy/dnsConfig/labels/podLabels/replicas）
export function kubernetesClusterDeploymentApply (orgId, clusterId, namespace, name, fragment) {
  return request({ url: 'cluster/k8s/deployments/apply', method: 'post', data: { org: orgId, cluster_id: clusterId, namespace, name, ...fragment } })
}

// ---- Services (detail / create / update / delete) ----
export function kubernetesClusterServiceDetail (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/services/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterServiceCreate (orgId, clusterId, form) {
  return request({ url: 'cluster/k8s/services', method: 'post', data: { org: orgId, cluster_id: clusterId, ...form } })
}
export function kubernetesClusterServiceUpdate (orgId, clusterId, form) {
  return request({ url: 'cluster/k8s/services', method: 'put', data: { org: orgId, cluster_id: clusterId, ...form } })
}
export function kubernetesClusterServiceDelete (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/services', method: 'delete', data: { org: orgId, cluster_id: clusterId, namespace, name } })
}

// ---- Ingresses (list / detail / create / update / delete) ----
export function kubernetesClusterIngresses (orgId, clusterId, namespace = '') {
  return request({ url: 'cluster/k8s/ingresses', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace } })
}
export function kubernetesClusterIngressDetail (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/ingresses/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterIngressCreate (orgId, clusterId, form) {
  return request({ url: 'cluster/k8s/ingresses', method: 'post', data: { org: orgId, cluster_id: clusterId, ...form } })
}
export function kubernetesClusterIngressUpdate (orgId, clusterId, form) {
  return request({ url: 'cluster/k8s/ingresses', method: 'put', data: { org: orgId, cluster_id: clusterId, ...form } })
}
export function kubernetesClusterIngressDelete (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/ingresses', method: 'delete', data: { org: orgId, cluster_id: clusterId, namespace, name } })
}

// ---- Pods (detail / logs / delete) ----
export function kubernetesClusterPodDetail (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/pods/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterPodLogs (orgId, clusterId, namespace, name, params = {}) {
  return request({
    url: 'cluster/k8s/pods/logs',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, namespace, name, container: params.container || '', tail_lines: params.tail_lines || 200 }
  })
}
export function kubernetesClusterPodDelete (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/pods', method: 'delete', data: { org: orgId, cluster_id: clusterId, namespace, name } })
}
// 为 Pod Exec WebSocket 终端申请一次性短期票据
export function createClusterK8sTerminalTicket (orgId, clusterId, payload) {
  return request({
    url: 'cluster/k8s/pods/terminal-ticket',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, namespace: payload.namespace, name: payload.name, container: payload.container, command: payload.command || [] }
  })
}

// ---- StatefulSets (list / detail / scale / delete) ----
export function kubernetesClusterStatefulSets (orgId, clusterId, namespace = '') {
  return namespacedResource('statefulsets', orgId, clusterId, namespace)
}
export function kubernetesClusterStatefulSetDetail (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/statefulsets/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterStatefulSetScale (orgId, clusterId, namespace, name, replicas) {
  return request({ url: 'cluster/k8s/statefulsets/scale', method: 'post', data: { org: orgId, cluster_id: clusterId, namespace, name, replicas } })
}
export function kubernetesClusterStatefulSetDelete (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/statefulsets', method: 'delete', data: { org: orgId, cluster_id: clusterId, namespace, name } })
}

// ---- DaemonSets (list / detail / delete) ----
export function kubernetesClusterDaemonSets (orgId, clusterId, namespace = '') {
  return namespacedResource('daemonsets', orgId, clusterId, namespace)
}
export function kubernetesClusterDaemonSetDetail (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/daemonsets/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterDaemonSetDelete (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/daemonsets', method: 'delete', data: { org: orgId, cluster_id: clusterId, namespace, name } })
}

// ---- Jobs (list / detail / delete) ----
export function kubernetesClusterJobs (orgId, clusterId, namespace = '') {
  return namespacedResource('jobs', orgId, clusterId, namespace)
}
export function kubernetesClusterJobDetail (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/jobs/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterJobDelete (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/jobs', method: 'delete', data: { org: orgId, cluster_id: clusterId, namespace, name } })
}

// ---- CronJobs (list / detail / delete) ----
export function kubernetesClusterCronJobs (orgId, clusterId, namespace = '') {
  return namespacedResource('cronjobs', orgId, clusterId, namespace)
}
export function kubernetesClusterCronJobDetail (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/cronjobs/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterCronJobDelete (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/cronjobs', method: 'delete', data: { org: orgId, cluster_id: clusterId, namespace, name } })
}

// ---- Storage: PersistentVolumes (cluster scoped) ----
export function kubernetesClusterPersistentVolumes (orgId, clusterId) {
  return request({ url: 'cluster/k8s/persistentvolumes', method: 'get', params: { org: orgId, cluster_id: clusterId } })
}
export function kubernetesClusterPersistentVolumeDetail (orgId, clusterId, name) {
  return request({ url: 'cluster/k8s/persistentvolumes/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, name } })
}
export function kubernetesClusterPersistentVolumeDelete (orgId, clusterId, name) {
  return request({ url: 'cluster/k8s/persistentvolumes', method: 'delete', data: { org: orgId, cluster_id: clusterId, name } })
}

// ---- Storage: PersistentVolumeClaims (list / detail / delete) ----
export function kubernetesClusterPersistentVolumeClaims (orgId, clusterId, namespace = '') {
  return namespacedResource('persistentvolumeclaims', orgId, clusterId, namespace)
}
export function kubernetesClusterPersistentVolumeClaimDetail (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/persistentvolumeclaims/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, namespace, name } })
}
export function kubernetesClusterPersistentVolumeClaimDelete (orgId, clusterId, namespace, name) {
  return request({ url: 'cluster/k8s/persistentvolumeclaims', method: 'delete', data: { org: orgId, cluster_id: clusterId, namespace, name } })
}

// ---- Storage: StorageClasses (cluster scoped) ----
export function kubernetesClusterStorageClasses (orgId, clusterId) {
  return request({ url: 'cluster/k8s/storageclasses', method: 'get', params: { org: orgId, cluster_id: clusterId } })
}
export function kubernetesClusterStorageClassDetail (orgId, clusterId, name) {
  return request({ url: 'cluster/k8s/storageclasses/detail', method: 'get', params: { org: orgId, cluster_id: clusterId, name } })
}
export function kubernetesClusterStorageClassDelete (orgId, clusterId, name) {
  return request({ url: 'cluster/k8s/storageclasses', method: 'delete', data: { org: orgId, cluster_id: clusterId, name } })
}

// ---- Events ----
export function kubernetesClusterEvents (orgId, clusterId, namespace = '') {
  return namespacedResource('events', orgId, clusterId, namespace)
}
// 某个具体对象（如节点）相关的事件，按 involvedObject 过滤
export function kubernetesClusterObjectEvents (orgId, clusterId, kind, name) {
  return request({
    url: 'cluster/k8s/events',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, involved_kind: kind, involved_name: name }
  })
}
