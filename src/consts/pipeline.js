/**
 * 工作量状态
 */
export const STATUS_PENDING = 0
export const STATUS_RUNNING = 1
export const STATUS_SUCCESS = 2
export const STATUS_ERROR = 3
export const STATUS_CANCELED = 4
export const STATUSES = {
  [STATUS_PENDING]: {
    label: '待执行',
    type: 'info'
  },
  [STATUS_RUNNING]: {
    label: '执行中',
    type: 'warning'
  },
  [STATUS_SUCCESS]: {
    label: '执行成功',
    type: 'success'
  },
  [STATUS_ERROR]: {
    label: '执行失败',
    type: 'error'
  },
  [STATUS_CANCELED]: {
    label: '已取消',
    type: 'info'
  }
}
