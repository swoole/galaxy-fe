<template>
  <div class="image-reference-selector" v-loading="loading">
    <el-form-item label="Registry 域名" required>
      <el-select
        v-model="form.registry"
        filterable
        allow-create
        default-first-option
        placeholder="docker.io"
        style="width: 100%"
        @change="onRegistryChange">
        <el-option-group
          v-for="group in registryOptionGroups"
          :key="group.label"
          :label="group.label">
          <el-option
            v-for="item in group.options"
            :key="item.value"
            :label="item.label"
            :value="item.value" />
        </el-option-group>
      </el-select>
      <div class="image-selector-help">Docker Hub 使用 docker.io；GitHub Container Registry 使用 ghcr.io。</div>
    </el-form-item>

    <el-form-item label="Namespace">
      <el-select
        v-model="form.namespace"
        filterable
        allow-create
        default-first-option
        clearable
        placeholder="例如 library 或 code-galaxy"
        style="width: 100%"
        @change="onNamespaceChange">
        <el-option v-for="item in namespaceOptions" :key="item" :label="item" :value="item" />
      </el-select>
    </el-form-item>

    <el-row :gutter="12">
      <el-col :span="16">
        <el-form-item label="镜像名" required>
          <el-select
            v-model="form.repository"
            filterable
            allow-create
            default-first-option
            placeholder="例如 nginx"
            style="width: 100%"
            @change="emitValue">
            <el-option v-for="item in repositoryOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="Tag" required label-width="48px">
          <el-select
            v-model="form.tag"
            filterable
            allow-create
            default-first-option
            placeholder="latest"
            style="width: 100%"
            @change="emitValue">
            <el-option v-for="item in tagOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>

    <el-alert
      class="image-credential-tip"
      type="info"
      :closable="false"
      show-icon
      title="拉取私有镜像时，将根据 Registry 域名和 Namespace 自动使用“资源 → 镜像仓库”中配置的凭证。" />

    <div class="image-reference-preview">
      <span>最终镜像 URI</span>
      <image-reference
        :value="reference"
        :org-id="orgId"
        :cluster-id="clusterId"
        :node-id="nodeId"
        empty-text="请填写完整镜像信息" />
    </div>
  </div>
</template>

<script>
import { clusterSwarmImages } from '@/api/cluster'
import { registryList } from '@/api/project'

const COMMON_REGISTRIES = [
  { value: 'docker.io', label: 'Docker Hub · docker.io（docker.com）' },
  { value: 'gcr.io', label: 'Google Container Registry · gcr.io' },
  { value: 'ghcr.io', label: 'GitHub Container Registry · ghcr.io' },
  { value: 'quay.io', label: 'Red Hat Quay · quay.io' },
  { value: 'registry.gitlab.com', label: 'GitLab Container Registry · registry.gitlab.com' },
  { value: 'mcr.microsoft.com', label: 'Microsoft Container Registry · mcr.microsoft.com' }
]

