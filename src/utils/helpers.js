import { formatDate, formatBytes } from '@/utils/filters'

/**
 * 将字符串格式化为数字
 * @param {String} str 要格式化的数字
 * @param {Number|null} defaultVal 默认值
 * @return {Number}
 */
export function formatNumber (str, defaultVal = 0) {
  const num = Number(str)

  return isNaN(num) ? defaultVal : num
}

/**
 * 格式化数组中的数字
 * @param {Array} array 要格式化的数组
 * @param {Array} keys 要格式化的keys
 */
export function formatInArrayNumber (target = [], keys = []) {
  return target.map(row => {
    keys.forEach(key => {
      row[key] = formatNumber(row[key])
    })

    return row
  })
}

/**
 * 格式化对象中的数字
 * @param {Object} object 要格式化的对象
 * @param {Array} keys 要格式化的keys
 */
export function formatInObjectNumber (object = {}, keys = []) {
  for (const key in object) {
    if (keys.indexOf(key) > -1) {
      object[key] = formatNumber(object[key])
    }
  }

  return object
}

/**
 * 延迟执行回调
 * @param {Function} func 回调函数
 * @param {Number} wait 延迟时间
 * @param {Boolean} immediately 是否立即调用
 */
export function debounce (func, wait, immediately) {
  let timer
  const debounced = function (...args) {
    let result
    if (timer) clearTimeout(timer)
    if (immediately) {
      const called = !timer
      timer = setTimeout(() => {
        timer = null
      }, wait)
      if (called) {
        result = func.apply(this, args)
      }
    } else {
      timer = setTimeout(() => {
        func.apply(this, args)
      }, wait)
    }
    return result
  }
  debounced.cancel = function () {
    clearTimeout(timer)
    timer = null
  }
  return debounced
}

/**
 * 格式化时间筛选
 * @param {Array} timerange
 * @param {Object} params
 */
export function formatTimerange (timerange, params) {
  if (timerange && timerange[0]) {
    params['timerange[begin]'] = parseInt(timerange[0] / 1000)
  }
  if (timerange && timerange[1]) {
    params['timerange[end]'] = parseInt(timerange[1] / 1000)
  }
}

/**
 * 格式化时间差
 * @param {Number} diff 时间差值，例如1234
 * @param {Number} length 描述长度，例如2，返回2分34秒
 * @returns {String} 描述，例如2分34秒
 */
export function formatTimeDiff (diff, length = 2) {
  if (diff == 0) {
    return '-'
  }

  const map = [
    { sec: 31536000, note: '年' },
    { sec: 2592000, note: '月' },
    { sec: 86400, note: '天' },
    { sec: 3600, note: '小时' },
    { sec: 60, note: '分' },
    { sec: 1, note: '秒' }
  ]

  let note = ''
  for (const item of map) {
    if (diff >= item.sec) {
      length--
      note += `${Math.floor(diff / item.sec)}${item.note}`
      diff = diff % item.sec
      if (length == 0) {
        break
      }
    }
  }

  return note
}

/**
 * 格式化与当前时间差
 * @param {Number} timestamp 要计算的时间，例如1637307189
 * @param {Number} length 描述长度，例如2，返回2分34秒
 * @returns {String} 描述，例如2分34秒
 */
export function formatTimeDiffNow (timestamp, length = 2) {
  const diff = parseInt(Date.now() / 1000) - timestamp
  return formatTimeDiff(diff, length)
}

/**
 * 项目市场获取版本差异化参数
 */
export function getVersionParams (params, version, key, defaults = null) {
  if (params['versions'] && params['versions'][version] && typeof params['versions'][version][key] != 'undefined') {
    return params['versions'][version][key]
  }

  if (typeof params[key] != 'undefined') {
    return params[key]
  }

  return defaults
}

export function buildUrlQuery (params) {
  let url = ''
  for (const k in params) {
    const value = typeof params['k'] == 'number' ? params['k'].toString() : encodeURI(params[k])
    url += k + '=' + value + '&'
  }
  if (url.endsWith('&')) {
    return url.substr(0, url.length - 1)
  }
  return url
}

