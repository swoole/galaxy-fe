<template>
  <div>
    <div v-for="(row, index) in rows" :key="index" class="header-row">
      <el-input v-model.trim="row.name" placeholder="Header 名称" @input="emit" />
      <el-input v-model="row.value" placeholder="Header 值" @input="emit" />
      <el-button icon="el-icon-delete" @click="remove(index)" />
    </div>
    <el-button size="mini" icon="el-icon-plus" @click="add">添加 Header</el-button>
  </div>
</template>

<script>
export default {
  name: 'HeaderEditor',
  props: { value: { type: Object, default: () => ({}) } },
  data () { return { rows: Object.entries(this.value || {}).map(([name, value]) => ({ name, value })) } },
  watch: {
    value (value) { this.rows = Object.entries(value || {}).map(([name, item]) => ({ name, value: item })) }
  },
  methods: {
    add () { this.rows.push({ name: '', value: '' }) },
    remove (index) { this.rows.splice(index, 1); this.emit() },
    emit () { this.$emit('input', this.rows.reduce((result, row) => { if (row.name) result[row.name] = row.value || ''; return result }, {})) }
  }
}
</script>

<style scoped>
.header-row { display:grid; grid-template-columns:1fr 2fr 42px; gap:8px; margin-bottom:8px; }
</style>