export default {
  name: 'ImageReferenceSelector',
  props: {
    value: { type: String, default: '' },
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    nodeId: { type: String, default: '' },
    loadLocalImages: { type: Boolean, default: true }
  },
  data () {
    return {
      loading: false,
      registries: [],
      localReferences: [],
      registryId: 0,
      defaultNamespace: 'library',
      form: {
        registry: 'docker.io',
        namespace: 'library',
        repository: '',
        tag: 'latest'
      }
    }
  },
  computed: {
    parsedLocalReferences () {
      return this.localReferences.map(this.parseReference).filter(item => item.repository)
    },
    registryOptionGroups () {
      const publicValues = new Map(COMMON_REGISTRIES.map(item => [item.value, item]))
      const privateValues = new Map()
      this.registries.forEach(item => {
        const host = this.normalizeRegistry(item.address)
        if (host && !publicValues.has(host)) {
          privateValues.set(host, {
            value: host,
            label: `${item.remark || item.username || 'Galaxy 镜像仓库'} · ${host}`
          })
        }
      })
      this.parsedLocalReferences.forEach(item => {
        if (!publicValues.has(item.registry) && !privateValues.has(item.registry)) {
          privateValues.set(item.registry, {
            value: item.registry,
            label: `节点镜像 · ${item.registry}`
          })
        }
      })
      return [
        { label: '开放镜像仓库', options: Array.from(publicValues.values()) },
        { label: '私有 / 自建镜像仓库', options: Array.from(privateValues.values()) }
      ].filter(group => group.options.length)
    },
    namespaceOptions () {
      const values = new Set()
      this.registries.forEach(item => {
        if (this.registryMatches(item) && item.namespace) values.add(String(item.namespace))
      })
      this.parsedLocalReferences.forEach(item => {
        if (item.registry === this.form.registry && item.namespace) values.add(item.namespace)
      })
      if (this.form.registry === 'docker.io') values.add('library')
      return Array.from(values).sort()
    },
    repositoryOptions () {
      return Array.from(new Set(this.parsedLocalReferences
        .filter(item => item.registry === this.form.registry && item.namespace === (this.form.namespace || ''))
        .map(item => item.repository))).sort()
    },
    tagOptions () {
      const values = new Set(['latest'])
      this.parsedLocalReferences.forEach(item => {
        if (item.registry === this.form.registry &&
            item.namespace === (this.form.namespace || '') &&
            item.repository === this.form.repository &&
            item.tag) values.add(item.tag)
      })
      return Array.from(values)
    },
    reference () {
      const registry = this.normalizeRegistry(this.form.registry)
      const namespace = String(this.form.namespace || '').trim().replace(/^\/+|\/+$/g, '')
      const repository = String(this.form.repository || '').trim().replace(/^\/+|\/+$/g, '')
      const tag = String(this.form.tag || 'latest').trim()
      if (!registry || !repository || !tag || /\s/.test(`${registry}${namespace}${repository}${tag}`)) return ''
      return [registry, namespace, repository].filter(Boolean).join('/') + ':' + tag
    }
  },
  watch: {
    value: {
      immediate: true,
      handler (value) {
        if (value && value !== this.reference) this.applyReference(value)
      }
    },
    nodeId (value, previous) {
      if (value !== previous) this.load(this.reference)
    }
  },
  methods: {
    load (reference = this.value) {
      if (reference) this.applyReference(reference)
      this.loading = true
      const localImages = this.loadLocalImages
        ? clusterSwarmImages(this.orgId, this.clusterId, this.nodeId)
        : Promise.resolve({ data: { images: [] } })
      return Promise.all([
        registryList(this.orgId, '', 1, 100),
        localImages
      ]).then(([registryRes, imageRes]) => {
        this.registries = registryRes.data.data || []
        const references = []
        ;(imageRes.data.images || []).forEach(image => {
          ;(image.repo_tags || []).forEach(tag => {
            if (tag && tag !== '<none>:<none>') references.push(tag)
          })
        })
        this.localReferences = Array.from(new Set(references))
        this.selectMatchingCredential()
        this.emitValue()
      }).catch(() => {
        this.registries = []
        this.localReferences = []
        this.emitValue()
      }).finally(() => { this.loading = false })
    },
    applyReference (reference) {
      const parsed = this.parseReference(reference)
      this.defaultNamespace = parsed.namespace
      this.form = {
        registry: parsed.registry,
        namespace: parsed.namespace,
        repository: parsed.repository,
        tag: parsed.tag
      }
    },
    parseReference (reference) {
      let value = String(reference || '').trim()
      const digestAt = value.indexOf('@')
      if (digestAt >= 0) value = value.slice(0, digestAt)
      const segments = value.split('/').filter(Boolean)
      let registry = 'docker.io'
      if (segments.length > 1 && (segments[0].includes('.') || segments[0].includes(':') || segments[0] === 'localhost')) {
        registry = this.normalizeRegistry(segments.shift())
      }
      let last = segments.pop() || ''
      let tag = 'latest'
      const tagAt = last.lastIndexOf(':')
      if (tagAt > 0) {
        tag = last.slice(tagAt + 1) || 'latest'
        last = last.slice(0, tagAt)
      }
      return {
        registry,
        namespace: segments.join('/') || (registry === 'docker.io' ? 'library' : ''),
        repository: last,
        tag
      }
    },
    normalizeRegistry (address) {
      let value = String(address || '').trim().toLowerCase()
      value = value.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\/+$/, '')
      if (!value || value === 'index.docker.io' || value === 'registry-1.docker.io' || value === 'docker.com') return 'docker.io'
      return value
    },
    registryMatches (registry) {
      return this.normalizeRegistry(registry.address) === this.form.registry
    },
    onRegistryChange () {
      this.form.registry = this.normalizeRegistry(this.form.registry)
      this.defaultNamespace = this.preferredNamespace(this.form.registry)
      this.form.namespace = this.defaultNamespace
      this.selectMatchingCredential()
      this.emitValue()
    },
    onNamespaceChange (value) {
      if (!String(value || '').trim() && this.defaultNamespace) {
        this.form.namespace = this.defaultNamespace
      }
      this.selectMatchingCredential()
      this.emitValue()
    },
    preferredNamespace (registryHost) {
      const configured = this.registries.find(item =>
        this.normalizeRegistry(item.address) === registryHost && String(item.namespace || '').trim()
      )
      if (configured) return String(configured.namespace).trim()
      const local = this.parsedLocalReferences.find(item => item.registry === registryHost && item.namespace)
      if (local) return local.namespace
      return registryHost === 'docker.io' ? 'library' : ''
    },
    selectMatchingCredential () {
      const exact = this.registries.find(item => this.registryMatches(item) &&
        (!item.namespace || String(item.namespace) === String(this.form.namespace || '')))
      this.registryId = exact ? Number(exact.id) : 0
    },
    emitValue () {
      this.$emit('input', this.reference)
      this.$emit('registry-change', Number(this.registryId || 0))
      this.$emit('change', { image: this.reference, registryId: Number(this.registryId || 0) })
    }
  }
}
</script>

<style lang="scss" scoped>
.image-selector-help {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 18px;
}
.image-reference-preview {
  padding: 12px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #f7f8fa;
  span {
    display: block;
    margin-bottom: 6px;
    color: #909399;
    font-size: 12px;
  }
}
.image-credential-tip {
  margin: 4px 0 16px;
}
</style>
