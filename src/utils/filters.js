import moment from 'moment'
// import DefaultOrgLogo from '@/assets/img/default-logo.svg'
// eslint-disable-next-line
import DefaultOrgLogo from '@/assets/img/default-avatar.png'
// eslint-disable-next-line
import DefaultUserAvatar from '@/assets/img/default-avatar.png'
import { storageRegExp } from '@/settings'

/**
 * 日期格式化
 * @param {Number} timestamp 时间戳
 * @param {String} format 格式
 */
export function formatDate (timestamp, format = null, empty = '暂无记录') {
  if (timestamp === 0) {
    return empty
  }
  return moment.unix(timestamp).format(format || 'YYYY-MM-DD HH:mm:ss')
}

export function formatDateStr (dateStr, format = 'YYYY-MM-DD HH:mm:ss') {
  return moment.utc(dateStr).format(format)
}

/**
 * 格式化 k8s 资源容量中的内存数值（如 32789536Ki / 2Gi）
 * 自动换算到尽可能大的二进制单位（Ki/Mi/Gi/Ti/Pi），保留 2 位小数
 * @param {String|Number} value
 * @returns {String}
 */
export function formatK8sMemory (value) {
  if (value === null || value === undefined || value === '') return '-'
  const str = String(value).trim()
  const match = /^([0-9.]+)\s*(Ki|Mi|Gi|Ti|Pi|Ei)?$/i.exec(str)
  if (!match) return value
  const num = parseFloat(match[1])
  const unit = (match[2] || '').toUpperCase()
  // 统一换算到 Ki 为基准（无单位按字节处理）
  const toKi = { '': 1 / 1024, KI: 1, MI: 1024, GI: 1024 ** 2, TI: 1024 ** 3, PI: 1024 ** 4, EI: 1024 ** 5 }
  const ki = num * (toKi[unit] ?? 1)
  const units = ['Ki', 'Mi', 'Gi', 'Ti', 'Pi']
  let idx = 0
  let v = ki
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024
    idx++
  }
  return v.toFixed(2) + units[idx]
}

/**
 * 格式化 k8s CPU 数值（如 12 / 12000m / 432133931n），返回以 Core（核）为单位的字符串。
 * 优先使用大容量单位（核），例如 432133931n -> "0.43 核"，12000m -> "12 核"。
 * @param {String|Number} value
 * @param {Boolean} withUnit 是否带 "核" 单位后缀
 * @returns {String}
 */
export function formatK8sCpu (value, withUnit = true) {
  if (value === null || value === undefined || value === '') return '-'
  const cores = parseK8sCpuToCores(value)
  if (cores === 0) return withUnit ? '0 核' : '0'
  // 使用核作为大容量单位；亚毫核（<0.001 核）降到毫核显示，避免丢失精度
  let str
  if (cores < 0.001) {
    str = (cores * 1000).toFixed(1).replace(/\.0$/, '') + 'm'
  } else {
    const fixed = cores >= 1 ? cores.toFixed(2) : cores.toFixed(3)
    str = fixed.replace(/\.?0+$/, '')
  }
  return withUnit ? str + ' 核' : str
}

/**
 * 将 k8s CPU 数值（如 12 / 12000m / 432133931n）解析为 Core 数值
 * @param {String|Number} value
 * @returns {Number}
 */
export function parseK8sCpuToCores (value) {
  if (value === null || value === undefined || value === '') return 0
  const str = String(value).trim()
  const match = /^([0-9.]+)\s*(n|u|m)?$/i.exec(str)
  if (!match) return 0
  const num = parseFloat(match[1])
  const unit = (match[2] || '').toLowerCase()
  if (unit === 'n') return num / 1e9
  if (unit === 'u') return num / 1e6
  if (unit === 'm') return num / 1000
  return num
}

/**
 * 将 k8s 内存数值（如 32789536Ki / 2Gi / 1024）解析为 Ki 数值
 * @param {String|Number} value
 * @returns {Number}
 */
