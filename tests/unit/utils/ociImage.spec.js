import { nextOciImageTag, ociImageReference, projectArtifactRepository } from '@/utils/ociImage'

describe('OCI image helpers', () => {
  test('combines the registry namespace and leaf image name for the Registry API', () => {
    expect(projectArtifactRepository('code-galaxy', 'code-galaxy/swoole-aot'))
      .toBe('code-galaxy/swoole-aot')
  })

  test('normalizes surrounding slashes and removes pasted namespace segments', () => {
    expect(projectArtifactRepository('/code-galaxy/', '/code-galaxy/swoole-aot/'))
      .toBe('code-galaxy/swoole-aot')
  })

  test('builds the complete OCI reference from registry address and repository', () => {
    expect(ociImageReference(
      'registry.cn-shanghai.aliyuncs.com',
      'code-galaxy/swoole-aot',
      '1.0.16'
    )).toBe('registry.cn-shanghai.aliyuncs.com/code-galaxy/swoole-aot:1.0.16')
  })

  test('suggests the next patch tag from the latest matching image', () => {
    expect(nextOciImageTag([
      'registry.cn-shanghai.aliyuncs.com/code-galaxy/another:9.0.0',
      'registry.cn-shanghai.aliyuncs.com/code-galaxy/swoole-aot:1.0.22'
    ], 'code-galaxy/swoole-aot')).toBe('1.0.23')
  })

  test('preserves a v prefix and skips non-version tags', () => {
    expect(nextOciImageTag([
      'registry.example.com/team/api:latest',
      'registry.example.com/team/api:v2.7.9'
    ], 'team/api')).toBe('v2.7.10')
  })

  test('falls back to latest when no incrementable version exists', () => {
    expect(nextOciImageTag([
      'registry.example.com/team/api:stable'
    ], 'team/api')).toBe('latest')
  })
})
