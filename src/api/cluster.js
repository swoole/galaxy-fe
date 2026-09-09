import request from '@/utils/request'

const projectScope = (scope = {}) => ({
  ...(scope && scope.projectId ? { group: scope.groupId, project: scope.projectId } : {}),
  ...(scope && scope.nodeId ? { node_id: scope.nodeId } : {})
})

// 集群列表
export function clusters (orgId, envId = null, keyword = null) {
  return request({
    url: 'cluster/swarm',
    method: 'get',
    params: { org: orgId, env_id: envId, keyword }
  })
}

// 关联实例列表
// 集群简单列表
export function clusterSimple (orgId, envId = null, keyword = null) {
  return request({
    url: 'cluster/simple',
    method: 'get',
    params: { org: orgId, env_id: envId, keyword }
  })
}

// 创建集群
export function clusterCreate (orgId, form) {
  return request({
    url: 'cluster/swarm',
    method: 'post',
    data: {
      org: orgId,
      title: form.title,
      remark: form.remark
    }
  })
}

export function clusterSwarmAgentTokenRotate (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/agent-token',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId }
  })
}

export function clusterSwarmAgentReset (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/agent-reset',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId }
  })
}

// 更新集群
// 集群节点列表
// 集群节点指标
// 获取删除集群概览
export function clusterDeleteOverview (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/deleteoverview',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

// 删除集群
export function clusterDelete (orgId, clusterId, confirmToken) {
  return request({
    url: 'cluster/swarm',
    method: 'delete',
    data: { org: orgId, cluster_id: clusterId, confirm_token: confirmToken }
  })
}

export function clusterGroupGrants (orgId, clusterId) {
  return request({
    url: 'cluster/group-grants',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

export function clusterGroupGrantsSave (orgId, clusterId, groupIds) {
  return request({
    url: 'cluster/group-grants',
    method: 'put',
    data: { org: orgId, cluster_id: clusterId, group_ids: groupIds }
  })
}

// 集群简单信息
export function clusterSimpleProfile (orgId, clusterId) {
  return request({
    url: 'cluster/simpleprofile',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

// 集群详情
// Docker Swarm 连通性检查（轻量级 ping）
export function clusterSwarmCheck (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/check',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

// 集群托管七层 Web 网关
export function clusterSwarmWebGateway (orgId, clusterId, scope = {}) {
  return request({
    url: 'cluster/swarm/web-gateway',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, ...projectScope(scope) }
  })
}

export function clusterSwarmWebGatewayMetrics (orgId, clusterId, hours = 24) {
  return request({
    url: 'cluster/swarm/web-gateway/metrics',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, hours },
    suppressErrorMessage: true
  })
}

export function clusterSwarmWebGatewayDeploy (orgId, clusterId, form) {
  return request({
    url: 'cluster/swarm/web-gateway',
    method: 'put',
    data: { org: orgId, cluster_id: clusterId, ...form }
  })
}

export function clusterSwarmWebGatewayRemove (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/web-gateway',
    method: 'delete',
    data: { org: orgId, cluster_id: clusterId }
  })
}

export function clusterSwarmWorkspaceDomainSave (orgId, clusterId, hostname, certificateId, httpsRedirect = true) {
  return request({
    url: 'cluster/swarm/web-gateway/workspace-domain',
    method: 'put',
    data: { org: orgId, cluster_id: clusterId, hostname, certificate_id: certificateId, https_redirect: httpsRedirect }
  })
}

export function clusterSwarmWorkspaceDomainDelete (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/web-gateway/workspace-domain',
    method: 'delete',
    data: { org: orgId, cluster_id: clusterId }
  })
}

export function clusterSwarmPrometheus (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/prometheus',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

export function clusterSwarmPrometheusDeploy (orgId, clusterId, form) {
  return request({
    url: 'cluster/swarm/prometheus',
    method: 'put',
    data: { org: orgId, cluster_id: clusterId, ...form }
  })
}

export function clusterSwarmPrometheusQuery (orgId, clusterId, queries, range = '1h', step = 60) {
  return request({
    url: 'cluster/swarm/prometheus/query',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, queries, range, step },
    // Prometheus 是可选能力，由调用页面内联呈现不可用状态，不弹全局错误。
    suppressErrorMessage: true
  })
}

// 网关路由规则（Vhost CRUD）
export function clusterSwarmVhosts (orgId, clusterId, page = 1, pageSize = 20, scope = {}) {
  return request({
    url: 'cluster/swarm/web-gateway/vhosts',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, page, pagesize: pageSize, ...projectScope(scope) }
  })
}

export function clusterSwarmVhostCreate (orgId, clusterId, form, scope = {}) {
  return request({
    url: 'cluster/swarm/web-gateway/vhosts',
    method: 'post',
    // Scope fields are authoritative. A route profile also contains relation
    // objects such as `project`; spreading that profile after the scope would
    // replace the project alias/id with an object.
    data: { ...form, org: orgId, cluster_id: clusterId, ...projectScope(scope) }
  })
}

export function clusterSwarmVhostUpdate (orgId, clusterId, vhostId, form, source = 'gateway', scope = {}) {
  return request({
    url: 'cluster/swarm/web-gateway/vhosts',
    method: 'put',
    data: {
      ...form,
      org: orgId,
      cluster_id: clusterId,
      ...projectScope(scope),
      vhost_id: vhostId,
      source
    }
  })
}

export function clusterSwarmVhostDelete (orgId, clusterId, vhostId, source = 'gateway', scope = {}) {
  return request({
    url: 'cluster/swarm/web-gateway/vhosts',
    method: 'delete',
    data: { org: orgId, cluster_id: clusterId, ...projectScope(scope), vhost_id: vhostId, source }
  })
}

export function clusterSwarmWebGatewayServices (orgId, clusterId, scope = {}) {
  return request({
    url: 'cluster/swarm/web-gateway/services',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, ...projectScope(scope) }
  })
}

