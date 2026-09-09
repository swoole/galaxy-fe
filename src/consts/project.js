/**
 * Git仓库类型
 */
export const GITREPO_EXTERNAL = 2
export const GITREPOS = {
  [GITREPO_EXTERNAL]: '外部 Git 仓库'
}

/**
 * Git地址验证规则
 */
// eslint-disable-next-line
export const GITSRC_REGEX = /^(?:(?:https?|ssh):\/\/[^\s/]+(?:\/[^\s?#]+)+|[^@\s/]+@[^:\s]+:[^\s]+?)(?:\.git)?$/i

/**
 * Git厂商
 */
export const GIT_VENDOR_GITHUB = 1
export const GIT_VENDOR_GITEE = 2
export const GIT_VENDOR_GITLAB = 3
export const GIT_VENDOR_GITEA = 4
export const GIT_VENDORS = {
  [GIT_VENDOR_GITHUB]: {
    label: 'GitHub',
    tokenGetDocs: '/manual/gitauth/github.html',
    webhookSetDocs: '/manual/githook/github.html',
    webhookSetDocsTitle: 'GitHub Webhook配置',
    webhookSetUrl: '%s/settings/hooks/new'
  },
  [GIT_VENDOR_GITEE]: {
    label: '码云',
    tokenGetDocs: '/manual/gitauth/gitee.html',
    webhookSetDocs: '/manual/githook/gitee.html',
    webhookSetDocsTitle: '码云Webhook配置',
    webhookSetUrl: '%s/hooks/new'
  },
  [GIT_VENDOR_GITLAB]: {
    label: 'GitLab',
    tokenGetDocs: '/manual/gitauth/gitlab.html',
    webhookSetDocs: '/manual/githook/gitlab.html',
    webhookSetDocsTitle: 'GitLab Webhook配置',
    webhookSetUrl: '%s/-/settings/integrations'
  },
  [GIT_VENDOR_GITEA]: {
    label: 'Gitea',
    tokenGetDocs: '/manual/gitauth/gitea.html',
    webhookSetDocs: '/manual/githook/gitea.html',
    webhookSetDocsTitle: 'Gitea Webhook配置',
    webhookSetUrl: '%s/settings/hooks/gitea/new'
  }
}
export const GIT_VENDOR_PROTECT_DOMAINS = {
  [GIT_VENDOR_GITHUB]: 'github.com',
  [GIT_VENDOR_GITEE]: 'gitee.com'
}

/**
 * 项目成员角色
 */
export const ROLE_GENERAL = 0 // 普通成员
export const ROLE_DIRECTOR = 9 // 负责人
export const ROLES = {
  [ROLE_GENERAL]: {
    label: '普通成员',
    style: 'info'
  },
  [ROLE_DIRECTOR]: {
    label: '负责人',
    style: 'primary'
  }
}
export const ROLES_WITH_DIRECTOR = Object.assign({}, ROLES)
