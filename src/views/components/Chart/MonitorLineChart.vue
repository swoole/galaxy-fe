<template>
  <div
    :class="className"
    :style="{height: height, width: width}"
  />
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'MonitorLineChart',
  props: {
    chartData: {
      type: Object,
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
    },
    colors: {
      type: Array,
      default: function () {
        return [
          'rgb(85, 188, 138)',
          'rgb(50, 157, 206)',
          'rgb(245, 166, 35)',
          '#ff458c'
        ]
      }
    }
  },
  data () {
    return {
      chart: null,
      initialized: false
    }
  },
  watch: {
    chartData: {
      handler (val) {
        if (!val.data) {
          return
        }
        if (!this.chart) {
          this.initChart()
        }
        this.setOptions(val)
      },
      deep: true
    }
  },
  mounted () {
    this.initChart()
    this.setOptions(this.chartData)
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
    },

    setOptions (chartData) {
      if (!this.chart) {
        return
      }
      const seriesData = []
      const legendData = []
      let index = 0

      chartData.keys.forEach(key => {
        const color = this.colors[index % this.colors.length]
        const name = chartData.legends ? chartData.legends[index] : key

        legendData.push(name)
        seriesData.push({
          name,
          smooth: true,
          symbol: 'none',
          type: 'line',
          areaStyle: {
            opacity: 0.1
          },
          lineStyle: {
            color,
            width: 1
          },
          itemStyle: {
            color
          },
          tooltip: {
            valueFormatter: chartData.valueFormatter
          },
          data: chartData.data[key]
        })
        index++
      })

      if (!this.initialized) {
        this.chart.setOption({
          title: {
            text: this.chartData.title,
            textStyle: {
              fontSize: 14
            }
          },
          xAxis: {
            data: chartData.labels,
            boundaryGap: false,
            type: 'category',
            axisTick: {
              show: false
            }
          },
          grid: {
            left: 8,
            right: 12,
            bottom: 30,
            top: 60,
            containLabel: true
          },
          tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff'
          },
          yAxis: {
            axisLabel: {
              show: true,
              formatter: chartData.valueFormatter
            },
            axisLine: {
              show: false
            },
            axisTick: {
              show: false
            }
          },
          legend: {
            data: legendData,
            padding: 10
          },
          series: seriesData
        })
        this.initialized = true
      } else {
        this.chart.setOption({
          xAxis: {
            data: chartData.labels
          },
          series: seriesData.map(s => ({ data: s.data }))
        })
      }
      this.chart.resize()
    }
  }
}
</script>