// Docker Swarm 容器列表
export function clusterSwarmContainers (orgId, clusterId, nodeId = '') {
  return request({
    url: 'cluster/swarm/containers',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, node_id: nodeId }
  })
}

// Docker Swarm Config 列表
export function clusterSwarmConfigs (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/configs',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

// Docker Swarm Config 内容
export function clusterSwarmConfig (orgId, clusterId, configId) {
  return request({
    url: `cluster/swarm/configs/${configId}`,
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

// Docker Swarm Secret 列表
export function clusterSwarmSecrets (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/secrets',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

// Docker Swarm 新建 Config
export function clusterSwarmConfigCreate (orgId, clusterId, name, content, labels = {}) {
  return request({
    url: 'cluster/swarm/configs',
    method: 'post',
    params: { org: orgId, cluster_id: clusterId },
    data: { name, content, labels }
  })
}

// Docker Swarm 新建 Secret
export function clusterSwarmSecretCreate (orgId, clusterId, name, content, labels = {}) {
  return request({
    url: 'cluster/swarm/secrets',
    method: 'post',
    params: { org: orgId, cluster_id: clusterId },
    data: { name, content, labels }
  })
}

// Docker Swarm 删除 Config
export function clusterSwarmConfigDelete (orgId, clusterId, configId) {
  return request({
    url: 'cluster/swarm/config',
    method: 'delete',
    params: { org: orgId, cluster_id: clusterId },
    data: { config_id: configId }
  })
}

// Docker Swarm 删除 Secret
export function clusterSwarmSecretDelete (orgId, clusterId, secretId) {
  return request({
    url: 'cluster/swarm/secret',
    method: 'delete',
    params: { org: orgId, cluster_id: clusterId },
    data: { secret_id: secretId }
  })
}

// Docker 容器详情 (inspect)
export function clusterSwarmContainerInspect (orgId, clusterId, containerId, scope = {}) {
  return request({
    url: 'cluster/swarm/container-inspect',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, container_id: containerId, ...projectScope(scope) }
  })
}

// 启动容器
export function clusterSwarmContainerStart (orgId, clusterId, containerId, scope = {}) {
  return request({
    url: 'cluster/swarm/container-start',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, container_id: containerId, ...projectScope(scope) }
  })
}

// 停止容器
export function clusterSwarmContainerStop (orgId, clusterId, containerId, scope = {}) {
  return request({
    url: 'cluster/swarm/container-stop',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, container_id: containerId, ...projectScope(scope) }
  })
}

// 重启容器
export function clusterSwarmContainerRestart (orgId, clusterId, containerId, scope = {}) {
  return request({
    url: 'cluster/swarm/container-restart',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, container_id: containerId, ...projectScope(scope) }
  })
}

// 删除容器
export function clusterSwarmContainerRemove (orgId, clusterId, containerId, scope = {}) {
  return request({
    url: 'cluster/swarm/container',
    method: 'delete',
    params: { org: orgId, cluster_id: clusterId, container_id: containerId, ...projectScope(scope) }
  })
}

// 暂停容器
export function clusterSwarmContainerPause (orgId, clusterId, containerId, scope = {}) {
  return request({
    url: 'cluster/swarm/container-pause',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, container_id: containerId, ...projectScope(scope) }
  })
}

