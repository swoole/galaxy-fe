<template>
  <div class="resource-config-editor" :class="{ 'is-disabled': disabled }">
    <div class="template-heading">
      <div>
        <strong>资源模板</strong>
        <span class="template-hint">选择模板快速填写，也可以直接修改为自定义配置</span>
      </div>
      <el-tag v-if="activeTemplate === 'custom'" size="mini" type="info">自定义</el-tag>
    </div>

    <div class="template-grid">
      <button
        v-for="template in availableTemplates"
        :key="template.key"
        type="button"
        class="template-option"
        :class="{ active: activeTemplate === template.key }"
        :disabled="disabled"
        @click="applyTemplate(template)">
        <span class="template-name">{{ template.title }}</span>
        <span class="template-spec">{{ templateDescription(template) }}</span>
      </button>
      <button
        type="button"
        class="template-option custom-option"
        :class="{ active: activeTemplate === 'custom' }"
        :disabled="disabled"
        @click="focusFirstInput">
        <span class="template-name">自定义</span>
        <span class="template-spec">手动设置资源</span>
      </button>
    </div>

    <div class="resource-fields" :class="{ 'limits-only': !showReservations }">
      <div v-if="showReservations" class="resource-field">
        <label>
          CPU 预留
          <el-tooltip content="用于调度时预分配资源。设置过高可能导致工作负载无法调度。" placement="top">
            <i class="el-icon-question"></i>
          </el-tooltip>
        </label>
        <el-input-number
          ref="firstInput"
          :value="normalized.cpu_reservation"
          :disabled="disabled"
          :min="0"
          :max="reservationCpuMax"
          :step="0.1"
          :precision="2"
          controls-position="right"
          @input="updateField('cpu_reservation', $event)" />
        <span class="field-unit">核</span>
      </div>
      <div class="resource-field">
        <label>
          CPU 限制
          <el-tooltip content="容器可使用的 CPU 上限；0 表示不限制。" placement="top">
            <i class="el-icon-question"></i>
          </el-tooltip>
        </label>
        <el-input-number
          :value="normalized.cpu_limit"
          :disabled="disabled"
          :min="limitCpuMin"
          :max="maxCpu"
          :step="0.1"
          :precision="2"
          controls-position="right"
          @input="updateField('cpu_limit', $event)" />
        <span class="field-unit">核</span>
      </div>
      <div v-if="showReservations" class="resource-field">
        <label>
          内存预留
          <el-tooltip content="用于调度时预分配资源，建议根据稳定运行后的实际使用量调整。" placement="top">
            <i class="el-icon-question"></i>
          </el-tooltip>
        </label>
        <el-input-number
          :value="normalized.memory_reservation"
          :disabled="disabled"
          :min="0"
          :max="reservationMemoryMax"
          :step="64"
          :precision="0"
          controls-position="right"
          @input="updateField('memory_reservation', $event)" />
        <span class="field-unit">MiB</span>
      </div>
      <div class="resource-field">
        <label>
          内存限制
          <el-tooltip content="容器可使用的内存上限；0 表示不限制。" placement="top">
            <i class="el-icon-question"></i>
          </el-tooltip>
        </label>
        <el-input-number
          :value="normalized.memory_limit"
          :disabled="disabled"
          :min="limitMemoryMin"
          :max="maxMemory"
          :step="64"
          :precision="0"
          controls-position="right"
          @input="updateField('memory_limit', $event)" />
        <span class="field-unit">MiB</span>
      </div>
    </div>
  </div>
</template>

<script>
const DEFAULT_TEMPLATES = [
  {
    key: 'unlimited',
    title: '不限制',
    cpu_limit: 0,
    memory_limit: 0,
    cpu_reservation: 0,
    memory_reservation: 0
  },
  {
    key: 'light',
    title: '轻量',
    cpu_limit: 0.5,
    memory_limit: 512,
    cpu_reservation: 0.1,
    memory_reservation: 128
  },
  {
    key: 'standard',
    title: '标准',
    cpu_limit: 1,
    memory_limit: 1024,
    cpu_reservation: 0.25,
    memory_reservation: 256
  },
  {
    key: 'medium',
    title: '中型',
    cpu_limit: 2,
    memory_limit: 2048,
    cpu_reservation: 0.5,
    memory_reservation: 512
  },
  {
    key: 'performance',
    title: '高性能',
    cpu_limit: 4,
    memory_limit: 4096,
    cpu_reservation: 1,
    memory_reservation: 1024
  }
]

