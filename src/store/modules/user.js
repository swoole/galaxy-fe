import { login, register } from '@/api/auth'
import { userSimpleProfile } from '@/api/user'
import { orgSimpleProfile } from '@/api/org'
import { Storage, StorageKeys, cookieSetUser, cookieRemoveUser } from '@/utils/storage'

const userState = {
  token: Storage.get(StorageKeys.jwtToken),
  user: Storage.getObj(StorageKeys.user, {}),
  lastOrg: Storage.getObj(StorageKeys.lastOrg, {}),
  recentsSearch: Storage.getObj(StorageKeys.recentsSearch, [])
}

const mutations = {
  SET_TOKEN: (state, token) => {
    state.token = token
  },
  SET_USER: (state, user) => {
    state.user = user
  },
  SET_LAST_ORG: (state, lastOrg) => {
    state.lastOrg = lastOrg || {}
  },
  SET_RECENTS_SEARCH: (state, recents) => {
    state.recentsSearch = recents || []
  }
}

const actions = {
  // 帐号密码登录
  login ({ commit }, params) {
    return new Promise((resolve, reject) => {
      login(params.account, params.password, params.captcha)
        .then(res => {
          commit('SET_USER', res.data.profile)
          commit('SET_LAST_ORG', res.data.last_org)
          Storage.setObj(StorageKeys.user, res.data.profile)
          Storage.setObj(StorageKeys.lastOrg, res.data.last_org)
          cookieSetUser(res.data.profile)
          resolve(res)
        }).catch(err => {
          reject(err)
        })
    })
  },
  // 注册帐号
  register ({ commit }, params) {
    return new Promise((resolve, reject) => {
      register(params.email, params.emailcode, params.password, params.password_retry, params.nickname)
        .then(res => {
          commit('SET_USER', res.data.profile)
          commit('SET_LAST_ORG', res.data.last_org)
          Storage.setObj(StorageKeys.user, res.data.profile)
          Storage.setObj(StorageKeys.lastOrg, res.data.last_org)
          cookieSetUser(res.data.profile)
          resolve()
        }).catch(err => {
          reject(err)
        })
    })
  },
  // 退出登录
  logout ({ commit }) {
    // TODO 不安全退出，因死循环以后优化
    // return new Promise((resolve, reject) => {
    //   logout().then(res => {
    commit('SET_TOKEN', '')
    commit('SET_USER', {})
    commit('SET_LAST_ORG', {})
    Storage.remove(StorageKeys.jwtToken)
    Storage.remove(StorageKeys.user)
    Storage.remove(StorageKeys.lastOrg)
    cookieRemoveUser()
    // resetRouter()
    //   resolve()
    // }).catch(err => {
    //   commit('SET_TOKEN', '')
    //   commit('SET_USER', {})
    //   commit('SET_LAST_ORG', {})
    //   Storage.remove(StorageKeys.jwtToken)
    //   Storage.remove(StorageKeys.user)
    //   Storage.remove(StorageKeys.lastOrg)
    //   resetRouter()
    //   reject(err)
    // })
  // })
  },
  // 设置jwt token
  setToken ({ commit }, { token }) {
    commit('SET_TOKEN', token)
    Storage.set(StorageKeys.jwtToken, token)
  },
  // 切换组织
  changeOrg ({ commit }, org) {
    commit('SET_LAST_ORG', org)
    Storage.setObj(StorageKeys.lastOrg, org)
  },
  // 更新用户信息
  updateUserProfile ({ commit }, user) {
    commit('SET_USER', user)
    Storage.setObj(StorageKeys.user, user)
    cookieSetUser(user)
  },
  // 拉取用户信息更新本地用户信息
  userProfile ({ commit }) {
    return new Promise((resolve, reject) => {
      userSimpleProfile()
        .then(res => {
          const user = {
            id: Number(res.data.user.id),
            email: res.data.user.email,
            nickname: res.data.user.nickname,
            avatar: res.data.user.avatar,
            auth_status: res.data.user.auth_status,
            username: res.data.user.username,
            phone: res.data.user.phone
          }
          commit('SET_USER', user)
          Storage.setObj(StorageKeys.user, user)
          cookieSetUser(user)
          // commit('SET_LAST_ORG', res.data.last_org)
          // Storage.setObj(StorageKeys.lastOrg, res.data.last_org)
          resolve()
        }).catch(err => {
          reject(err)
        })
    })
  },
  // 拉取组织信息更新本地组织信息
  orgProfile ({ commit }, orgId) {
    return new Promise((resolve, reject) => {
      orgSimpleProfile(orgId)
        .then(res => {
          commit('SET_LAST_ORG', res.data.org)
          Storage.setObj(StorageKeys.lastOrg, res.data.org)
          resolve()
        }).catch(err => {
          reject(err)
        })
    })
  },
  // 设置最近搜索项
  setRecentsSearch ({ commit }, { recents }) {
    recents = recents.slice(0, 10)
    commit('SET_RECENTS_SEARCH', recents)
    Storage.setObj(StorageKeys.recentsSearch, recents)
  }
}

export default {
  namespaced: true,
  state: userState,
  mutations,
  actions
}
