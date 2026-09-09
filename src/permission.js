import router from './router'
import store from './store'
// import { Message } from 'element-ui'
// import { Loading } from 'element-ui'
import NProgress from 'nprogress' // progress bar
import 'nprogress/nprogress.css' // progress bar style
import { Storage, StorageKeys } from '@/utils/storage' // get token from cookie
import getPageTitle from '@/utils/get-page-title'
// import {
//   TP_WECHAT
// } from '@/consts/user'

NProgress.configure({ showSpinner: false }) // NProgress Configuration

const whiteList = [
  '/forgetpassword'
] // no redirect whitelist
const noAuthList = [
  '/login',
  '/thirdparty',
  '/thirdparty/bindaccount',
  '/register',
  '/privacypolicy',
  '/servicecontract'
]

router.beforeEach(async (to, from, next) => {
  // start progress bar
  NProgress.start()
  // set page title
  document.title = getPageTitle(to.meta.title)

  next()

  // 因对全局URL跳转存在异步bug，停止使用该方法，转向使用跳转到固定页面实现第三方登录
  // // 针对URL跳转类型做拦截登录
  // if (to.query.token && to.query.channel) {
  //   const loading = Loading.service()
  //   const ext = {}
  //   if (to.query.channel == TP_WECHAT) {
  //     ext['openid'] = to.query.openid
  //   }
  //   await store.dispatch('user/loginThirdparty', {
  //     token: to.query.token,
  //     channel: Number(to.query.channel),
  //     ext
  //   }).then(res => {
  //     if (to.query.redirect) {
  //       next(decodeURIComponent(this.$route.query.redirect))
  //     } else if (Storage.get(StorageKeys.jwtToken)) {
  //       next({ path: '/user/account' })
  //     } else {
  //       next({ name: 'Home' })
  //     }
  //   }).finally(() => {
  //     loading.close()
  //   })
  //   next(false)
  // }

  if (noAuthList.indexOf(to.path) > -1) {
    next()
  } else if (Storage.get(StorageKeys.jwtToken)) {
    if (whiteList.indexOf(to.path) > -1) {
      // if is logged in, redirect to the home page
      next({ name: 'Home' })
      NProgress.done()
    }

    // 没有组织重定向到用户组织页
    if (to.name == 'Project') {
      if (!store.state.user.lastOrg.id) {
        next({ name: 'UserMyOrg' })
        NProgress.done()
      }
    }
    // TODO 拉取用户信息
    // else {
    //   const userInfo = store.getters.user
    //   if (userInfo && userInfo.uid) {
    //     next()
    //   } else {
    //     try {
    //       // get user info
    //       await store.dispatch('user/profile')

    //       next()
    //     } catch (err) {
    //       console.log('err: ', err)
    //       // remove token and go to login page to re-login
    //       await store.dispatch('user/logout')
    //       Message.error(err || 'Has Error')
    //       next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    //       NProgress.done()
    //     }
    //   }
    // }
  } else {
    /* has no token */

    if (whiteList.indexOf(to.path) !== -1) {
      // in the free login whitelist, go directly
      next()
    } else {
      await store.dispatch('user/logout')
      next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
      NProgress.done()
    }
  }
})

router.afterEach(() => {
  // finish progress bar
  NProgress.done()
})