const number = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default {
  name: 'ResourceConfigEditor',
  model: { prop: 'value', event: 'input' },
  props: {
    value: { type: Object, default: () => ({}) },
    disabled: { type: Boolean, default: false },
    showReservations: { type: Boolean, default: true },
    allowUnlimited: { type: Boolean, default: true },
    minCpu: { type: Number, default: 0 },
    maxCpu: { type: Number, default: 256 },
    minMemory: { type: Number, default: 0 },
    maxMemory: { type: Number, default: 1048576 },
    templates: { type: Array, default: () => DEFAULT_TEMPLATES }
  },
  computed: {
    normalized () {
      return {
        cpu_limit: number(this.value.cpu_limit),
        memory_limit: number(this.value.memory_limit),
        cpu_reservation: number(this.value.cpu_reservation),
        memory_reservation: number(this.value.memory_reservation)
      }
    },
    limitCpuMin () {
      return this.allowUnlimited ? 0 : Math.max(0.01, this.minCpu)
    },
    limitMemoryMin () {
      return this.allowUnlimited ? 0 : Math.max(1, this.minMemory)
    },
    reservationCpuMax () {
      return this.normalized.cpu_limit > 0 ? this.normalized.cpu_limit : this.maxCpu
    },
    reservationMemoryMax () {
      return this.normalized.memory_limit > 0 ? this.normalized.memory_limit : this.maxMemory
    },
    availableTemplates () {
      return this.templates.filter(template => {
        if (!this.allowUnlimited && (!number(template.cpu_limit) || !number(template.memory_limit))) return false
        return number(template.cpu_limit) >= this.limitCpuMin &&
          number(template.cpu_limit) <= this.maxCpu &&
          number(template.memory_limit) >= this.limitMemoryMin &&
          number(template.memory_limit) <= this.maxMemory
      })
    },
    activeTemplate () {
      const fields = this.showReservations
        ? ['cpu_limit', 'memory_limit', 'cpu_reservation', 'memory_reservation']
        : ['cpu_limit', 'memory_limit']
      const matched = this.availableTemplates.find(template => fields.every(
        field => number(template[field]) === number(this.normalized[field])
      ))
      return matched ? matched.key : 'custom'
    }
  },
  methods: {
    templateDescription (template) {
      if (!number(template.cpu_limit) && !number(template.memory_limit)) return '不设置上限'
      return `${number(template.cpu_limit)} 核 · ${number(template.memory_limit)} MiB`
    },
    applyTemplate (template) {
      if (this.disabled) return
      this.$emit('input', {
        cpu_limit: number(template.cpu_limit),
        memory_limit: number(template.memory_limit),
        cpu_reservation: this.showReservations ? number(template.cpu_reservation) : this.normalized.cpu_reservation,
        memory_reservation: this.showReservations ? number(template.memory_reservation) : this.normalized.memory_reservation
      })
      this.$emit('template-change', template.key)
    },
    updateField (field, value) {
      const next = Object.assign({}, this.normalized, { [field]: number(value) })
      if (field === 'cpu_limit' && next.cpu_limit > 0 && next.cpu_reservation > next.cpu_limit) {
        next.cpu_reservation = next.cpu_limit
      }
      if (field === 'memory_limit' && next.memory_limit > 0 && next.memory_reservation > next.memory_limit) {
        next.memory_reservation = next.memory_limit
      }
      if (field === 'cpu_reservation' && next.cpu_limit > 0) {
        next.cpu_reservation = Math.min(next.cpu_reservation, next.cpu_limit)
      }
      if (field === 'memory_reservation' && next.memory_limit > 0) {
        next.memory_reservation = Math.min(next.memory_reservation, next.memory_limit)
      }
      this.$emit('input', next)
      this.$emit('template-change', 'custom')
    },
    focusFirstInput () {
      this.$nextTick(() => {
        const input = this.$refs.firstInput
        if (input && input.focus) input.focus()
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.resource-config-editor {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafbfd;
}
.template-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.template-heading strong { color: #303133; font-size: 14px; }
.template-hint { margin-left: 10px; color: #909399; font-size: 12px; }
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
}
.template-option {
  min-width: 0;
  padding: 10px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  color: #606266;
  background: #fff;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.template-option:hover { border-color: #409eff; }
.template-option.active { border-color: #409eff; color: #409eff; background: #ecf5ff; box-shadow: 0 0 0 1px #409eff inset; }
.template-option:disabled { cursor: not-allowed; opacity: .6; }
.template-name, .template-spec { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.template-name { font-size: 13px; font-weight: 600; }
.template-spec { margin-top: 5px; color: #909399; font-size: 11px; font-weight: 400; }
.resource-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 22px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}
.resource-fields.limits-only { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.resource-field {
  display: grid;
  grid-template-columns: 100px minmax(130px, 1fr) 36px;
  align-items: center;
  gap: 8px;
}
.resource-field label { color: #606266; font-size: 13px; white-space: nowrap; }
.resource-field label i { margin-left: 3px; color: #a8abb2; }
.resource-field .el-input-number { width: 100%; }
.field-unit { color: #909399; font-size: 12px; }
@media (max-width: 720px) {
  .resource-fields, .resource-fields.limits-only { grid-template-columns: 1fr; }
}
</style>
