<template>
  <div class="agent-command-block">
    <code>{{ value }}</code>
    <el-button size="mini" icon="el-icon-document-copy" @click="$emit('copy', value)">复制</el-button>
  </div>
</template>

<script>
export default {
  name: 'AgentCommandBlock',
  props: {
    value: {
      type: String,
      required: true
    }
  }
}
</script>

<style lang="scss" scoped>
.agent-command-block {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 10px;
  code {
    display: block;
    flex: 1;
    box-sizing: border-box;
    height: auto;
    min-height: 40px;
    min-width: 0;
    margin: 0;
    padding: 10px 12px;
    border-radius: 6px;
    background: #18212f;
    color: #e5edf7;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    line-height: 1.45;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
    user-select: all;
  }
  .el-button {
    flex: 0 0 auto;
    margin-top: 4px;
  }
}
</style>
