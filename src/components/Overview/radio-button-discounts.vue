<template>
  <my-radio-button class="discounts-radio-button" :label="label" :disabled="disabled" :name="name">
    <slot></slot>
    <template #inner v-if="discounts != 10">
      <span class="discounts-badge">{{ discounts | formatDiscounts }}折</span>
    </template>
  </my-radio-button>
</template>
<script>
import MyRadioButton from './radio-button'

export default {
  name: 'RadioButtonDiscounts',
  components: {
    MyRadioButton
  },

  props: {
    label: {},
    disabled: Boolean,
    name: String,
    discounts: {
      type: Number,
      required: true
    }
  },
  filters: {
    formatDiscounts (discounts) {
      const show = parseInt(discounts * 10)
      return show % 10 == 0 ? discounts : show
    }
  }
}
</script>
<style lang="scss">
.discounts-radio-button {
  position: relative;
}
.discounts-badge {
  position: absolute;
  z-index: 2;
  right: -1px;
  top: -4px;

  background-color: #f56c6c;
  color: #fff;
  display: inline-block;
  font-size: 12px;
  transform: scale(.9);
  line-height: 1;
  padding: 0 4px;
  text-align: center;
}
</style>
