<template>
  <el-dialog
    :title="title"
    :visible="visible"
    width="680px"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @open="reset"
    @opened="loadSelectors"
    @close="close">
    <el-form label-width="110px">
      <div
        v-for="(item, index) in draft"
        :key="item.key || item.name || index"
        class="image-editor">
        <el-divider v-if="draft.length > 1" content-position="left">
          {{ item.name || `容器 ${index + 1}` }}
        </el-divider>
        <image-reference-selector
          ref="selectors"
          v-model="item.image"
          :org-id="orgId"
          :cluster-id="clusterId"
          :load-local-images="loadLocalImages"
          @registry-change="item.registryId = $event" />
      </div>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        :title="notice" />
    </el-form>
    <div slot="footer">
      <el-button :disabled="saving" @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">{{ confirmText }}</el-button>
    </div>
  </el-dialog>
</template>

<script>
import ImageReferenceSelector from '@/views/cluster/swarm/components/ImageReferenceSelector.vue'

export default {
  name: 'WorkloadImageDialog',
  components: { ImageReferenceSelector },
  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, required: true },
    images: { type: Array, default: () => [] },
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    saving: { type: Boolean, default: false },
    loadLocalImages: { type: Boolean, default: true },
    notice: { type: String, required: true },
    confirmText: { type: String, default: '拉取并更新' }
  },
  data () {
    return { draft: [] }
  },
  methods: {
    reset () {
      this.draft = (this.images || []).map((item, index) => ({
        key: item.key || item.name || String(index),
        name: item.name || '',
        image: item.image || '',
        registryId: Number(item.registryId || 0)
      }))
    },
    loadSelectors () {
      const selectors = Array.isArray(this.$refs.selectors)
        ? this.$refs.selectors
        : [this.$refs.selectors].filter(Boolean)
      selectors.forEach((selector, index) => selector.load(this.draft[index]?.image || ''))
    },
    close () {
      if (this.saving) return
      this.$emit('update:visible', false)
    },
    submit () {
      const missing = this.draft.find(item => !String(item.image || '').trim())
      if (missing) {
        this.$message.warning(`${missing.name || '容器'}：请输入镜像名称`)
        return
      }
      this.$emit('submit', this.draft.map(item => ({
        key: item.key,
        name: item.name,
        image: String(item.image).trim(),
        registryId: Number(item.registryId || 0)
      })))
    }
  }
}
</script>

<style lang="scss" scoped>
.image-editor + .image-editor { margin-top: 18px; }
.image-editor ::v-deep .el-divider__text { color: #606266; font-size: 13px; font-weight: 500; }
</style>
