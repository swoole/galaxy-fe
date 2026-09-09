<template>
  <div class="kv-editor">
    <div v-for="(row, index) in rows" :key="index" class="kv-row">
      <el-input
        v-model="row.key"
        size="small"
        class="kv-key"
        placeholder="键"
        @input="emitChange" />
      <el-input
        v-model="row.value"
        size="small"
        class="kv-value"
        :type="valueType === 'textarea' ? 'textarea' : 'text'"
        :rows="valueType === 'textarea' ? 3 : 1"
        :show-password="valueType === 'password'"
        :placeholder="valueType === 'password' ? '密文值' : '值'"
        @input="emitChange" />
      <el-button type="text" size="small" icon="el-icon-delete" class="kv-remove" @click="removeRow(index)" />
    </div>
    <el-button type="text" size="small" icon="el-icon-plus" @click="addRow">添加一行</el-button>
  </div>
</template>

<script>
export default {
  name: 'KeyValueEditor',
  props: {
    value: { type: Array, default: () => [] },
    valueType: { type: String, default: 'text' }
  },
  data () {
    return { rows: [] }
  },
  watch: {
    value: {
      immediate: true,
      handler (val) {
        this.rows = Array.isArray(val) ? val.map(item => ({ key: item.key, value: item.value })) : []
      }
    }
  },
  methods: {
    addRow () {
      this.rows.push({ key: '', value: '' })
      this.emitChange()
    },
    removeRow (index) {
      this.rows.splice(index, 1)
      this.emitChange()
    },
    emitChange () {
      this.$emit('input', this.rows.map(row => ({ key: row.key, value: row.value })))
    }
  }
}
</script>

<style lang="scss" scoped>
.kv-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
.kv-key { width: 240px; flex: none; }
.kv-value { flex: 1; }
.kv-remove { color: #f56c6c; padding: 0 6px; }
</style>
