// 命名空间分类与过滤选项定义（仿 Rancher 命名空间选择器）
//
// 用于区分 "系统命名空间" 与 "用户命名空间"，从而实现
// "默认只展示 User Namespaces 下的资源，除非用户手动切换"。

// 公认的系统命名空间（精确匹配）
const SYSTEM_EXACT = new Set([
  'kube-system',
  'kube-public',
  'kube-node-lease'
])

// 系统命名空间前缀（Rancher / 通用发行版常见）
const SYSTEM_PREFIXES = [
  'kube-',
  'cattle-',
  'fleet-',
  'istio-system',
  'kubesphere-'
]

// 判断某个命名空间是否为系统命名空间。
// 优先级：Rancher 注解 field.cattle.io/systemNamespace=true > 精确名 > 前缀匹配。
export function isSystemNamespace (name, annotations = {}, labels = {}) {
  if (!name) return false
  annotations = annotations || {}
  if (annotations['field.cattle.io/systemNamespace'] === 'true') {
    return true
  }
  if (SYSTEM_EXACT.has(name)) {
    return true
  }
  return SYSTEM_PREFIXES.some(prefix => name.indexOf(prefix) === 0)
}

// 选择器主选项（与 rancher-ns-selector.html 对齐）
export const NAMESPACE_FILTERS = [
  { id: 'all', label: 'All Namespaces' },
  { id: 'all_user', label: 'Only User Namespaces' },
  { id: 'all_system', label: 'Only System Namespaces' },
  { id: 'namespaced_true', label: 'Only Namespaced Resources' },
  { id: 'namespaced_false', label: 'Only Cluster Resources' }
]

export const DEFAULT_NAMESPACE_FILTER = 'all_user'

// 将选择器的值翻译为传给后端 resource list 接口的 namespace 参数。
// - ns:<name> -> name（精确命名空间，由后端过滤）
// - 其余聚合模式 -> ''（取全部，前端再按规则过滤）
export function namespaceParamFromFilter (filter) {
  if (filter && filter.indexOf('ns:') === 0) {
    return filter.slice(3)
  }
  return ''
}

// 判断单行资源是否命中当前命名空间过滤规则。
export function rowMatchesNamespaceFilter (row, filter, systemSet) {
  if (!filter || filter === 'all') return true
  const ns = row.namespace
  switch (filter) {
    case 'all_user':
      return !systemSet.has(ns)
    case 'all_system':
      return systemSet.has(ns)
    case 'namespaced_true':
      return !!ns
    case 'namespaced_false':
      return !ns
    default:
      if (filter.indexOf('ns:') === 0) {
        return ns === filter.slice(3)
      }
      return true
  }
}
