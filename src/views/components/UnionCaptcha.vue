<template>
  <el-dialog
    title="安全验证"
    width="400px"
    :close-on-click-modal="false"
    :visible.sync="dialogVisible"
    @closed="handleClosed">
    <div class="slider-captcha">
      <p class="slider-captcha__hint">请按住滑块，拖动到最右侧</p>
      <div
        ref="track"
        class="slider-captcha__track"
        :class="{ 'is-loading': loading, 'is-verified': verified }">
        <div class="slider-captcha__progress" :style="{ width: progressWidth }" />
        <span class="slider-captcha__text">{{ statusText }}</span>
        <button
          class="slider-captcha__handle"
          type="button"
          :disabled="loading || verified"
          :style="{ transform: `translateX(${offset}px)` }"
          aria-label="拖动滑块完成安全验证"
          @mousedown.prevent="startDrag"
          @touchstart.prevent="startDrag">
          <i :class="verified ? 'el-icon-check' : 'el-icon-d-arrow-right'" />
        </button>
      </div>
      <button class="slider-captcha__refresh" type="button" :disabled="loading" @click="loadChallenge">
        <i class="el-icon-refresh" /> 重新验证
      </button>
    </div>
  </el-dialog>
</template>

<script>
import { getSliderCaptcha, verifySliderCaptcha } from '@/api/auth'

const TRAIL_SCALE = 1000

export default {
  name: 'UnionCaptcha',
  data () {
    return {
      dialogVisible: false,
      loading: false,
      dragging: false,
      verified: false,
      challengeId: null,
      offset: 0,
      maxOffset: 0,
      startX: 0,
      startAt: 0,
      trail: [],
      successHandler: null,
      errorMessage: ''
    }
  },
  computed: {
    progressWidth () {
      return `${this.offset + 44}px`
    },
    statusText () {
      if (this.loading) return '正在准备验证...'
      if (this.verified) return '验证通过'
      if (this.errorMessage) return this.errorMessage
      return '向右拖动滑块'
    }
  },
  mounted () {
    this.$emit('ready', true)
  },
  beforeDestroy () {
    this.removeDragListeners()
  },
  methods: {
    execute (cb) {
      this.successHandler = cb
      this.$emit('executing', true)
      this.dialogVisible = true
      this.$nextTick(this.loadChallenge)
    },
    async loadChallenge () {
      this.removeDragListeners()
      this.resetSlider()
      this.loading = true
      try {
        const res = await getSliderCaptcha()
        this.challengeId = res.data.captchaid
        this.$nextTick(() => {
          const track = this.$refs.track
          this.maxOffset = track ? Math.max(track.clientWidth - 44, 0) : 0
        })
      } catch (error) {
        this.errorMessage = '验证加载失败，请重试'
      } finally {
        this.loading = false
      }
    },
    startDrag (event) {
      if (!this.challengeId || this.loading || this.verified) return
      this.dragging = true
      this.errorMessage = ''
      this.startX = this.getClientX(event) - this.offset
      this.startAt = Date.now()
      this.trail = [{ x: this.normalizedOffset(), t: 0 }]
      document.addEventListener('mousemove', this.moveDrag)
      document.addEventListener('mouseup', this.endDrag)
      document.addEventListener('touchmove', this.moveDrag, { passive: false })
      document.addEventListener('touchend', this.endDrag)
    },
    moveDrag (event) {
      if (!this.dragging) return
      if (event.cancelable) event.preventDefault()
      const nextOffset = this.getClientX(event) - this.startX
      this.offset = Math.min(Math.max(nextOffset, 0), this.maxOffset)
      this.recordTrail()
    },
    endDrag () {
      if (!this.dragging) return
      this.dragging = false
      this.removeDragListeners()
      this.recordTrail(true)
      const duration = Date.now() - this.startAt
      if (this.normalizedOffset() < 980 || duration < 350) {
        this.errorMessage = '请完整拖动滑块'
        this.offset = 0
        return
      }
      this.submitTrail(duration)
    },
    async submitTrail (duration) {
      this.loading = true
      try {
        const res = await verifySliderCaptcha({
          captchaid: this.challengeId,
          distance: this.normalizedOffset(),
          duration,
          trail: this.trail
        })
        this.verified = true
        const successHandler = this.successHandler
        window.setTimeout(() => {
          this.dialogVisible = false
          if (successHandler) successHandler({ token: res.data.token, captcha: null, captchaid: null })
        }, 250)
      } catch (error) {
        await this.loadChallenge()
        if (this.challengeId) this.errorMessage = '验证失败，请重新拖动'
      } finally {
        this.loading = false
      }
    },
    recordTrail (force = false) {
      const elapsed = Date.now() - this.startAt
      const previous = this.trail[this.trail.length - 1]
      if (!force && previous && elapsed - previous.t < 16) return
      if (this.trail.length >= 100) {
        if (force) this.trail.splice(99, 1, { x: this.normalizedOffset(), t: elapsed })
        return
      }
      this.trail.push({ x: this.normalizedOffset(), t: elapsed })
    },
    normalizedOffset () {
      if (!this.maxOffset) return 0
      return Math.round((this.offset / this.maxOffset) * TRAIL_SCALE)
    },
    getClientX (event) {
      const touch = event.touches && event.touches[0]
      return touch ? touch.clientX : event.clientX
    },
    removeDragListeners () {
      document.removeEventListener('mousemove', this.moveDrag)
      document.removeEventListener('mouseup', this.endDrag)
      document.removeEventListener('touchmove', this.moveDrag)
      document.removeEventListener('touchend', this.endDrag)
    },
    resetSlider () {
      this.dragging = false
      this.verified = false
      this.challengeId = null
      this.offset = 0
      this.startAt = 0
      this.trail = []
      this.errorMessage = ''
    },
    handleClosed () {
      this.removeDragListeners()
      this.resetSlider()
      this.$emit('executing', false)
    }
  }
}
</script>

<style lang="scss" scoped>
.slider-captcha {
  padding: 4px 0 8px;

  &__hint {
    margin: 0 0 16px;
    color: #606266;
    text-align: center;
  }

  &__track {
    position: relative;
    height: 44px;
    overflow: hidden;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background: #f5f7fa;
    user-select: none;

    &.is-loading { opacity: .65; }
    &.is-verified { border-color: #67c23a; }
  }

  &__progress {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 44px;
    background: #ecf5ff;
  }

  &__text {
    position: absolute;
    width: 100%;
    line-height: 44px;
    color: #909399;
    text-align: center;
  }

  &__handle {
    position: absolute;
    top: -1px;
    left: -1px;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background: #fff;
    color: #409eff;
    cursor: grab;
    font-size: 18px;
    touch-action: none;

    &:disabled { cursor: default; }
  }

  .is-verified &__handle {
    border-color: #67c23a;
    background: #67c23a;
    color: #fff;
  }

  &__refresh {
    display: block;
    margin: 12px auto 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #409eff;
    cursor: pointer;

    &:disabled { color: #c0c4cc; }
  }
}
</style>
