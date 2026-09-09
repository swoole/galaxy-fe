import request from '@/utils/request'

// 身份校验状态
export function actIdauthStatus () {
  return request({
    url: 'account/idauth/status',
    method: 'get'
  })
}

// 密码身份校验
export function actIdauthPassword (password, captchaid, captcha) {
  return request({
    url: 'account/idauth/password',
    method: 'post',
    data: { password, captchaid, captcha }
  })
}

// 发送邮件验证码
export function actEmailcodeSend (captchaid, captcha) {
  return request({
    url: 'account/emailcode/send',
    method: 'post',
    data: { captchaid, captcha }
  })
}

// 邮件验证码身份校验
export function actIdauthEmailcode (emailcode) {
  return request({
    url: 'account/idauth/emailcode',
    method: 'post',
    data: { emailcode }
  })
}

// 发送新邮件验证码
export function actNewemailcodeSend (email) {
  return request({
    url: 'account/newemailcode/send',
    method: 'post',
    data: { email }
  })
}

// 新邮箱验证码校验
export function actIdauthNewemailcode (email, emailcode) {
  return request({
    url: 'account/idauth/newemailcode',
    method: 'post',
    data: { email, emailcode }
  })
}

// 设置密码
export function actResetPassword (password, passwordRetry) {
  return request({
    url: 'account/resetpassword',
    method: 'post',
    data: { password, password_retry: passwordRetry }
  })
}

// Git授权列表
export function actGitAuths () {
  return request({
    url: 'account/gitauth',
    method: 'get',
    params: { }
  })
}

// 创建Git授权
export function actCreateGitAuth (vendor, domain, token) {
  return request({
    url: 'account/gitauth',
    method: 'post',
    data: { vendor, domain, token }
  })
}

// 更新Git授权
export function actUpdateGitAuth (vendor, domain, token) {
  return request({
    url: 'account/gitauth',
    method: 'put',
    data: { vendor, domain, token }
  })
}

// 删除Git授权
export function actRemoveGitAuth (vendor, domain) {
  return request({
    url: 'account/gitauth',
    method: 'delete',
    data: { vendor, domain }
  })
}

// 检查Git授权
export function actCheckGitRepoAuth (repo, vendor) {
  return request({
    url: 'account/checkgitrepoauth',
    method: 'post',
    data: { repo, vendor }
  })
}

// 身份验证
export function actIdConfirm (password) {
  return request({
    url: 'account/idconfirm',
    method: 'post',
    data: { password }
  })
}
