<template>
  <div class="app-layout-wrapper">
    <app-header ref="header" class="app-layout-header" />
    <section class="app-layout-main" :style="{ paddingTop: mainPaddingTop }">
      <router-view :key="routerKey" :paddingTop="mainPaddingTop" />
    </section>
  </div>
</template>

<script>
import AppHeader from './components/header'

export default {
  name: 'Layout',
  components: {
    AppHeader
  },
  data () {
    return {
      mainPaddingTop: '48px'
    }
  },
  computed: {
    routerKey () {
      return (this.$route.meta && this.$route.meta.nav ? this.$route.meta.nav : this.$route.fullPath) + `?_t=${this.$route.query._t || ''}`
    }
  },
  mounted () {
    this.$nextTick(() => {
      this.calcuMainPaddingTop()
    })
  },
  methods: {
    calcuMainPaddingTop () {
      this.mainPaddingTop = this.$refs.header.$el.offsetHeight + 'px'
    }
  }
}
</script>

<style lang="scss" scoped>
@use "~@/styles/mixin.scss" as *;
@use "~@/styles/variables.scss" as *;

.app-layout-wrapper {
  @include clearfix;
  position: relative;
  width: 100%;
  height: 100%;
  .app-layout-header {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    z-index: 9;
  }
  .app-layout-main {
    padding-top: 48px;
  }
}
</style>
