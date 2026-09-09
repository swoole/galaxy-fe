import request from '@/utils/request'

// 帐号密码登录
export function login (account, password, captcha, registerKey = null) {
  return request({
    url: 'login',
    method: 'post',
    data: { account, password, captcha, register_key: registerKey }
  })
}

// 获取图形验证码
export function getCaptcha () {
  return request({
    url: 'captcha',
    method: 'get'
  })
}

// 获取本地滑动验证码挑战
export function getSliderCaptcha () {
  return request({
    url: 'captcha/slider',
    method: 'get'
  })
}

// 校验滑动轨迹并换取一次性令牌
export function verifySliderCaptcha (data) {
  return request({
    url: 'captcha/slider/verify',
    method: 'post',
    data
  })
}

// 注册
export function register (email, emailcode, password, passwordRetry, nickname) {
  return request({
    url: 'register',
    method: 'post',
    data: { email, emailcode, password, password_retry: passwordRetry, nickname }
  })
}

// 发送注册邮件验证码（需要先完成一次滑动验证）
export function sendRegisterEmailCode (email, captcha) {
  return request({
    url: 'register/emailcode/send',
    method: 'post',
    data: { email, captcha }
  })
}

// 忘记密码
export function forgetPassword (account, password, passwordRetry, smscode) {
  return request({
    url: 'forgetpassword',
    method: 'post',
    data: { account, password, password_retry: passwordRetry, smscode }
  })
}

// 获取邮箱验证码
export function sendCode (account, captcha, action) {
  return request({
    url: 'login/code/send',
    method: 'post',
    data: { account, captcha, action }
  })
}

// 第三方平台支持列表
export function thirdpartySupports () {
  return request({
    url: 'login/thirdparty/support',
    method: 'get'
  })
}

// 第三方登录
export function loginThirdparty (channel, token, ext = {}) {
  return request({
    url: 'login/thirdparty',
    method: 'post',
    data: { channel, token, ...ext }
  })
}

// 退出登录
export function logout () {
  return request({
    url: 'logout',
    method: 'post'
  })
}
