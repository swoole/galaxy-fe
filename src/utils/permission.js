import Vue from 'vue'
import {
  ROLE_MANAGER as ORG_MANAGER
} from '@/consts/org'
import {
  ROLE_DIRECTOR as GROUP_DIRECTOR
} from '@/consts/group'
import {
  ROLE_DIRECTOR as PROJECT_DIRECTOR
} from '@/consts/project'

// 权限定义
// 三元组顺序固定为 [组织, 项目组, 项目]。
//   - 组织管理员(role=1) 在任意层级短路命中即拥有全部权限（级联）。
//   - 项目组负责人(role=9) 拥有项目组内全部权限。
//   - 项目负责人(role=9)   拥有项目内全部权限。
//   - 普通成员仅 '*' => 1 的低风险/非敏感功能可用；敏感、高危操作限定为负责人。
const table = [
  {
    // 组织管理员级别
    allows: [
      { [ORG_MANAGER]: 1 }
    ],
    scopes: [
      'org.member',
      'group.create',
      'org.update',
      'org.ops',
      'pipeline.template',
      'org.auth'
    ]
  },
  {
    // 非组织管理员：普通成员可退出组织（组织管理员不可退出）
    allows: [
      { [ORG_MANAGER]: 0, '*': 1 }
    ],
    scopes: [
      'org.exit'
    ]
  },
  {
    // 组织管理员 + 项目组负责人级别
    allows: [
      { [ORG_MANAGER]: 1 },
      { [GROUP_DIRECTOR]: 1 }
    ],
    scopes: [
      'group.update',
      'group.member.w',
      'project.create',
      'group.delete',
      'project.runtime.destroy'
    ]
  },
  {
    // 非项目组负责人：普通成员可退出项目组（负责人不可退出）
    allows: [
      {},
      { [GROUP_DIRECTOR]: 0, '*': 1 }
    ],
    scopes: [
      'group.exit'
    ]
  },
  {
    // 组织管理员 + 项目组负责人 + 项目负责人级别
    allows: [
      { [ORG_MANAGER]: 1 },
      { [GROUP_DIRECTOR]: 1 },
      { [PROJECT_DIRECTOR]: 1 }
    ],
    scopes: [
      'project.update',
      'project.member.w',
      'project.env_permission',
      'project.delete'
    ]
  },
  {
    // 非项目负责人：普通成员可退出项目（负责人不可退出）
    allows: [
      {},
      {},
      { [PROJECT_DIRECTOR]: 0, '*': 1 }
    ],
    scopes: [
      'project.exit'
    ]
  },
  {
    // 低风险/非敏感操作：组织管理员、项目组负责人、任意项目成员均可
    allows: [
      { [ORG_MANAGER]: 1 },
      { [GROUP_DIRECTOR]: 1 },
      { '*': 1 }
    ],
    scopes: [
      'project.no_viewer'
    ]
  }
]

// 权限解析缓存
const auths = {}
table.forEach(row => {
  row.scopes.forEach(scope => {
    auths[scope] = row.allows
  })
})

/**
 * 权限判断
 * @param {String} scope 权限命名空间，例如 group.create
 * @param {Array} roles 角色，格式为 ORG_ROLE、GROUP_ROLE、PROJECT_ROLE，其中 ORG_ROLE 必填
 * @returns {Boolean}
 */
function hasPermission (scope, ...roles) {
  if (auths[scope] === undefined) {
    return true
  }

  const auth = auths[scope]
  for (const index in roles) {
    const role = roles[index]
    // 没有此级别角色，认定无权限
    if (!role && role !== 0) {
      return false
    }
    // 未定义此级别权限，认定无权限
    if (auth[index] === undefined) {
      return false
    }
    // 定义了此级别的角色权限，认定有此/无此权限
    if (auth[index][role] !== undefined) {
      return !!auth[index][role]
    }
    // 定义了此级别的权限通配符，认定有此权限
    if (auth[index]['*'] !== undefined) {
      return !!auth[index]['*']
    }
  }

  // 没有匹配到权限，认定无权限
  return false
}

Vue.prototype.$p = hasPermission
