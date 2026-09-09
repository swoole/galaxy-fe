function trimPath (value) {
  return String(value || '').replace(/^\/+|\/+$/g, '')
}

export function projectArtifactRepository (namespace, imageName) {
  const name = trimPath(imageName).split('/').filter(Boolean).pop() || ''
  return [trimPath(namespace), name].filter(Boolean).join('/')
}

export function ociImageReference (address, repository, tag = '') {
  const image = [trimPath(address), trimPath(repository)].filter(Boolean).join('/')
  return image && tag ? `${image}:${String(tag).trim()}` : image
}

export function nextOciImageTag (references, repository = '') {
  const target = trimPath(repository)
  for (const value of Array.isArray(references) ? references : []) {
    const reference = String(value || '').split('@')[0]
    const slash = reference.lastIndexOf('/')
    const colon = reference.lastIndexOf(':')
    if (colon <= slash) continue

    const currentRepository = reference.slice(0, colon)
    if (target && currentRepository !== target && !currentRepository.endsWith(`/${target}`)) continue

    const tag = reference.slice(colon + 1)
    const version = tag.match(/^(v?)(\d+(?:\.\d+)+)$/)
    if (!version) continue

    const parts = version[2].split('.')
    parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1)
    return `${version[1]}${parts.join('.')}`
  }
  return 'latest'
}
