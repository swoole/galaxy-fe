import request from '@/utils/request'

// 协同工作台条目：待办事项 / 工作任务 / 需求清单 / 备忘录
// 协同范围：todo/task/requirement 挂靠项目组（group），note 为私人（group=0）。
// 数据库中仍使用 group_id，对外请求参数使用 group。

// 列表（项目组内条目或私人备忘录）。groupId 传入项目组 ID；私人备忘录传 0。
export function workItemList (orgId, groupId = 0, params = {}) {
  return request({
    url: 'work-item',
    method: 'get',
    params: { org: orgId, group: groupId, ...params }
  })
}

// 工作台摘要（聚合当前用户在所有项目组成员身份下的条目 + 私人备忘录）
export function workItemMine (orgId, type = null, limit = 5) {
  return request({
    url: 'work-item/mine',
    method: 'get',
    params: { org: orgId, type, limit }
  })
}

// 日历视图数据（仅项目组内，按截止时间）
export function workItemCalendar (orgId, groupId = 0, params = {}) {
  return request({
    url: 'work-item/calendar',
    method: 'get',
    params: { org: orgId, group: groupId, ...params }
  })
}

// 详情
export function workItemProfile (orgId, id) {
  return request({
    url: `work-item/${id}`,
    method: 'get',
    params: { org: orgId }
  })
}

// 创建。groupId 为项目组 ID（私人备忘录传 0）。
export function workItemCreate (orgId, groupId = 0, form) {
  return request({
    url: 'work-item',
    method: 'post',
    data: { org: orgId, group: groupId, ...form }
  })
}

// 更新
export function workItemUpdate (orgId, id, form) {
  return request({
    url: `work-item/${id}`,
    method: 'put',
    data: { org: orgId, ...form }
  })
}

// 删除
export function workItemDelete (orgId, id, extra = {}) {
  return request({
    url: `work-item/${id}`,
    method: 'delete',
    data: { org: orgId, ...extra }
  })
}
