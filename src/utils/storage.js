import { storagePrefix, cookieDomain } from '@/settings'
import Cookies from 'js-cookie'

/**
 * 存储统一封装
 */
export const Storage = {
  /**
   * 设置一个存储
   * @param {String} key 键名
   * @param {String} value 值
   */
  set (key, value) {
    return localStorage.setItem(storagePrefix + key, value)
  },

  /**
   * 获取一个存储
   * @param {String} key 键名
   * @param {*} defaults 默认值
   * @returns {String|Null} 值或者不存在为null或默认值
   */
  get (key, defaults = null) {
    return localStorage.getItem(storagePrefix + key) || defaults
  },

  /**
   * 移除一个存储
   * @param {String} key 键名
   */
  remove (key) {
    return localStorage.removeItem(storagePrefix + key)
  },

  /**
   * 设置一个对象存储
   * @param {String} key 键名
   * @param {Object} value 对象
   */
  setObj (key, value) {
    return localStorage.setItem(storagePrefix + key, JSON.stringify(value))
  },

  /**
   * 获取一个对象存储
   * @param {String} key 键名
   * @param {*} defaults 默认值
   * @returns {Object|Null} 值或者不存在为null或默认值
   */
  getObj (key, defaults = null) {
    const value = localStorage.getItem(storagePrefix + key)
    if (value === null || value == 'null') {
      return defaults
    }

    // JSON.parse进行异常捕获
    try {
      const obj = JSON.parse(value)
      if (obj === null) {
        return defaults
      }
      return obj
    } catch (e) {
      console.error(e)
      return defaults
    }
  }
}

/**
 * 键名统一封装
 */
export const StorageKeys = {
  jwtToken: 'jwt-token', // JWT token
  user: 'user', // 用户信息
  lastOrg: 'last-org', // 上次使用组织
  loginRedirect: 'login-redirect', // 登录跳转
  recentsSearch: 'recents-search' // 最近搜索结果
}

export function cookieSetUser (user) {
  Cookies.set(storagePrefix + StorageKeys.user, JSON.stringify({
    uid: user.id,
    email: user.email,
    nickname: user.nickname
  }), { domain: cookieDomain, expires: 7 })
}

export function cookieRemoveUser () {
  Cookies.remove(storagePrefix + StorageKeys.user)
}