export function formatMetricData (metricItems, res) {
  const metricData = {}
  const step = res.data.step
  metricItems.forEach(item => {
    const chartData = {}
    const name = item.name

    chartData.keys = item.filters
    if (item.legends) {
      chartData.legends = item.legends
    }
    chartData.data = {}
    chartData.labels = []
    chartData.title = item.title

    if (item.type === 'bytes' || item.type === 'bit') {
      chartData.valueFormatter = function (value, index) {
        return formatBytes(value, 0)
      }
    }

    item.filters.forEach(key => {
      if (!res.data.metrics[key][0]) {
        return
      }
      chartData.data[key] = []

      if (chartData.labels.length === 0) {
        res.data.metrics[key][0].values.forEach(values => {
          if (step === 300) {
            chartData.labels.push(formatDate(values[0], 'MM-DD HH:mm'))
          } else if (step === 60) {
            chartData.labels.push(formatDate(values[0], 'HH:mm'))
          } else {
            chartData.labels.push(formatDate(values[0], 'HH:mm:ss'))
          }
        })
      }

      res.data.metrics[key][0].values.forEach(values => {
        let value = values[1]
        if (item.type === 'cpu') {
          value = Math.round(value * 1000)
        } else if (item.type === 'bit') {
          value = Math.round(value * 8)
        } else if (item.type === 'count') {
          value = parseFloat(value).toFixed(2)
        } else if (item.type === 'percent') {
          value = (parseFloat(value) * 100).toFixed(2)
        } else if (item.type === 'bytes') {
          value = Math.round(value)
        }
        chartData.data[key].push(value)
      })
    })
    metricData[name] = chartData
  })
  return metricData
}

/**
 * 对象Copy.
 * @param {Object} obj 原始对象
 * @param {Boolean} forceObject 是否强制转为Object
 * @return {Object}
 */
export function objectCopy (obj, forceObject = false) {
  if (forceObject) {
    if (Array.isArray(obj)) {
      if (obj.length == 0) {
        obj = {}
      } else {
        obj = obj[0]
      }
    }
  }
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 对象、数组遍历.
 * @param {Object|Array} obj 对象或者数组
 * @param {Function(key, value)} 回调函数
 */
export function objForeach (obj, fn) {
  if (Array.isArray(obj)) {
    obj.forEach((value, index) => fn(index, value))
  } else {
    Object.keys(obj).forEach(key => {
      fn(key, obj[key])
    })
  }
}

/**
 * 下载Blob文件.
 */
export function downloadBlob (res, filename) {
  const blob = new Blob([res], { type: res.type })
  const dom = document.createElement('a')
  const url = window.URL.createObjectURL(blob)
  dom.href = url
  dom.download = decodeURI(filename)
  dom.style.display = 'none'
  document.body.appendChild(dom)
  dom.click()
  dom.parentNode.removeChild(dom)
  window.URL.revokeObjectURL(url)
}

/**
 * 从对象中获取整数参数.
 */
export function getIntegerInObject (obj, key) {
  if (obj[key] === undefined) {
    return null
  }

  const num = parseInt(obj[key])

  return isNaN(num) ? null : num
}

/**
 * 根据路由计算面包屑导航.
 * @param {Vue} vm
 * @return {Array}
 */
export function routeBreadcrumb (vm) {
  const breadcrumb = []
  let route = vm.$route.matched.length > 0 ? vm.$route.matched[vm.$route.matched.length - 1] : {}
  while (route.parent) {
    route = route.parent
    // 设置了 breadcrumbIgnore 或者没有设置title、path、name的不加入面包屑导航
    if (!(route.meta.breadcrumbIgnore || !route.meta.title || !route.path || !route.name)) {
      breadcrumb.unshift({ title: route.meta.title, to: { name: route.name } })
    }

    // 匹配meta中配置的breadcrumbAfter前置路由
    if (route.meta.breadcrumbBefore) {
      let index = route.meta.breadcrumbBefore.length
      while (--index >= 0) {
        const breadcrumbItem = routeBreadcrumbFind(vm, route.meta.breadcrumbBefore[index])
        if (breadcrumbItem) {
          breadcrumb.unshift(breadcrumbItem)
        }
      }
    }

    // 匹配meta中配置的breadcrumbAfter后置路由
    if (route.meta.breadcrumbAfter) {
      route.meta.breadcrumbAfter.forEach(rb => {
        const breadcrumbItem = routeBreadcrumbFind(vm, rb)
        if (breadcrumbItem) {
          breadcrumb.push(breadcrumbItem)
        }
      })
    }
  }

  return breadcrumb
}

/**
 * 根据路由名称查询获得面包屑导航配置.
 * @param {Vue} vm
 * @param {Object} to { name: RouterName } or { path: Path }
 * @return {Object|null}
 */
export function routeBreadcrumbFind (vm, to, params = {}, query = {}) {
  for (const route of vm.$router.match(to).matched) {
    if ((to.name && to.name == route.name) || (to.path && to.path == route.path)) {
      return { title: route.meta.title, to: { name: route.name, params, query } }
    }
  }

  return null
}

export function shortId (value, length = 12) {
  if (!value) return '-'
  return String(value).slice(0, length)
}

/**
 * Docker/Swarm may resolve a tagged image to "name:tag@sha256:...".
 * Keep the immutable digest in the data model, but hide it in compact UI labels.
 */
export function imageTag (value) {
  if (!value) return '-'
  const image = String(value)
  const digestIndex = image.indexOf('@sha256:')
  return digestIndex > 0 ? image.slice(0, digestIndex) : image
}

export function formatDateTime (value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}
