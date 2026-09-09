import request from '@/utils/request'

// 预授权
export function preAuthorize (clientId, responseType, redirectUri, state) {
  return request({
    url: 'oauth2/preauthorize',
    method: 'get',
    params: {
      client_id: clientId,
      response_type: responseType,
      redirect_uri: redirectUri,
      state
    }
  })
}

// 申请授权
export function authorize (clientId, responseType, redirectUri, state, scope) {
  return request({
    url: 'oauth2/authorize',
    method: 'get',
    params: {
      client_id: clientId,
      response_type: responseType,
      redirect_uri: redirectUri,
      state,
      scope,
      accept: 'json'
    }
  })
}
