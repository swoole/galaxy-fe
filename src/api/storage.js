import request from '@/utils/request'

export function getStorageBuckets (orgId, params = {}) {
  return request({ url: 'resources/storage-buckets', method: 'get', params: { org: orgId, ...params } })
}

export function getStorageBucket (orgId, bucketId) {
  return request({ url: `resources/storage-buckets/${bucketId}`, method: 'get', params: { org: orgId } })
}

export function discoverStorageBuckets (orgId, params) {
  return request({ url: 'resources/storage-buckets/discover', method: 'get', params: { org: orgId, ...params } })
}

export function createStorageBucket (orgId, data) {
  return request({ url: 'resources/storage-buckets', method: 'post', data: { org: orgId, ...data } })
}

export function updateStorageBucket (orgId, bucketId, data) {
  return request({ url: `resources/storage-buckets/${bucketId}`, method: 'put', data: { org: orgId, ...data } })
}

export function deleteStorageBucket (orgId, bucketId) {
  return request({ url: `resources/storage-buckets/${bucketId}`, method: 'delete', data: { org: orgId } })
}

export function setDefaultBucket (orgId, bucketId) {
  return request({ url: `resources/storage-buckets/${bucketId}/default`, method: 'post', data: { org: orgId } })
}

export function getStorageFiles (orgId, params = {}) {
  return request({ url: 'resources/storage-files', method: 'get', params: { org: orgId, ...params } })
}

export function downloadStorageFile (orgId, bucketId, path) {
  return request({
    url: 'resources/storage-files/download',
    method: 'get',
    params: { org: orgId, bucket_id: bucketId, path },
    responseType: 'blob'
  })
}

export function uploadStorageFile (orgId, formData) {
  return request({
    url: 'resources/storage-files/upload',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data;charset=utf-8' }
  })
}

export function createStorageDirectory (orgId, bucketId, parent, name) {
  return request({
    url: 'resources/storage-directories',
    method: 'post',
    data: { org: orgId, bucket_id: bucketId, parent, name }
  })
}

export function deleteStorageFile (orgId, bucketId, path, type = 'file') {
  return request({
    url: 'resources/storage-files',
    method: 'delete',
    data: { org: orgId, bucket_id: bucketId, path, type }
  })
}
