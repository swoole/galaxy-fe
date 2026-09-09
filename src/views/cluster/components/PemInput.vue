<template>
  <el-form-item :label="label" :prop="prop">
    <div class="pem-toolbar">
      <el-button size="mini" icon="el-icon-folder-opened" @click="$emit('select-file')">读取本地文件</el-button>
      <span>文件内容不会保存在浏览器中</span>
    </div>
    <el-input
      :value="value"
      type="textarea"
      :rows="6"
      resize="vertical"
      autocomplete="off"
      spellcheck="false"
      :placeholder="placeholder"
      @input="$emit('input', $event)" />
  </el-form-item>
</template>

<script>
export default {
  name: 'PemInput',
  props: {
    value: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      required: true
    },
    prop: {
      type: String,
      required: true
    },
    placeholder: {
      type: String,
      default: ''
    }
  }
}
</script>

<style lang="scss" scoped>
.pem-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  color: #909399;
  font-size: 12px;
}
::v-deep textarea {
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
}
</style>
