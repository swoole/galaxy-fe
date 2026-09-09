<template>
  <cluster-module-layout
    :padding-top="paddingTop"
    orchestrator-type="kubernetes"
    namespace="k8s"
    list-route="ClusterK8sList"
    :nav-items="navItems" />
</template>

<script>
import ClusterModuleLayout from '@/views/cluster/components/ClusterModuleLayout'

export default {
  name: 'KubernetesClusterLayout',
  components: { ClusterModuleLayout },
  props: {
    paddingTop: { type: String, required: true }
  },
  data () {
    return {
      navItems: [
        { suffix: 'overview', index: 'ClusterK8sOverview', title: '概览', icon: 'dashboard' },
        { suffix: 'nodes', index: 'ClusterK8sNodes', title: '节点', icon: 'server' },
        {
          index: 'workloads',
          title: '工作负载',
          icon: 'box',
          children: [
            { suffix: 'pods', index: 'ClusterK8sPods', title: 'Pods' },
            { suffix: 'deployments', index: 'ClusterK8sDeployments', title: 'Deployments' },
            { suffix: 'statefulsets', index: 'ClusterK8sStatefulSets', title: 'StatefulSets' },
            { suffix: 'daemonsets', index: 'ClusterK8sDaemonSets', title: 'DaemonSets' },
            { suffix: 'jobs', index: 'ClusterK8sJobs', title: 'Jobs' },
            { suffix: 'cronjobs', index: 'ClusterK8sCronJobs', title: 'CronJobs' }
          ]
        },
        { suffix: 'namespaces', index: 'ClusterK8sNamespaces', title: 'Namespaces', icon: 'layers' },
        { suffix: 'services', index: 'ClusterK8sServices', title: 'Services', icon: 'sw-1' },
        { suffix: 'ingresses', index: 'ClusterK8sIngresses', title: 'Ingresses', icon: 'webhook' },
        {
          index: 'storage',
          title: '存储',
          icon: 'server',
          children: [
            { suffix: 'configmaps', index: 'ClusterK8sConfigMaps', title: 'ConfigMaps', icon: 'file' },
            { suffix: 'secrets', index: 'ClusterK8sSecrets', title: 'Secrets', icon: 'key' },
            { suffix: 'persistentvolumes', index: 'ClusterK8sPersistentVolumes', title: '持久卷 PV', icon: 'database' },
            { suffix: 'persistentvolumeclaims', index: 'ClusterK8sPersistentVolumeClaims', title: 'PVC', icon: 'layers' },
            { suffix: 'storageclasses', index: 'ClusterK8sStorageClasses', title: 'StorageClass', icon: 'svg-32' }
          ]
        },
        { suffix: 'events', index: 'ClusterK8sEvents', title: '事件 Events', icon: 'key' }
      ]
    }
  }
}
</script>
