<template>
  <div
    :class="className"
    :style="{height: height, width: width}"
  />
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'GaugeChart',
  props: {
    chartData: {
      type: Number,
      required: true
    },
    className: {
      type: String,
      default: 'chart'
    },
    width: {
      type: String,
      default: '100%'
    },
    height: {
      type: String,
      default: '320px'
    },
    name: {
      type: String,
      default: ''
    },
    max: {
      type: Number,
      default: 100
    }
  },
  data () {
    return {
      chart: null
    }
  },
  watch: {
    chartData: {
      handler (val) {
        this.setOptions(val)
      },
      deep: true
    }
  },
  mounted () {
    this.$nextTick(() => {
      this.initChart()
    })
  },
  beforeDestroy () {
    if (!this.chart) {
      return
    }
    this.chart.dispose()
    this.chart = null
  },
  methods: {
    initChart () {
      this.chart = echarts.init(this.$el, 'macarons')
      this.setOptions(this.chartData)
    },

    setOptions (chartData) {
      if (this.chart) {
        this.chart.setOption({
          series: [
            {
              type: 'gauge',
              max: this.max,
              pointer: {
                show: true
              },
              progress: {
                show: true,
                width: 10
              },
              axisLine: {
                lineStyle: {
                  width: 10
                }
              },
              axisTick: {
                show: false
              },
              splitLine: {
                distance: 5,
                length: 10,
                lineStyle: {
                  width: 2,
                  color: '#999'
                }
              },
              axisLabel: {
                distance: 15,
                color: '#999',
                fontSize: 12
              },
              anchor: {
                show: false,
                showAbove: true,
                size: 15,
                itemStyle: {
                  borderWidth: 10
                }
              },
              title: {
                show: false
              },
              detail: {
                valueAnimation: true,
                width: '60%',
                lineHeight: 40,
                fontSize: 24,
                borderRadius: 8,
                fontWeight: 'bolder',
                formatter: '{value}%',
                color: 'inherit'
              },
              data: [
                {
                  value: chartData,
                  name: this.name
                }
              ]
            }
          ]
        })
      }
    }
  }
}
</script>
