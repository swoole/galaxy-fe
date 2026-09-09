<template>
  <div class="header">
    <div class="logo">
      <img :src="logo" alt="logo">
    </div>
    <div class="desc">
      <span class="slogan">
        {{ settings.slogan }}
      </span>
    </div>
  </div>
</template>

<script>
import Logo from '@/assets/img/logo.png'
import settings from '../../../settings'

export default {
  name: 'ProjectLoginHeader',
  data () {
    return {
      logo: Logo,
      settings
    }
  }
}
</script>

<style lang="scss" scoped>
.header {
  padding-bottom: 30px;
  text-align: center;
  .logo {
    height: 50px;
    img {
      width: 200px;
      display: block;
      margin: 5px auto 15px;
    }
  }
  .desc {
    font-size: 13px;
    color: #909399;
    text-align: center;
  }
}
</style>
