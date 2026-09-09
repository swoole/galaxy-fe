<template>
  <el-popover
    v-model="visible"
    :disabled="disabled"
    trigger="click"
    placement="bottom-start"
    popper-class="ns-selector-popper"
    :width="popoverWidth">
    <div
      slot="reference"
      class="ns-trigger"
      :class="{ 'is-active': visible, 'is-disabled': disabled }">
      <span class="ns-values">{{ currentLabel }}</span>
      <i class="ns-caret" :class="visible ? 'el-icon-arrow-up' : 'el-icon-arrow-down'" />
    </div>

    <div class="ns-menu" @click.stop>
      <div class="ns-controls">
        <el-input
          v-model="search"
          size="small"
          clearable
          class="ns-search"
          placeholder="筛选命名空间"
          prefix-icon="el-icon-search" />
        <button
          v-if="allowAggregate && value !== 'all'"
          type="button"
          class="ns-clear"
          title="清除命名空间过滤"
          @click="clear">×</button>
      </div>
      <div class="ns-divider" />

      <div class="ns-options">
        <template v-if="allowAggregate">
          <div
            v-for="opt in filters"
            :key="opt.id"
            class="ns-option"
            :class="{ selected: value === opt.id }"
            @click="select(opt.id)">
            <span class="ns-label">{{ opt.label }}</span>
            <i v-if="value === opt.id" class="el-icon-check" />
          </div>

          <div class="ns-divider" />
        </template>

        <div
          v-for="ns in filteredNamespaces"
          :key="ns.name"
          class="ns-option"
          :class="{ selected: value === 'ns:' + ns.name }"
          @click="select('ns:' + ns.name)">
          <i class="el-icon-folder ns-folder" />
          <span class="ns-label">{{ ns.name }}</span>
          <i v-if="value === 'ns:' + ns.name" class="el-icon-check" />
        </div>

        <div v-if="filteredNamespaces.length === 0" class="ns-empty">无匹配命名空间</div>
      </div>
    </div>
  </el-popover>
</template>

<script>
import { NAMESPACE_FILTERS } from '@/utils/k8sNamespace'

export default {
  name: 'NamespaceSelector',
  props: {
    // 当前选中的过滤值：all | all_user | all_system | namespaced_true | namespaced_false | ns:<name>
    value: { type: String, required: true },
    namespaces: { type: Array, default: () => [] },
    popoverWidth: { type: Number, default: 260 },
    allowAggregate: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false }
  },
  data () {
    return {
      visible: false,
      search: '',
      filters: NAMESPACE_FILTERS
    }
  },
  computed: {
    currentLabel () {
      if (this.value && this.value.indexOf('ns:') === 0) {
        return this.value.slice(3)
      }
      if (!this.allowAggregate) return '请选择命名空间'
      const opt = this.filters.find(f => f.id === this.value)
      return opt ? opt.label : 'All Namespaces'
    },
    sortedNamespaces () {
      return [...(this.namespaces || [])].sort((a, b) => String(a.name).localeCompare(String(b.name)))
    },
    filteredNamespaces () {
      const kw = this.search.trim().toLowerCase()
      if (!kw) return this.sortedNamespaces
      return this.sortedNamespaces.filter(ns => String(ns.name).toLowerCase().includes(kw))
    }
  },
  methods: {
    select (id) {
      this.$emit('input', id)
      this.$emit('change', id)
      this.visible = false
      this.search = ''
    },
    clear () {
      this.$emit('input', 'all')
      this.$emit('change', 'all')
      this.visible = false
      this.search = ''
    }
  }
}
</script>

<style lang="scss" scoped>
.ns-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 210px;
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
  color: #606266;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  box-sizing: border-box;
  &:hover { border-color: #c0c4cc; }
  &.is-active { border-color: #409eff; }
  &.is-disabled {
    color: #c0c4cc;
    background: #f5f7fa;
    border-color: #e4e7ed;
    cursor: not-allowed;
  }
  .ns-values { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ns-caret { color: #c0c4cc; font-size: 12px; }
}
.ns-menu { font-size: 13px; color: #606266; }
.ns-controls { display: flex; align-items: center; gap: 6px; }
.ns-search { flex: 1; }
.ns-clear {
  flex: none;
  width: 28px;
  height: 28px;
  font-size: 18px;
  line-height: 1;
  color: #909399;
  background: #f4f4f5;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover { color: #f56c6c; }
}
.ns-divider { height: 1px; margin: 6px 0; background: #ebeef5; }
.ns-options { max-height: 320px; overflow-y: auto; }
.ns-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  border-radius: 4px;
  cursor: pointer;
  &:hover { background: #f5f7fa; }
  &.selected { color: #409eff; font-weight: 600; background: #ecf5ff; }
  .ns-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ns-folder { color: #e6a23c; }
  .el-icon-check { color: #409eff; }
}
.ns-empty { padding: 12px 8px; color: #909399; text-align: center; }
</style>

<style lang="scss">
.ns-selector-popper {
  padding: 8px !important;
}
</style>
