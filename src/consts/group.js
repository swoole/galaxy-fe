/**
 * 项目组成员角色
 */
export const ROLE_GENERAL = 0 // 普通成员
export const ROLE_DIRECTOR = 9 // 负责人
export const ROLES = {
  [ROLE_GENERAL]: {
    label: '普通成员',
    style: 'info',
    effect: 'light'
  },
  [ROLE_DIRECTOR]: {
    label: '负责人',
    style: 'primary',
    effect: 'light'
  }
}
export const ROLES_WITH_DIRECTOR = Object.assign({}, ROLES)

export const STORAGE_TYPE_MYSQL = 1
export const STORAGE_TYPE_REDIS = 2
export const STORAGE_TYPE_MIDDLEWARE = 3