// 恢复（取消暂停）容器
export function clusterSwarmContainerResume (orgId, clusterId, containerId, scope = {}) {
  return request({
    url: 'cluster/swarm/container-resume',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, container_id: containerId, ...projectScope(scope) }
  })
}

// 强制杀死容器（SIGKILL）
export function clusterSwarmContainerKill (orgId, clusterId, containerId, scope = {}) {
  return request({
    url: 'cluster/swarm/container-kill',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, container_id: containerId, ...projectScope(scope) }
  })
}

// 容器实时统计（CPU / 内存 / 网络 / IO 聚合）
export function clusterSwarmContainerStats (orgId, clusterId, containerId, scope = {}) {
  return request({
    url: 'cluster/swarm/container-stats',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, container_id: containerId, ...projectScope(scope) }
  })
}

// 容器进程列表
export function clusterSwarmContainerTop (orgId, clusterId, containerId, scope = {}) {
  return request({
    url: 'cluster/swarm/container-top',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, container_id: containerId, ...projectScope(scope) }
  })
}

// Docker Swarm Services 列表
export function clusterSwarmServices (orgId, clusterId, scope = {}) {
  return request({
    url: 'cluster/swarm/services',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, ...projectScope(scope) }
  })
}

// 容器 / Service 日志
export function clusterSwarmContainerLogs (orgId, clusterId, containerId, tail = 100, scope = {}) {
  return request({
    url: 'cluster/swarm/container-logs',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, container_id: containerId, tail, ...projectScope(scope) }
  })
}

export function clusterSwarmServiceLogs (orgId, clusterId, serviceId, tail = 100, scope = {}) {
  return request({
    url: 'cluster/swarm/service-logs',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, service_id: serviceId, tail, ...projectScope(scope) }
  })
}

// Service 详情
export function clusterSwarmServiceInspect (orgId, clusterId, serviceId, scope = {}) {
  return request({
    url: 'cluster/swarm/service-inspect',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, service_id: serviceId, ...projectScope(scope) }
  })
}

// Service 伸缩
export function clusterSwarmServiceScale (orgId, clusterId, serviceId, replicas, scope = {}) {
  return request({
    url: 'cluster/swarm/service-scale',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, service_id: serviceId, replicas, ...projectScope(scope) }
  })
}

// Service 强制更新
export function clusterSwarmServiceForceUpdate (orgId, clusterId, serviceId, scope = {}) {
  return request({
    url: 'cluster/swarm/service-force-update',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, service_id: serviceId, ...projectScope(scope) }
  })
}

// Service 回滚
export function clusterSwarmServiceRollback (orgId, clusterId, serviceId, scope = {}) {
  return request({
    url: 'cluster/swarm/service-rollback',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, service_id: serviceId, ...projectScope(scope) }
  })
}

// 删除 Service
export function clusterSwarmServiceRemove (orgId, clusterId, serviceId, scope = {}) {
  return request({
    url: 'cluster/swarm/service',
    method: 'delete',
    params: { org: orgId, cluster_id: clusterId, service_id: serviceId, ...projectScope(scope) }
  })
}

// Prune Service 容器（批量强制更新）
export function clusterSwarmServicePrune (orgId, clusterId, serviceIds) {
  return request({
    url: 'cluster/swarm/service-prune',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, service_ids: serviceIds }
  })
}

// Service 变更网络
export function clusterSwarmServiceChangeNetwork (orgId, clusterId, serviceId, networkNames, scope = {}) {
  return request({
    url: 'cluster/swarm/service-change-network',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, service_id: serviceId, network_names: networkNames, ...projectScope(scope) }
  })
}

