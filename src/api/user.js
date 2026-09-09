import request from '@/utils/request'
import { formatTimerange } from '@/utils/helpers'

// 用户信息详情
export function userProfile () {
  return request({
    url: 'user/profile',
    method: 'get'
  })
}

// 用户简要信息
export function userSimpleProfile () {
  return request({
    url: 'user/simpleprofile',
    method: 'get'
  })
}

// 用户信息更新
export function userProfileUpdate (data) {
  return request({
    url: 'user/profile',
    method: 'put',
    data
  })
}

export function userSshkey () {
  return request({ url: 'user/sshkey', method: 'get' })
}

export function userSshkeyReset (algo, confirmToken) {
  return request({
    url: 'user/sshkey/reset',
    method: 'post',
    data: { algo, confirm_token: confirmToken }
  })
}

// 私人公钥列表
export function userPersonalSshkeys () {
  return request({
    url: 'user/personal/sshkeys',
    method: 'get',
    params: {}
  })
}

// 创建私人公钥
export function userPersonalSshkeyCreate (
  pubkey,
  remark = null
) {
  return request({
    url: 'user/personal/sshkey',
    method: 'post',
    data: {
      pubkey,
      remark
    }
  })
}

// 删除私人公钥
export function userPersonalSshkeyDelete (
  keyid
) {
  return request({
    url: 'user/personal/sshkey',
    method: 'delete',
    data: {
      keyid
    }
  })
}

// 私人公钥详情
export function userPersonalSshkeyProfile (
  keyid
) {
  return request({
    url: 'user/personal/sshkey',
    method: 'get',
    params: {
      keyid
    }
  })
}

// 身份认证状态
export function userIdAuthStatus () {
  return request({
    url: 'user/idauth/status',
    method: 'get',
    params: { }
  })
}

// 通知渠道
export function notifyChannels () {
  return request({
    url: 'notify/channels',
    method: 'get',
    params: { }
  })
}

// mp二维码
export function notifyOfficialAccountQrcode () {
  return request({
    url: 'notify/officialaccountqrcode',
    method: 'get',
    params: { }
  })
}

// mp绑定状态
export function notifyOfficialAccountStatus () {
  return request({
    url: 'notify/officialaccountstatus',
    method: 'get',
    params: { }
  })
}

// 解绑通知渠道
export function notifyUnbind (channel) {
  return request({
    url: 'notify/unbind',
    method: 'post',
    data: { channel }
  })
}

// 通知列表
export function notifys (timerange, scene = null, page = 1, pageSize = 20) {
  const params = { scene, page, pagesize: pageSize }
  formatTimerange(timerange, params)

  return request({
    url: 'notify',
    method: 'get',
    params
  })
}

// 简单列表
export function notifySimple () {
  return request({
    url: 'notify/simple',
    method: 'get',
    params: {}
  })
}

// 通知详情
export function notifyProfile (notifyId) {
  return request({
    url: 'notify/profile',
    method: 'get',
    params: { notify_id: notifyId }
  })
}

// 下一条消息
export function notifyNext (current) {
  return request({
    url: 'notify/next',
    method: 'get',
    params: { current_notify_id: current }
  })
}

// 上一条消息
export function notifyPrev (current) {
  return request({
    url: 'notify/prev',
    method: 'get',
    params: { current_notify_id: current }
  })
}

// 标为已读
export function notifySetRead (ids) {
  return request({
    url: 'notify/setread',
    method: 'post',
    data: { notify_ids: ids }
  })
}

// 全部标为已读
export function notifySetReadAll () {
  return request({
    url: 'notify/setreadall',
    method: 'post',
    data: { }
  })
}

// 删除消息
export function notifyDelete (ids) {
  return request({
    url: 'notify',
    method: 'delete',
    data: { notify_ids: ids }
  })
}

// 监听消息
export function notifyListen (begin = null) {
  return request({
    url: 'notify/listen',
    method: 'get',
    params: { begin }
  })
}

// 登录日志
export function userLoginHistory (page = 1, pageSize = 20) {
  return request({
    url: 'user/login/history',
    method: 'get',
    params: { page, pagesize: pageSize }
  })
}
