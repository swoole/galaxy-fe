<template>
  <header class="header">
    <!-- <el-alert
      class="header-notice"
      title="消息提示的文案"
      type="success"
      show-icon>
    </el-alert> -->
    <div class="header-line">
      <logo />
      <navbar />
      <space />
    </div>
  </header>
</template>

<script>
import Logo from './Logo'
import Navbar from './Navbar'
import Space from './Space'

export default {
  name: 'Header',
  components: {
    Logo, Navbar, Space
  },
  data () {
    return {

    }
  }
}
</script>

<style lang="scss" scoped>
.header-line {
  display: flex;
  height: 48px;
  line-height: 48px;
  background: #2D384B;
}
</style>