// Service 调整资源
export function clusterSwarmServiceUpdateResources (orgId, clusterId, serviceId, resources, scope = {}) {
  return request({
    url: 'cluster/swarm/service-resources',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, service_id: serviceId, ...resources, ...projectScope(scope) }
  })
}

// Service 更新环境变量
export function clusterSwarmServiceUpdateEnv (orgId, clusterId, serviceId, env, scope = {}) {
  return request({
    url: 'cluster/swarm/service-env',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, service_id: serviceId, env, ...projectScope(scope) }
  })
}

// Service 更新端口
export function clusterSwarmServiceUpdatePorts (orgId, clusterId, serviceId, ports, scope = {}) {
  return request({
    url: 'cluster/swarm/service-ports',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, service_id: serviceId, ports, ...projectScope(scope) }
  })
}

// Service 更新镜像（可输入新镜像或选择已有镜像）
export function clusterSwarmServiceUpdateImage (orgId, clusterId, serviceId, image, registryId = 0, scope = {}) {
  return request({
    url: 'cluster/swarm/service-image',
    method: 'post',
    data: {
      org: orgId,
      cluster_id: clusterId,
      service_id: serviceId,
      image,
      registry_id: registryId,
      ...projectScope(scope)
    }
  })
}

// Service 容器列表
export function clusterSwarmServiceContainers (orgId, clusterId, serviceId, scope = {}) {
  return request({
    url: 'cluster/swarm/service-containers',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, service_id: serviceId, ...projectScope(scope) }
  })
}

// Swarm 节点列表（只读）
export function clusterSwarmNodes (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/nodes',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

// Swarm 节点运行时指标（容器统计/磁盘，异步加载）
export function clusterSwarmNodesRuntime (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/nodes/runtime',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

// Swarm 节点详情（只读）
export function clusterSwarmNode (orgId, clusterId, nodeId) {
  return request({
    url: 'cluster/swarm/node/' + nodeId,
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

// 节点运行的任务（只读）
export function clusterSwarmNodeTasks (orgId, clusterId, nodeId) {
  return request({
    url: 'cluster/swarm/node-tasks',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, node_id: nodeId }
  })
}

// 节点容器列表（只读）
export function clusterSwarmNodeContainers (orgId, clusterId, nodeId) {
  return request({
    url: 'cluster/swarm/node-containers',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, node_id: nodeId }
  })
}

// Service 事件列表
export function clusterSwarmServiceEvents (orgId, clusterId, serviceId, params = {}, scope = {}) {
  return request({
    url: 'cluster/swarm/service-events',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, service_id: serviceId, ...params, ...projectScope(scope) }
  })
}

// Service 的 Config / Secret 映射
export function clusterSwarmServiceConfigsSecrets (orgId, clusterId, serviceId, scope = {}) {
  return request({
    url: 'cluster/swarm/service/configs-secrets',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, service_id: serviceId, ...projectScope(scope) }
  })
}

// Service 新增 Config 映射
export function clusterSwarmServiceConfigAdd (orgId, clusterId, serviceId, data, scope = {}) {
  return request({
    url: 'cluster/swarm/service/config-add',
    method: 'post',
    params: { org: orgId, cluster_id: clusterId, ...projectScope(scope) },
    data: { service_id: serviceId, ...data }
  })
}

// Service 新增 Secret 映射
export function clusterSwarmServiceSecretAdd (orgId, clusterId, serviceId, data, scope = {}) {
  return request({
    url: 'cluster/swarm/service/secret-add',
    method: 'post',
    params: { org: orgId, cluster_id: clusterId, ...projectScope(scope) },
    data: { service_id: serviceId, ...data }
  })
}

// Service 移除 Config 映射
export function clusterSwarmServiceConfigRemove (orgId, clusterId, serviceId, configId, scope = {}) {
  return request({
    url: 'cluster/swarm/service/config-remove',
    method: 'post',
    params: { org: orgId, cluster_id: clusterId, ...projectScope(scope) },
    data: { service_id: serviceId, config_id: configId }
  })
}

// Service 移除 Secret 映射
export function clusterSwarmServiceSecretRemove (orgId, clusterId, serviceId, secretId, scope = {}) {
  return request({
    url: 'cluster/swarm/service/secret-remove',
    method: 'post',
    params: { org: orgId, cluster_id: clusterId, ...projectScope(scope) },
    data: { service_id: serviceId, secret_id: secretId }
  })
}

// Service 任务列表
export function clusterSwarmServiceTasks (orgId, clusterId, serviceId, scope = {}) {
  return request({
    url: 'cluster/swarm/service-tasks',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, service_id: serviceId, ...projectScope(scope) }
  })
}

