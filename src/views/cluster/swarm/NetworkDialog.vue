<template>
  <el-dialog
    title="编辑网络"
    :visible.sync="show"
    width="560px"
    @close="resetForm"
    :close-on-click-modal="false">
    <el-form ref="form" :model="form" label-width="100px" size="small">
      <el-form-item label="名称">
        <el-input :value="network ? network.name : ''" disabled />
      </el-form-item>
      <el-form-item label="Driver">
        <el-input :value="network ? network.driver : ''" disabled />
      </el-form-item>
      <el-form-item label="可附加">
        <el-switch v-model="form.attachable" />
        <span class="form-hint">允许独立容器连接到此网络</span>
      </el-form-item>
      <el-form-item label="内部网络">
        <el-switch v-model="form.internal" />
        <span class="form-hint">仅限容器间通信，不可访问外网</span>
      </el-form-item>
      <el-form-item label="标签">
        <div class="labels-editor">
          <div v-for="(item, idx) in form.labels" :key="idx" class="label-row">
            <el-input v-model="item.key" placeholder="键" class="label-key" />
            <el-input v-model="item.value" placeholder="值" class="label-value" />
            <el-button type="text" icon="el-icon-delete" class="text-danger" @click="removeLabel(idx)" />
          </div>
          <el-button type="text" icon="el-icon-plus" @click="addLabel">添加标签</el-button>
        </div>
      </el-form-item>
    </el-form>

    <div slot="footer" class="dialog-footer">
      <el-button size="small" @click="show = false">取消</el-button>
      <el-button size="small" type="primary" :loading="saving" @click="save">保存</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { clusterSwarmNetworkUpdate } from '@/api/cluster'

const emptyForm = () => ({ attachable: false, internal: false, labels: [] })

export default {
  name: 'NetworkDialog',
  props: {
    visible: { type: Boolean, default: false },
    network: { type: Object, default: null },
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true }
  },
  data () {
    return {
      saving: false,
      form: emptyForm()
    }
  },
  computed: {
    show: {
      get () { return this.visible },
      set (val) { this.$emit('update:visible', val) }
    }
  },
  watch: {
    visible (val) {
      if (val) this.populate()
    }
  },
  methods: {
    populate () {
      const n = this.network || {}
      this.form.attachable = !!n.attachable
      this.form.internal = !!n.internal
      const labels = n.labels || {}
      this.form.labels = Object.keys(labels).map(k => ({
        key: k,
        value: labels[k] == null ? '' : String(labels[k])
      }))
    },
    addLabel () {
      this.form.labels.push({ key: '', value: '' })
    },
    removeLabel (idx) {
      this.form.labels.splice(idx, 1)
    },
    buildLabels () {
      const map = {}
      this.form.labels.forEach(l => {
        const k = (l.key || '').trim()
        if (k) map[k] = l.value
      })
      return map
    },
    async save () {
      if (!this.network) return
      this.saving = true
      const payload = {
        attachable: this.form.attachable,
        internal: this.form.internal,
        labels: this.buildLabels()
      }
      try {
        await clusterSwarmNetworkUpdate(this.orgId, this.clusterId, this.network.id, payload)
        this.$message.success('网络已更新')
        this.$emit('saved')
      } catch (err) {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '更新失败')
      } finally {
        this.saving = false
      }
    },
    resetForm () {
      this.form = emptyForm()
    }
  }
}
</script>

<style lang="scss" scoped>
.form-hint {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}
.labels-editor {
  .label-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .label-key { width: 45%; }
  .label-value { width: 45%; }
}
</style>
