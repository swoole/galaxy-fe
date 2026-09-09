<template>
  <section class="build-profile">
    <div class="source-grid">
      <button
        type="button"
        class="source-card"
        :class="{ active: profile.dockerfile_source === 'repository' }"
        @click="setSource('repository')">
        <span class="source-title">使用仓库 Dockerfile</span>
        <span class="source-desc">适合已有容器化方案的项目，Galaxy 尊重仓库中的 Dockerfile 和 .dockerignore。</span>
      </button>
      <button
        type="button"
        class="source-card"
        :class="{ active: profile.dockerfile_source === 'template' }"
        @click="setSource('template')">
        <span class="source-title">从模板生成 Dockerfile</span>
        <span class="source-desc">按语言、框架和运行方式生成可预览、可复现的多阶段 Dockerfile。</span>
      </button>
    </div>

    <div v-if="profile.dockerfile_source === 'repository'" class="profile-panel compact-panel">
      <div class="field-row">
        <label>构建上下文</label>
        <el-input v-model="profile.build_context" size="small" placeholder="." />
      </div>
      <div class="field-row">
        <label>Dockerfile 路径</label>
        <el-input v-model="profile.repository_dockerfile_path" size="small" placeholder="Dockerfile" />
      </div>
      <el-alert type="info" :closable="false" title="两个路径均相对于 Git 仓库根目录；构建时不会修改源码缓存。" />
    </div>

    <div v-else class="profile-panel" v-loading="catalogLoading">
      <el-input
        v-model="templateKeyword"
        class="template-search"
        size="small"
        clearable
        prefix-icon="el-icon-search"
        placeholder="搜索语言、框架或模板" />
      <div class="step-block">
        <div class="step-heading"><b>1</b><span>选择编程语言</span></div>
        <div class="tag-picker">
          <button
            v-for="language in catalog.languages || []"
            :key="language.key"
            type="button"
            :class="{ active: selectedLanguage === language.key }"
            @click="selectLanguage(language.key)">{{ language.label }}</button>
        </div>
      </div>

      <div v-if="selectedLanguage" class="step-block">
        <div class="step-heading"><b>2</b><span>选择框架与构建方案</span></div>
        <div class="template-grid">
          <button
            v-for="template in visibleTemplates"
            :key="template.key"
            type="button"
            class="template-card"
            :class="{ active: profile.template_key === template.key }"
            @click="selectTemplate(template)">
            <span class="template-title">{{ template.title }}</span>
            <span class="template-framework">{{ template.framework_label }}</span>
            <span class="template-summary">{{ template.summary }}</span>
            <span class="template-meta">
              <em v-for="tag in template.tags || []" :key="tag">{{ tag }}</em>
              <em>{{ (template.platforms || []).map(platformLabel).join(' / ') }}</em>
            </span>
          </button>
        </div>
      </div>

      <template v-if="currentTemplate">
        <div class="step-block">
          <div class="step-heading"><b>3</b><span>版本与运行方式</span></div>
          <div class="option-line">
            <label>运行时版本</label>
            <el-radio-group v-model="profile.options.runtime_version" size="small">
              <el-radio-button v-for="version in currentTemplate.runtime_versions" :key="version" :label="version">{{ version }}</el-radio-button>
            </el-radio-group>
          </div>
          <div class="option-line" v-if="currentTemplate.framework_versions[0] !== 'any'">
            <label>框架大版本</label>
            <el-radio-group v-model="profile.options.framework_version" size="small">
              <el-radio-button v-for="version in currentTemplate.framework_versions" :key="version" :label="version">{{ version }}</el-radio-button>
            </el-radio-group>
          </div>
          <div class="option-line">
            <label>运行方式</label>
            <el-radio-group v-model="profile.options.runtime_server" size="small">
              <el-radio-button v-for="server in currentTemplate.runtime_servers" :key="server.key" :label="server.key">{{ server.label }}</el-radio-button>
            </el-radio-group>
          </div>
          <el-collapse class="advanced-options">
            <el-collapse-item name="advanced">
              <template slot="title"><i class="el-icon-setting" /> 高级构建配置</template>
              <div v-for="option in advancedOptions" :key="option.key" class="option-line advanced-line">
                <label>{{ option.label }}</label>
                <el-switch
                  v-if="option.type === 'boolean'"
                  v-model="profile.options[option.key]" />
                <el-input-number
                  v-else-if="option.type === 'port' || option.type === 'integer'"
                  v-model="profile.options[option.key]"
                  size="small"
                  :min="option.min || (option.type === 'port' ? 1 : 0)"
                  :max="option.max || (option.type === 'port' ? 65535 : 2147483647)" />
                <el-select
                  v-else-if="option.type === 'single_select'"
                  v-model="profile.options[option.key]"
                  filterable
                  size="small">
                  <el-option v-for="item in optionAllowed(option)" :key="item" :label="item" :value="item" />
                </el-select>
                <el-select
                  v-else-if="listOptionTypes.includes(option.type)"
                  v-model="profile.options[option.key]"
                  class="list-option"
                  size="small"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  :placeholder="listPlaceholder(option)" />
                <el-input
                  v-else
                  v-model="profile.options[option.key]"
                  size="small"
                  :placeholder="String(option.default || '')" />
              </div>
              <el-alert
                type="info"
                :closable="false"
                title="系统包和命令均以结构化数组保存；服务端会校验每个值，不允许注入 Shell 片段。" />
            </el-collapse-item>
          </el-collapse>
        </div>

        <div class="step-block">
          <div class="step-heading"><b>4</b><span>依赖与构建选项</span></div>
          <div class="option-line" v-if="currentTemplate.package_managers && currentTemplate.package_managers.length > 1">
            <label>包管理器</label>
            <el-radio-group v-model="profile.options.package_manager" size="small" @change="packageManagerChanged">
              <el-radio-button v-for="manager in currentTemplate.package_managers" :key="manager" :label="manager">{{ manager }}</el-radio-button>
            </el-radio-group>
          </div>
          <div class="option-line" v-if="currentTemplate.extensions">
            <label>PHP 扩展</label>
            <el-checkbox-group v-model="profile.options.extensions" size="small">
              <el-checkbox-button v-for="extension in currentTemplate.extensions" :key="extension" :label="extension">{{ extension }}</el-checkbox-button>
            </el-checkbox-group>
          </div>
          <div class="option-line" v-if="currentTemplate.options && currentTemplate.options.includes('cgo')">
            <label>Go 编译</label>
            <el-switch v-model="profile.options.cgo" active-text="启用 CGO" />
          </div>
          <div class="option-line">
            <label>软件镜像源</label>
            <el-select v-model="profile.options.mirror.key" size="small" @change="mirrorChanged">
              <el-option v-for="mirror in currentMirrors" :key="mirror.key" :label="mirror.label" :value="mirror.key" />
            </el-select>
            <el-input
              v-if="profile.options.mirror.key === 'custom'"
              v-model="profile.options.mirror.url"
              size="small"
              class="custom-mirror"
              placeholder="https://mirror.example.com/" />
          </div>
          <div class="option-line os-mirror-line">
            <label>操作系统源</label>
            <div>
              <el-select v-model="profile.options.os_mirror.key" size="small" @change="osMirrorChanged">
                <el-option v-for="mirror in osMirrors" :key="mirror.key" :label="mirror.label" :value="mirror.key" />
              </el-select>
              <div v-if="profile.options.os_mirror.key === 'custom'" class="custom-os-sources">
                <el-input
                  v-if="usesDebian"
                  v-model="profile.options.os_mirror.sources.debian.url"
                  size="small"
                  placeholder="Debian 镜像，例如 https://mirror.example.com/debian" />
                <el-input
                  v-if="usesUbuntu"
                  v-model="profile.options.os_mirror.sources.ubuntu.url"
                  size="small"
                  placeholder="Ubuntu 镜像，例如 https://mirror.example.com/ubuntu" />
                <el-input
                  v-if="usesApk"
                  v-model="profile.options.os_mirror.sources.alpine.url"
                  size="small"
                  placeholder="Alpine 镜像，例如 https://mirror.example.com/alpine" />
                <el-input
                  v-if="usesDnf"
                  v-model="profile.options.os_mirror.sources['centos-stream'].url"
                  size="small"
                  placeholder="CentOS Stream 镜像地址" />
              </div>
              <div class="muted os-mirror-tip">HTTPS 源会先通过 HTTP 引导安装 CA 证书，再切换到 HTTPS；时区安装固定为非交互模式。</div>
            </div>
          </div>
          <div class="option-line">
            <label>.dockerignore</label>
            <code>default-secure-v1</code>
            <span class="muted">默认排除 .git、.env、SSH 私钥和 IDE 元数据</span>
          </div>
          <div class="option-line">
            <label>目标架构</label>
            <el-checkbox-group v-model="profile.options.platforms" size="small">
              <el-checkbox-button v-for="platform in currentTemplate.platforms || []" :key="platform" :label="platform">{{ platform }}</el-checkbox-button>
            </el-checkbox-group>
          </div>
        </div>

        <div class="preview-actions">
          <el-button size="small" :loading="previewLoading" @click="preview">生成并预览</el-button>
          <span v-if="previewData" class="checksum">SHA256 {{ previewData.dockerfile_checksum.slice(0, 16) }}…</span>
        </div>
        <el-tabs v-if="previewData" v-model="previewTab" class="preview-tabs">
          <el-tab-pane label="Dockerfile" name="dockerfile"><pre><code>{{ previewData.dockerfile }}</code></pre></el-tab-pane>
          <el-tab-pane label=".dockerignore" name="dockerignore"><pre><code>{{ previewData.dockerignore }}</code></pre></el-tab-pane>
          <el-tab-pane label="Build Args" name="args"><pre><code>{{ JSON.stringify(previewData.build_args, null, 2) }}</code></pre></el-tab-pane>
          <el-tab-pane label="构建说明" name="summary"><pre><code>{{ JSON.stringify(previewData.summary, null, 2) }}</code></pre></el-tab-pane>
        </el-tabs>
        <el-alert
          v-for="warning in previewData ? previewData.warnings : []"
          :key="warning"
          class="preview-warning"
          type="warning"
          :closable="false"
          :title="warning" />
      </template>
    </div>
    <div v-if="projectId" class="profile-actions">
      <el-button
        v-if="profile.dockerfile_source === 'template'"
        size="small"
        :loading="upgradeLoading"
        @click="checkUpgrade">检查模板更新</el-button>
      <el-button size="small" @click="showRevisions">历史版本</el-button>
    </div>
    <el-dialog title="模板升级预览" :visible.sync="upgradeVisible" width="760px" append-to-body>
      <el-alert
        v-if="upgradeData"
        :type="upgradeData.changed ? 'warning' : 'success'"
        :closable="false"
        :title="upgradeData.changed ? '模板产物有变化，保存前请检查 Diff' : '当前构建配置已经是最新产物'" />
      <pre v-if="upgradeData && upgradeData.diff" class="diff-view"><code>{{ upgradeData.diff }}</code></pre>
      <span slot="footer"><el-button @click="upgradeVisible = false">关闭</el-button></span>
    </el-dialog>
    <el-dialog title="构建配置历史" :visible.sync="revisionsVisible" width="820px" append-to-body>
      <el-table :data="revisions" size="small" max-height="430">
        <el-table-column prop="revision" label="版本" width="80" />
        <el-table-column prop="profile.dockerfile_source" label="来源" width="110" />
        <el-table-column prop="profile.template_key" label="模板" min-width="150" />
        <el-table-column prop="reason" label="原因" width="120" />
        <el-table-column label="创建时间" width="170">
          <template slot-scope="scope">{{ revisionTime(scope.row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template slot-scope="scope">
            <el-button type="text" @click="rollbackRevision(scope.row)">回滚</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </section>
</template>

<script>
import {
  projectBuildProfileRevisions,
  projectBuildProfileRollback,
  projectBuildProfileUpgradePreview,
  dockerfileTemplateCatalog,
  dockerfileTemplateRender
} from '@/api/project'

export default {
  name: 'BuildProfileForm',
  props: {
    value: { type: Object, required: true },
    orgId: { type: [String, Number], default: null },
    groupId: { type: [String, Number], default: null },
    projectId: { type: [String, Number], default: null },
    clusterId: { type: [String, Number], default: null },
    repository: { type: Object, default: null }
  },
  data () {
    return {
      catalog: { languages: [], templates: [], mirrors: {} },
      catalogLoading: false,
      previewLoading: false,
      upgradeLoading: false,
      upgradeVisible: false,
      upgradeData: null,
      revisionsVisible: false,
      revisions: [],
      previewData: null,
      previewTab: 'dockerfile',
      selectedLanguage: '',
      templateKeyword: '',
      listOptionTypes: ['argument_list', 'package_list', 'identifier_list', 'domain_list']
    }
  },
  computed: {
    profile () { return this.value },
    visibleTemplates () {
      const keyword = this.templateKeyword.trim().toLowerCase()
      return (this.catalog.templates || []).filter(item => {
        if (item.language !== this.selectedLanguage) return false
        if (!keyword) return true
        return [item.title, item.summary, item.framework_label, item.language_label, ...(item.tags || [])]
          .join(' ').toLowerCase().includes(keyword)
      })
    },
    currentTemplate () {
      return (this.catalog.templates || []).find(item => item.key === this.profile.template_key) || null
    },
    currentMirrors () {
      const manager = this.profile.options && this.profile.options.package_manager
        ? this.profile.options.package_manager
        : (this.currentTemplate && this.currentTemplate.package_manager)
      return manager ? (this.catalog.mirrors[manager] || []) : []
    },
    osMirrors () {
      return this.catalog.mirrors.os || []
    },
    usesDebian () {
      return Boolean(this.currentTemplate && (this.currentTemplate.os_distributions || []).includes('debian'))
    },
    usesUbuntu () {
      return Boolean(this.currentTemplate && (this.currentTemplate.os_distributions || []).includes('ubuntu'))
    },
    usesApk () {
      return Boolean(this.currentTemplate && (this.currentTemplate.os_package_managers || []).includes('apk'))
    },
    usesDnf () {
      return Boolean(this.currentTemplate && (this.currentTemplate.os_package_managers || []).some(item => item === 'dnf' || item === 'yum'))
    },
    advancedOptions () {
      if (!this.currentTemplate) return []
      return [...(this.currentTemplate.common_options || []), ...(this.currentTemplate.language_options || [])]
    }
  },
  created () {
    this.loadCatalog()
  },
  watch: {
    'profile.template_key': function (key) {
      const selected = (this.catalog.templates || []).find(item => item.key === key)
      if (selected) {
        this.selectedLanguage = selected.language
        if (this.profile.options && !this.profile.options.package_manager) {
          this.$set(this.profile.options, 'package_manager', selected.package_manager)
        }
        if (this.profile.options && !Array.isArray(this.profile.options.platforms)) {
          this.$set(this.profile.options, 'platforms', (selected.default_platforms || ['linux/amd64']).slice())
        }
        this.applyOptionDefaults(selected)
      }
    }
  },
  methods: {
    loadCatalog () {
      this.catalogLoading = true
      dockerfileTemplateCatalog().then(res => {
        this.catalog = res.data
        const selected = (this.catalog.templates || []).find(item => item.key === this.profile.template_key)
        if (selected) {
          this.selectedLanguage = selected.language
          this.applyOptionDefaults(selected)
        }
      }).finally(() => { this.catalogLoading = false })
    },
    setSource (source) {
      this.profile.dockerfile_source = source
      this.previewData = null
    },
    selectLanguage (language) {
      this.selectedLanguage = language
      const first = (this.catalog.templates || []).find(item => item.language === language)
      if (first) this.selectTemplate(first)
    },
    selectTemplate (template) {
      this.profile.template_key = template.key
      this.profile.options = {
        runtime_version: template.runtime_versions[0],
        framework_version: template.framework_versions[0],
        runtime_server: template.default_server,
        package_manager: template.package_manager,
        extensions: (template.default_extensions || []).slice(),
        cgo: false,
        platforms: (template.default_platforms || ['linux/amd64']).slice(),
        mirror: { key: 'official', url: '' },
        os_mirror: { key: 'aliyun', sources: this.emptyOsSources() }
      }
      this.applyOptionDefaults(template)
      this.previewData = null
    },
    applyOptionDefaults (template) {
      if (!this.profile.options) this.$set(this.profile, 'options', {})
      if (!this.profile.options.os_mirror) {
        this.$set(this.profile.options, 'os_mirror', { key: 'aliyun', sources: this.emptyOsSources() })
      } else if (!this.profile.options.os_mirror.sources) {
        this.$set(this.profile.options.os_mirror, 'sources', this.emptyOsSources())
      }
      const options = [...(template.common_options || []), ...(template.language_options || [])]
      options.forEach(option => {
        if (typeof this.profile.options[option.key] !== 'undefined') return
        const value = Array.isArray(option.default) ? option.default.slice() : option.default
        this.$set(this.profile.options, option.key, value)
      })
    },
    platformLabel (platform) {
      return String(platform).replace('linux/', '')
    },
    listPlaceholder (option) {
      if (option.type === 'package_list') return '输入包名后回车，可添加多项'
      if (option.type === 'argument_list') return '每个参数单独输入并回车'
      if (option.type === 'domain_list') return '输入域名后回车'
      return '输入标识符后回车'
    },
    optionAllowed (option) {
      return option.allowed || this.catalog[option.allowed_ref] || []
    },
    mirrorChanged () {
      this.profile.options.mirror.url = ''
      this.previewData = null
    },
    emptyOsSources () {
      return {
        debian: { url: '' },
        ubuntu: { url: '' },
        alpine: { url: '' },
        'centos-stream': { url: '' }
      }
    },
    osMirrorChanged () {
      this.$set(this.profile.options.os_mirror, 'sources', this.emptyOsSources())
      this.previewData = null
    },
    packageManagerChanged () {
      this.profile.options.mirror = { key: 'official', url: '' }
      this.previewData = null
    },
    preview () {
      if (!this.validate()) return
      this.previewLoading = true
      dockerfileTemplateRender(this.profile.template_key, this.profile.options).then(res => {
        this.previewData = res.data
      }).finally(() => { this.previewLoading = false })
    },
    checkUpgrade () {
      this.upgradeLoading = true
      projectBuildProfileUpgradePreview(this.orgId, this.groupId, this.projectId).then(res => {
        this.upgradeData = res.data
        this.upgradeVisible = true
      }).finally(() => { this.upgradeLoading = false })
    },
    showRevisions () {
      projectBuildProfileRevisions(this.orgId, this.groupId, this.projectId).then(res => {
        this.revisions = res.data.revisions || []
        this.revisionsVisible = true
      })
    },
    rollbackRevision (revision) {
      this.$confirm(`确认回滚到构建配置版本 ${revision.revision}？只影响未来构建。`, '回滚构建配置', { type: 'warning' }).then(() => {
        return projectBuildProfileRollback(this.orgId, this.groupId, this.projectId, revision.id)
      }).then(res => {
        this.$emit('input', res.data.profile)
        this.previewData = null
        this.revisionsVisible = false
        this.$message.success('构建配置已回滚')
      })
    },
    revisionTime (timestamp) {
      if (!timestamp) return '-'
      return new Date(Number(timestamp) * 1000).toLocaleString()
    },
    validate () {
      if (this.profile.dockerfile_source === 'repository') {
        if (!this.profile.build_context || !this.profile.repository_dockerfile_path) {
          this.$message.error('请填写构建上下文和 Dockerfile 路径')
          return false
        }
        return true
      }
      if (!this.profile.template_key || !this.currentTemplate) {
        this.$message.error('请选择 Dockerfile 模板')
        return false
      }
      if (this.profile.options.mirror.key === 'custom' && !this.profile.options.mirror.url) {
        this.$message.error('请填写自定义软件镜像源 URL')
        return false
      }
      if (this.profile.options.os_mirror && this.profile.options.os_mirror.key === 'custom') {
        const sources = this.profile.options.os_mirror.sources || {}
        if (this.usesDebian && !(sources.debian && sources.debian.url)) {
          this.$message.error('请填写自定义 Debian APT 镜像地址')
          return false
        }
        if (this.usesUbuntu && !(sources.ubuntu && sources.ubuntu.url)) {
          this.$message.error('请填写自定义 Ubuntu APT 镜像地址')
          return false
        }
        if (this.usesApk && !(sources.alpine && sources.alpine.url)) {
          this.$message.error('请填写自定义 Alpine APK 镜像地址')
          return false
        }
      }
      return true
    }
  }
}
</script>

<style lang="scss" scoped>
.build-profile { max-width: 940px; margin: 0 auto 28px; }
.source-grid, .template-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.source-card, .template-card { border: 1px solid #dfe4ed; border-radius: 8px; background: #fff; padding: 16px; text-align: left; cursor: pointer; transition: .18s ease; }
.source-card:hover, .template-card:hover { border-color: #8cbcff; transform: translateY(-1px); }
.source-card.active, .template-card.active { border-color: #409eff; box-shadow: 0 0 0 2px rgba(64, 158, 255, .12); background: #f7fbff; }
.source-title, .template-title { display: block; color: #17233d; font-size: 15px; font-weight: 600; }
.source-desc, .template-summary { display: block; color: #7b8497; line-height: 1.55; margin-top: 7px; }
.template-framework { display: inline-block; color: #409eff; background: #ecf5ff; border-radius: 10px; padding: 2px 8px; margin-top: 8px; font-size: 12px; }
.template-meta { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
.template-meta em { padding: 2px 7px; border-radius: 9px; color: #7b8497; background: #f0f2f6; font-size: 11px; font-style: normal; }
.profile-panel { margin-top: 14px; border: 1px solid #e7ebf1; border-radius: 8px; padding: 20px; background: #fbfcfe; }
.template-search { width: 360px; margin-bottom: 18px; }
.compact-panel { max-width: 700px; }
.field-row, .option-line { display: flex; align-items: center; gap: 12px; margin: 14px 0; }
.field-row label, .option-line > label { width: 105px; flex: 0 0 105px; color: #606a7b; }
.field-row .el-input { width: 420px; }
.step-block + .step-block { border-top: 1px solid #e7ebf1; margin-top: 20px; padding-top: 20px; }
.step-heading { display: flex; align-items: center; gap: 9px; margin-bottom: 13px; font-size: 15px; color: #303848; }
.step-heading b { width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; background: #409eff; }
.tag-picker { display: flex; flex-wrap: wrap; gap: 9px; }
.tag-picker button { min-width: 84px; padding: 9px 16px; border: 1px solid #dfe4ed; border-radius: 18px; background: #fff; cursor: pointer; }
.tag-picker button.active { color: #fff; border-color: #409eff; background: #409eff; }
.custom-mirror { width: 330px; }
.os-mirror-line { align-items: flex-start; }
.custom-os-sources { display: grid; width: 520px; gap: 8px; margin-top: 10px; }
.os-mirror-tip { max-width: 620px; margin-top: 7px; line-height: 1.5; }
.advanced-options { width: 100%; margin-top: 16px; border-top: 1px solid #e7ebf1; }
.advanced-options ::v-deep .el-collapse-item__header { background: transparent; color: #4a5568; }
.advanced-line { min-height: 34px; }
.advanced-line .el-input { width: 420px; }
.list-option { width: 560px; }
.muted, .checksum { color: #9098a8; font-size: 12px; }
.preview-actions { display: flex; align-items: center; gap: 12px; margin-top: 18px; }
.preview-tabs pre { max-height: 430px; overflow: auto; padding: 16px; border-radius: 6px; background: #172033; color: #dfe8f7; line-height: 1.55; font-size: 12px; }
.preview-warning { margin-top: 8px; }
.profile-actions { display: flex; gap: 8px; margin-top: 14px; }
.diff-view { max-height: 480px; overflow: auto; padding: 14px; border-radius: 6px; background: #172033; color: #dfe8f7; font-size: 12px; line-height: 1.5; }
@media (max-width: 900px) { .build-profile { margin-left: 0; } .source-grid, .template-grid { grid-template-columns: 1fr; } .option-line { align-items: flex-start; flex-direction: column; } }
</style>
