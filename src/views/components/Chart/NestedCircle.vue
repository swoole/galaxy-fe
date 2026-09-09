<template>
  <div></div>
</template>

<script>
import * as echarts from 'echarts'

const DEFAULT_INNET = {
  name: '',
  selectedMode: 'single',
  radius: [0, '30%'],
  label: {
    position: 'inner',
    fontSize: 14
  },
  labelLine: {
    show: false
  }
}
const DEFAULT_OUTTER = {
  name: '',
  radius: ['45%', '60%'],
  labelLine: {
    length: 30
  },
  label: {
    formatter: '  {b|{b}：}{c}  {per|{d}%}  ',
    backgroundColor: '#F6F8FC',
    borderColor: '#8C8D8E',
    borderWidth: 1,
    borderRadius: 4,
    rich: {
      b: {
        color: '#4C5058',
        fontSize: 14,
        fontWeight: 'bold',
        lineHeight: 33
      },
      per: {
        color: '#fff',
        backgroundColor: '#4C5058',
        padding: [3, 4],
        borderRadius: 4
      }
    }
  }
}

export default {
  name: 'ChartNestedCircle',
  props: {
    title: {
      type: [String, Object],
      default: null
    },
    tooltip: {
      type: [String, Function],
      default: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      type: [Array, String],
      default: 'auto'
    },
    dataInner: {
      type: Array,
      default: () => [{ value: 1, name: 'label', selected: true }]
    },
    dataOutter: {
      type: Array,
      default: () => [{ value: 2, name: 'label' }]
    },
    optionsInner: {
      type: Object,
      default: () => {
        return Object.assign({}, DEFAULT_INNET)
      }
    },
    optionsOutter: {
      type: Object,
      default: () => {
        return Object.assign({}, DEFAULT_OUTTER)
      }
    }
  },
  data () {
    return {
      chart: null
    }
  },
  watch: {
    $props: {
      handler () {
        this.setOptions()
      },
      deep: true
    }
  },
  mounted () {
    this.initChart()
    this.setOptions()
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.handleResize)
    if (!this.chart) {
      return
    }
    this.chart.dispose()
    this.chart = null
  },
  methods: {
    initChart () {
      this.chart = echarts.init(this.$el, 'macarons')
    },
    setOptions () {
      if (!this.chart) {
        return
      }
      const options = {
        tooltip: {
          trigger: 'item',
          formatter: this.tooltip
        },
        series: [
          Object.assign({}, DEFAULT_INNET, {
            type: 'pie',
            data: this.dataInner
          }, this.optionsInner),
          Object.assign({}, DEFAULT_OUTTER, {
            type: 'pie',
            data: this.dataOutter
          }, this.optionsOutter)
        ]
      }

      // legend组装
      let legend = this.legend
      if (this.legend == 'auto') {
        legend = []
        this.dataInner.forEach(item => {
          if (legend.indexOf(item.name) == -1) {
            legend.push(item.name)
          }
        })
        this.dataOutter.forEach(item => {
          if (legend.indexOf(item.name) == -1) {
            legend.push(item.name)
          }
        })
      }
      if (typeof legend == 'object' && legend.length > 0) {
        options.legend = {
          data: legend
        }
      }

      // title组装
      if (this.title) {
        let title = {}
        if (typeof this.title == 'string') {
          title = { text: this.title }
        } else {
          title = this.title
        }
        options.title = title
      }

      this.chart.setOption(options)
    },
    handleResize () {
      if (this.chart) {
        this.chart.resize()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
