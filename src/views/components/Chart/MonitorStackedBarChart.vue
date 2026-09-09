<template>
  <div :style="{ height, width }" />
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'MonitorStackedBarChart',
  props: {
    chartData: { type: Object, required: true },
    width: { type: String, default: '100%' },
    height: { type: String, default: '360px' }
  },
  data () { return { chart: null, resizeHandler: null } },
  watch: {
    chartData: { deep: true, handler () { this.setOptions() } }
  },
  mounted () {
    this.chart = echarts.init(this.$el, 'macarons')
    this.resizeHandler = () => this.chart && this.chart.resize()
    window.addEventListener('resize', this.resizeHandler)
    this.setOptions()
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.resizeHandler)
    if (this.chart) this.chart.dispose()
    this.chart = null
  },
  methods: {
    setOptions () {
      if (!this.chart) return
      const source = this.chartData || {}
      const keys = source.keys || []
      const legends = source.legends || keys
      const series = keys.map((key, index) => ({
        name: legends[index] || key,
        type: 'bar',
        stack: 'http-status',
        barMaxWidth: 30,
        emphasis: { focus: 'series' },
        itemStyle: { color: (source.colors || [])[index] },
        data: (source.data && source.data[key]) || []
      }))
      this.chart.setOption({
        title: { text: source.title, textStyle: { fontSize: 14 } },
        animationDuration: 300,
        legend: { type: 'scroll', top: 28, left: 55, right: 20, data: legends },
        grid: { left: 62, right: 20, top: 72, bottom: 70 },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: params => {
            const total = params.reduce((sum, item) => sum + Number(item.value || 0), 0)
            const rows = params.filter(item => Number(item.value || 0) > 0)
              .map(item => `${item.marker}${item.seriesName}: ${Math.round(Number(item.value || 0)).toLocaleString()}`)
            return [`${params[0] ? params[0].axisValue : ''}`, ...rows, `<strong>合计: ${Math.round(total).toLocaleString()}</strong>`].join('<br>')
          }
        },
        xAxis: { type: 'category', data: source.labels || [], axisTick: { show: false }, axisLabel: { hideOverlap: true } },
        yAxis: { type: 'value', name: '请求数 / 采样窗口', minInterval: 1, axisLine: { show: false }, axisTick: { show: false } },
        dataZoom: [
          { type: 'inside', start: 0, end: 100 },
          { type: 'slider', height: 18, bottom: 12, start: 0, end: 100 }
        ],
        series
      }, true)
    }
  }
}
</script>
