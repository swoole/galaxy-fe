module.exports = {

  title: 'CodeGalaxy',
  slogan: '一站式云原生研发管理平台，立即搭建云原生研发体系',
  storagePrefix: 'galaxy.',
  // 存储服务域名正则，匹配之后才使用增加缩略图功能
  storageRegExp: /(?:.cos.[^.]+.myqcloud.com|.file.myqcloud.com|.aliyuncs.com|amazonaws.com)/,

  manual: 'https://docs.code-galaxy.net',

  officialWebsite: 'https://code-galaxy.net',

  // 重定向外域可信域名
  trustedDomains: (process.env.VUE_APP_TRUSTED_DOMAINS || '*.code-galaxy.net').split(','),

  // 设置跨域cookie的域名
  cookieDomain: process.env.VUE_APP_COOKIE_DOMAIN || '*.code-galaxy.net'
}
