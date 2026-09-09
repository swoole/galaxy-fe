<template>
  <span>
    <span class="hidden-token">{{ showToken }}</span>
    <el-tag v-if="hiddenToken" type="warning" size="mini" class="btn" @click="hiddenToken = false">显示</el-tag>
    <el-tag v-if="!hiddenToken" type="primary" size="mini" class="btn" @click="hiddenToken = true">隐藏</el-tag>
  </span>
</template>

<script>
export default {
  name: 'HiddenToken',
  props: {
    token: {
      type: String,
      required: true
    },
    before: {
      type: Number,
      default: 4
    },
    after: {
      type: Number,
      default: 4
    }
  },
  data () {
    return {
      hiddenToken: false
    }
  },
  computed: {
    showToken () {
      if (!this.hiddenToken) {
        return this.token
      }
      return this.token.split('').map((char, index) => {
        if (index >= this.before && index <= this.token.length - (this.after + 1)) {
          return '*'
        } else {
          return char
        }
      }).join('')
    }
  },
  created () {
    this.hiddenToken = true
  }
}
</script>

<style lang="scss" scoped>
.hidden-token {
  font-family: Consolas,"Courier New",Courier,FreeMono,monospace;
  display: inline-block;
  font-size: 16px;
}
.btn {
  cursor: pointer;
  margin-left: 5px;
}
</style>
