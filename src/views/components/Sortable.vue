<template>
  <span
    class="sortable not-select"
    :class="{ ascending: order == asc ,descending: order == desc }"
    @click="handleSort">
    <slot>{{ label }}</slot>
    <span class="caret-wrapper">
      <i class="sort-caret ascending"></i>
      <i class="sort-caret descending"></i>
    </span>
  </span>
</template>

<script>
export default {
  name: 'Sortable',
  props: {
    field: {
      type: String,
      required: true
    },
    label: {
      type: String,
      default: null
    },
    asc: {
      type: String,
      default: 'asc'
    },
    desc: {
      type: String,
      default: 'desc'
    }
  },
  data () {
    return {
      order: null
    }
  },
  methods: {
    handleSort () {
      switch (this.order) {
        case this.asc:
          this.order = this.desc
          break
        case this.desc:
          this.order = null
          break
        case null:
        default:
          this.order = this.asc
      }
      this.$emit('sort', this.field, this.order)
    }
  }
}
</script>

<style lang="scss" scoped>
.sortable {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  cursor: pointer;
  &:hover {
    color: #409eff;
  }
  &.ascending {
    .sort-caret.ascending {
      border-bottom-color: #409eff;
    }
  }
  &.descending {
    .sort-caret.descending {
      border-top-color: #409eff;
    }
  }
  .caret-wrapper {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    height: 34px;
    width: 24px;
    vertical-align: middle;
    cursor: pointer;
    overflow: initial;
    position: relative;
  }
  .sort-caret {
    width: 0;
    height: 0;
    border: 5px solid transparent;
    position: absolute;
    left: 7px;
    &.ascending {
      border-bottom-color: #c0c4cc;
      top: 5px;
    }
    &.descending {
      border-top-color: #c0c4cc;
      bottom: 7px;
    }
  }
}
</style>