export function parseK8sMemoryToKi (value) {
  if (value === null || value === undefined || value === '') return 0
  const str = String(value).trim()
  const match = /^([0-9.]+)\s*(Ki|Mi|Gi|Ti|Pi|Ei)?$/i.exec(str)
  if (!match) return 0
  const num = parseFloat(match[1])
  const unit = (match[2] || '').toUpperCase()
  const toKi = { '': 1 / 1024, KI: 1, MI: 1024, GI: 1024 ** 2, TI: 1024 ** 3, PI: 1024 ** 4, EI: 1024 ** 5 }
  return num * (toKi[unit] ?? 1)
}

/**
 * 格式化 k8s ISO8601 UTC 时间（如 2026-07-24T04:47:34Z）为本地友好时间
 * @param {String} dateStr
 * @param {String} format
 * @returns {String}
 */
export function formatK8sDate (dateStr, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!dateStr) return '-'
  return moment(dateStr).format(format)
}

/**
 * 组织LOGO
 * @param {String} logo
 * @param img_size
 * @returns {String}
 */
// 可用的 COS 图片处理样式名（按尺寸就近匹配）
const cropStyles = ['128x128', '180x180', '640x640']
function pickCropStyle (size) {
  const w = parseInt(size, 10) || 64
  for (const s of cropStyles) {
    if (w <= parseInt(s, 10)) return s
  }
  return cropStyles[cropStyles.length - 1]
}

export function orgLogo (logo, imgSize = '32x32') {
  if (logo && storageRegExp.test(logo)) {
    return logo + '/' + pickCropStyle(imgSize)
  }
  return DefaultOrgLogo
}

/**
 * 用户头像
 * @param {String} avatar
 * @param img_size
 * @returns {String}
 */
export function userAvatar (avatar, imgSize = '60x60') {
  if (avatar && storageRegExp.test(avatar)) {
    return avatar + '/' + pickCropStyle(imgSize)
  }
  return DefaultUserAvatar
}

/**
 * 格式化百分比
 * @param {Number} number 数字
 * @param {Number} fixedLength 小数点长度
 */
export function percentage (number, fixedLength = 2) {
  return parseFloat((number * 100).toFixed(fixedLength)) + '%'
}

/**
 * 差异格式化百分数
 * @param {Number} number 数字
 * @param {String} roundFunc 近似值函数，round|floor|ceil
 * @param {String} suffix 后缀
 * @param {Number} fixedLength 小数点位数
 */
export function diffentPercentage (number, roundFunc = 'round', suffix = undefined, fixedLength = 2) {
  const num = Math[roundFunc]((number * Math.pow(10, fixedLength + 2))) / Math.pow(10, fixedLength)
  return suffix ? num + suffix : num
}

/**
 * 格式化字节
 * @param {Number} size 字节大小
 * @param {Number} fixedLength 小数点个数
 * @param {Array} 单位
 */
export function formatBytes (size, fixedLength = 2, units = null) {
  if (units === null) {
    units = ['B', 'K', 'M', 'G', 'T']
  }
  let index = 0

  if (!size && size !== 0) {
    return '-' + units[index]
  }

  let sign = 1
  if (size < 0) {
    size *= -1
    sign *= -1
  }

  while (size >= 1024) {
    size /= 1024
    index++
  }

  return parseFloat(size.toFixed(fixedLength)) * sign + units[index]
}

/**
 * 移除邮箱后缀
 * @param {String} email 邮箱
 */
export function removeEmailSuffix (email) {
  return email.split('@', 1).join('')
}

/**
 * 字符串默认值
 * @param {String} value
 */
export function defaultZero (value, defaultValue = '0') {
  return value == null ? defaultValue : value
}

/**
 * 字符串替换
 * @param {String} value 字符串
 * @param {String} string 原值
 * @param {String} replacement 替换值
 */
export function strReplace (value, xstring, replacement) {
  return value.replace(xstring, replacement)
}

/**
 * 格式化数字（千位符）
 * @param  {Number} number        [number：要格式化的数字]
 * @param  {Number} decimals      [decimals：保留几位小数]
 * @param  {String} decPoint      [decPoint]
 * @param  {String} thousandsSep  [thousandsSep：千分位符号]
 * @param  {String} roundtag      [roundtag:舍入参数，默认 "ceil" 向上取,"floor"向下取,"round" 四舍五入]
 * @return {String}               [description]
 *
 */
