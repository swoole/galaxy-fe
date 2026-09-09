/**
 * 应用市场模板类型.
 */
export const APP_MARKET_TYPE_SERVICE = 1 // 中间件（MySQL、Redis等）
export const APP_MARKET_TYPE_APP = 2 // 应用（Web 等需编码的服务）
export const APP_MARKET_TYPE_FRAMEWORK = 3 // 框架（Spring Boot、Vue 等）
export const APP_MARKET_TYPE_CLOUD_NATIVE = 4 // 云原生
export const APP_MARKET_TYPE_OTHER = 9

export const APP_MARKET_TYPES = {
  [APP_MARKET_TYPE_SERVICE]: { label: '中间件' },
  [APP_MARKET_TYPE_APP]: { label: '应用' },
  [APP_MARKET_TYPE_FRAMEWORK]: { label: '框架' },
  [APP_MARKET_TYPE_CLOUD_NATIVE]: { label: '云原生' },
  [APP_MARKET_TYPE_OTHER]: { label: '其他' }
}
