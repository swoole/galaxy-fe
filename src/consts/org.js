/**
 * 组织成员角色
 */
export const ROLE_GENERAL = 0 // 普通成员
export const ROLE_MANAGER = 1 // 管理员
export const ROLES = {
  [ROLE_GENERAL]: {
    label: '普通成员',
    style: 'info'
  },
  [ROLE_MANAGER]: {
    label: '管理员',
    style: 'success'
  }
}
export const ROLES_WITH_DIRECTOR = Object.assign({}, ROLES)

/**
 * 组织类型.
 */
export const ORG_TYPE_PERSONAL = 0
export const ORG_TYPE_COMPANY = 1
export const ORG_TYPES = {
  [ORG_TYPE_PERSONAL]: {
    label: '个人空间',
    type: 'success'
  },
  [ORG_TYPE_COMPANY]: {
    label: '团队空间',
    type: 'primary'
  }
}

/**
 * 别名正则.
 */
export const ALIAS_REGEX = /^(?![-_0-9])[a-z0-9\-_]+(?<![-_])$/g