export function formatNumber (number, decimals = 0, decPoint = '.', thousandsSep = ',', roundtag = 'round') {
  if (!number && number !== 0 && number !== '0') {
    return '-'
  }

  number = (number + '').replace(/[^0-9+-Ee.]/g, '')

  const n = !isFinite(+number) ? 0 : +number
  const prec = !isFinite(+decimals) ? 0 : Math.abs(decimals)
  const toFixedFix = function (nParams, precParams) {
    const k = Math.pow(10, precParams)

    return '' + parseFloat(Math[roundtag](parseFloat((nParams * k).toFixed(precParams * 2))).toFixed(precParams * 2)) / k
  }

  const s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.')

  const re = /(-?\d+)(\d{3})/
  while (re.test(s[0])) {
    s[0] = s[0].replace(re, '$1' + thousandsSep + '$2')
  }

  if ((s[1] || '').length < prec) {
    s[1] = s[1] || ''
  }
  return s[1] === '' ? s[0] : s.join(decPoint)
}

/**
 * 关键词高亮
 * @param {String} content 内容
 * @param {Array} keywords 关键词列表，支持多个关键词
 * @param {Boolean} ignoreCase 是否忽略大小写
 * @param {String} pregTag 替换的前置tag
 * @param {String} closeTag 替换的闭合tag
 */
export function keywordHighlight (content, keywords = [], ignoreCase = true, pregTag = '<em class="highlight">', closeTag = '</em>') {
  if (keywords.length === 0) {
    return content
  }
  const reg = new RegExp(`(${keywords.join('|')})`, ignoreCase ? 'ig' : 'g')
  return content.replace(reg, pregTag + '$1' + closeTag)
}

/**
 * entrypoint格式化
 * @param {String} entrypoint 原生entrypoint命令
 * @return {String}
 */
export function formatEntrypoint (entrypoint) {
  const formats = []
  entrypoint.split(/\n+/).forEach(part => {
    if (part.indexOf(' ') > -1) {
      if (part.indexOf('"') == -1) {
        formats.push(`"${part}"`)
      } else if (part.indexOf("'") == -1) {
        formats.push(`'${part}'`)
      } else {
        formats.push(`"${part.replace(/"/g, '\\"')}"`)
      }
    } else {
      formats.push(part)
    }
  })

  return formats.join(' ')
}

export function parseRedisUri (redis_db) {
  // 哨兵集群
  if (redis_db.sentinel) {
    return redis_db.db_name + ':16379'
  } else {
    return redis_db.db_name + '-master:6379'
  }
}

export const timeRangePickerOptions = {
  shortcuts: [{
    text: '15分钟内',
    onClick (picker) {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - (60 * 15 * 1000))
      picker.$emit('pick', [start, end])
    }
  }, {
    text: '半小时内',
    onClick (picker) {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - (60 * 30 * 1000))
      picker.$emit('pick', [start, end])
    }
  }, {
    text: '1小时内',
    onClick (picker) {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000)
      picker.$emit('pick', [start, end])
    }
  }, {
    text: '3小时内',
    onClick (picker) {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 3 * 1000)
      picker.$emit('pick', [start, end])
    }
  }, {
    text: '12小时内',
    onClick (picker) {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 12 * 1000)
      picker.$emit('pick', [start, end])
    }
  }, {
    text: '1天内',
    onClick (picker) {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 86400 * 1000)
      picker.$emit('pick', [start, end])
    }
  }, {
    text: '2天内',
    onClick (picker) {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 86400 * 2 * 1000)
      picker.$emit('pick', [start, end])
    }
  }, {
    text: '3天内',
    onClick (picker) {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 86400 * 3 * 1000)
      picker.$emit('pick', [start, end])
    }
  }, {
    text: '7天内',
    onClick (picker) {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 86400 * 7 * 1000)
      picker.$emit('pick', [start, end])
    }
  }]
}