// 获取 Service 的 Configs 及内容
export function clusterSwarmServiceConfig (orgId, clusterId, serviceId, scope = {}) {
  return request({
    url: 'cluster/swarm/service-config',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, service_id: serviceId, ...projectScope(scope) }
  })
}

// Service 更新部署配置 (update_config / rollback_config)
export function clusterSwarmServiceUpdateConfig (orgId, clusterId, serviceId, updateConfig, rollbackConfig, scope = {}) {
  return request({
    url: 'cluster/swarm/service-update-config',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, service_id: serviceId, update_config: updateConfig, rollback_config: rollbackConfig, ...projectScope(scope) }
  })
}

// 更新 Service 挂载
export function clusterSwarmServiceUpdateMounts (orgId, clusterId, serviceId, mounts, scope = {}) {
  return request({
    url: 'cluster/swarm/service-mounts',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, service_id: serviceId, mounts, ...projectScope(scope) }
  })
}

// 更新 Service 的 Config 内容
export function clusterSwarmServiceConfigUpdate (orgId, clusterId, serviceId, configId, content, scope = {}) {
  return request({
    url: 'cluster/swarm/service-config',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, service_id: serviceId, config_id: configId, content, ...projectScope(scope) }
  })
}

// 在容器内执行命令
export function clusterSwarmContainerExec (orgId, clusterId, containerId, command, workingDir, scope = {}) {
  return request({
    url: 'cluster/swarm/container-exec',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, container_id: containerId, command, working_dir: workingDir || '', ...projectScope(scope) }
  })
}

// 列出容器内目录文件
export function clusterSwarmContainerListFiles (orgId, clusterId, containerId, path, scope = {}) {
  return request({
    url: 'cluster/swarm/container-list-files',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, container_id: containerId, path: path || '/', ...projectScope(scope) }
  })
}

// 写入文件到容器
export function clusterSwarmContainerWriteFile (orgId, clusterId, containerId, path, content, encoding, scope = {}) {
  return request({
    url: 'cluster/swarm/container-write-file',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, container_id: containerId, path, content, encoding: encoding || 'base64', ...projectScope(scope) }
  })
}

// 读取容器内文件内容 (base64)
export function clusterSwarmContainerReadFile (orgId, clusterId, containerId, path, scope = {}) {
  return request({
    url: 'cluster/swarm/container-read-file',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, container_id: containerId, path, ...projectScope(scope) }
  })
}

// 为 Docker Exec WebSocket 申请一次性短期票据
export function createClusterSwarmTerminalTicket (orgId, clusterId, containerId, scope = {}) {
  return request({
    url: 'cluster/swarm/terminal-ticket',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, container_id: containerId, ...projectScope(scope) }
  })
}

// 获取由 API 生成的原生 SSH 容器连接命令（不签发 WebSocket 票据）
export function getClusterSwarmTerminalSshCommand (orgId, clusterId, containerId, scope = {}) {
  return request({
    url: 'cluster/swarm/terminal-ssh-command',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, container_id: containerId, ...projectScope(scope) }
  })
}

// Docker Swarm 镜像列表
export function clusterSwarmImages (orgId, clusterId, nodeId = '') {
  return request({
    url: 'cluster/swarm/images',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, node_id: nodeId }
  })
}

// 从 Galaxy API 的 Redis 节点镜像缓存读取单个镜像详情
export function clusterSwarmImageInfo (orgId, clusterId, image, nodeId = '') {
  return request({
    url: 'cluster/swarm/image-info',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, image, node_id: nodeId }
  })
}

// 删除 Docker 镜像
export function clusterSwarmImageRemove (orgId, clusterId, imageId, nodeId = '') {
  return request({
    url: 'cluster/swarm/image',
    method: 'delete',
    params: { org: orgId, cluster_id: clusterId, image_id: imageId, node_id: nodeId }
  })
}

// 以 Service 形式运行镜像（对应 docker run）
export function clusterSwarmImageRun (orgId, clusterId, data) {
  return request({
    url: 'cluster/swarm/image-run',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, ...data }
  })
}

