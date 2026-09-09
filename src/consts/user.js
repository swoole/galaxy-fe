/**
 * 用户身份认证状态.
 */
export const AUTH_STATUS_NO = 0
export const AUTH_STATUS_ACCEPTED = 1
export const AUTH_STATUS_EXPIRED = 2
export const AUTH_STATUSES = {
  [AUTH_STATUS_NO]: {
    label: '未认证',
    type: 'danger'
  },
  [AUTH_STATUS_ACCEPTED]: {
    label: '已认证',
    type: 'success'
  },
  [AUTH_STATUS_EXPIRED]: {
    label: '认证已过期',
    type: 'warning'
  }
}

/**
 * 用户身份认证记录状态.
 */
export const AUTH_HISTORY_STATUS_PENDING = 0
export const AUTH_HISTORY_STATUS_ACCEPTED = 1
export const AUTH_HISTORY_STATUS_REJECTED = 2
export const AUTH_HISTORY_STATUSES = {
  [AUTH_HISTORY_STATUS_PENDING]: {
    label: '待审核',
    type: 'info'
  },
  [AUTH_HISTORY_STATUS_ACCEPTED]: {
    label: '认证通过',
    type: 'success'
  },
  [AUTH_HISTORY_STATUS_REJECTED]: {
    label: '认证不通过',
    type: 'danger'
  }
}

export const NOTIFY_CHANNEL_EMAIL = 'email' // 邮件
export const NOTIFY_CHANNEL_NOTIFY = 'notify' // 站内信
export const NOTIFY_CHANNEL_BROWSER = 'browser' // 浏览器通知
export const NOTIFY_CHANNELS = {
  [NOTIFY_CHANNEL_EMAIL]: {
    label: '邮件',
    icon: ''
  },
  [NOTIFY_CHANNEL_NOTIFY]: {
    label: '站内信',
    icon: ''
  },
  [NOTIFY_CHANNEL_BROWSER]: {
    label: '浏览器通知',
    icon: ''
  }
}

/**
 * 通知场景.
 */
export const NOTIFY_SCENE_NOTIFY = 'notify' // 站内信
export const NOTIFY_SCENES = {
  build_complete: {
    label: '镜像构建',
    type: 'primary'
  },
  cluster_init: {
    label: '集群初始化',
    type: 'primary'
  },
  cluster_delete: {
    label: '集群删除',
    type: 'danger'
  },
  group_delete: {
    label: '项目组删除',
    type: 'danger'
  },
  project_delete: {
    label: '项目删除',
    type: 'danger'
  }
}
