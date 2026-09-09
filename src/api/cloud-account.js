import request from '@/utils/request'

export function cloudAccounts (orgId) {
  return request({ url: 'resources/cloud-accounts', method: 'get', params: { org: orgId } })
}

export function cloudAccountCreate (orgId, form) {
  return request({ url: 'resources/cloud-accounts', method: 'post', data: { org: orgId, ...form } })
}

export function cloudAccountDelete (orgId, cloudAccountId) {
  return request({ url: 'resources/cloud-accounts', method: 'delete', data: { org: orgId, cloud_account_id: cloudAccountId } })
}

export function cloudAccountCertificates (orgId, cloudAccountId, keyword = null) {
  return request({ url: 'resources/cloud-accounts/certificates', method: 'get', params: { org: orgId, cloud_account_id: cloudAccountId, keyword } })
}

export function cloudAccountCertificateImport (orgId, cloudAccountId, certificateRef, title) {
  return request({
    url: 'resources/cloud-accounts/certificates/import',
    method: 'post',
    data: { org: orgId, cloud_account_id: cloudAccountId, certificate_ref: certificateRef, title }
  })
}