// 拉取 Docker 镜像（私有镜像通过 资源->镜像仓库 的凭据认证）
export function clusterSwarmImagePull (orgId, clusterId, image, registryId = 0, nodeId = '') {
  return request({
    url: 'cluster/swarm/image-pull',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, image, registry_id: registryId, node_id: nodeId }
  })
}

// Docker Swarm 网络列表
export function clusterSwarmNetworks (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/networks',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

// Docker Swarm 创建网络
export function clusterSwarmNetworkCreate (orgId, clusterId, name) {
  return request({
    url: 'cluster/swarm/networks/create',
    method: 'post',
    params: { org: orgId },
    data: { cluster_id: clusterId, name }
  })
}

// Docker Swarm 更新网络（labels / attachable / internal）
export function clusterSwarmNetworkUpdate (orgId, clusterId, id, data) {
  return request({
    url: 'cluster/swarm/network',
    method: 'put',
    params: { org: orgId },
    data: { cluster_id: clusterId, id, ...data }
  })
}

// Docker Swarm 删除网络
export function clusterSwarmNetworkDelete (orgId, clusterId, id) {
  return request({
    url: 'cluster/swarm/network',
    method: 'delete',
    params: { org: orgId },
    data: { cluster_id: clusterId, id }
  })
}

// Docker Swarm 网络关联容器列表
export function clusterSwarmNetworkContainers (orgId, clusterId, id) {
  return request({
    url: 'cluster/swarm/network/containers',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, id }
  })
}

// Docker Swarm 容器退出网络
export function clusterSwarmNetworkDisconnect (orgId, clusterId, id, containerId, force = false) {
  return request({
    url: 'cluster/swarm/network/disconnect',
    method: 'post',
    params: { org: orgId },
    data: { cluster_id: clusterId, id, container_id: containerId, force }
  })
}

// Docker Swarm 数据卷列表
export function clusterSwarmVolumes (orgId, clusterId, nodeId = '') {
  return request({
    url: 'cluster/swarm/volumes',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, node_id: nodeId }
  })
}

// 创建 Docker 数据卷
export function clusterSwarmVolumeCreate (orgId, clusterId, { name, driver, driverOpts, nodeId }) {
  return request({
    url: 'cluster/swarm/volume-create',
    method: 'post',
    data: { org: orgId, cluster_id: clusterId, name, driver, driver_opts: driverOpts, node_id: nodeId }
  })
}

// 删除 Docker 数据卷
export function clusterSwarmVolumeRemove (orgId, clusterId, name, force = false, nodeId = '') {
  return request({
    url: 'cluster/swarm/volume',
    method: 'delete',
    params: { org: orgId, cluster_id: clusterId, name, force: force ? 1 : 0, node_id: nodeId }
  })
}

// Docker Swarm 集群概览
export function clusterSwarmOverview (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/overview',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

export function clusterSwarmOverviewCore (orgId, clusterId) {
  return request({ url: 'cluster/swarm/overview/core', method: 'get', params: { org: orgId, cluster_id: clusterId } })
}

export function clusterSwarmOverviewTopology (orgId, clusterId) {
  return request({ url: 'cluster/swarm/overview/topology', method: 'get', params: { org: orgId, cluster_id: clusterId } })
}

export function clusterSwarmOverviewRuntime (orgId, clusterId) {
  return request({ url: 'cluster/swarm/overview/runtime', method: 'get', params: { org: orgId, cluster_id: clusterId } })
}

// 获取 Swarm 节点加入命令
export function clusterSwarmJoinCommands (orgId, clusterId, joinAddress = '') {
  return request({
    url: 'cluster/swarm/join-commands',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId, join_address: joinAddress || undefined }
  })
}

// Docker Swarm 连接设置
export function clusterSwarmSettings (orgId, clusterId) {
  return request({
    url: 'cluster/swarm/settings',
    method: 'get',
    params: { org: orgId, cluster_id: clusterId }
  })
}

// 更新 Docker Swarm 连接设置
export function clusterSwarmSettingsUpdate (orgId, clusterId, form) {
  return request({
    url: 'cluster/swarm/settings',
    method: 'put',
    data: {
      org: orgId,
      cluster_id: clusterId,
      title: form.title,
      remark: form.remark
    }
  })
}
