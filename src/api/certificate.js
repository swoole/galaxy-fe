import request from '@/utils/request'

export function certificates (orgId, page = 1, pageSize = 20, keyword = null) {
  return request({
    url: 'resources/certificates',
    method: 'get',
    params: { org: orgId, page, pagesize: pageSize, keyword }
  })
}

export function certificateOptions (orgId, hostname = null, scope = {}) {
  const project = scope && scope.projectId
    ? { group: scope.groupId, project: scope.projectId }
    : {}
  return request({
    url: 'resources/certificates/options',
    method: 'get',
    params: { org: orgId, hostname, ...project }
  })
}

export function certificateImport (orgId, form) {
  return request({
    url: 'resources/certificates/import',
    method: 'post',
    data: { org: orgId, ...form }
  })
}

export function certificateSelfSigned (orgId, form) {
  return request({
    url: 'resources/certificates/self-signed',
    method: 'post',
    data: { org: orgId, ...form }
  })
}

export function certificateLetsEncrypt (orgId, form) {
  return request({
    url: 'resources/certificates/lets-encrypt',
    method: 'post',
    data: { org: orgId, ...form }
  })
}

export function certificateDelete (orgId, certificateId) {
  return request({
    url: 'resources/certificates',
    method: 'delete',
    data: { org: orgId, certificate_id: certificateId }
  })
}

export function acmeBackupSettings (orgId) {
  return request({
    url: 'resources/certificates/acme-backup',
    method: 'get',
    params: { org: orgId }
  })
}

export function saveAcmeBackupSettings (orgId, form) {
  return request({
    url: 'resources/certificates/acme-backup',
    method: 'put',
    data: { org: orgId, ...form }
  })
}

export function runAcmeBackup (orgId) {
  return request({
    url: 'resources/certificates/acme-backup/run',
    method: 'post',
    data: { org: orgId }
  })
}
