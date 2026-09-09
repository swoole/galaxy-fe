<template>
  <div :style="{ height, width }" />
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'MonitorPieChart',
  props: {
    title: { type: String, required: true },
    data: { type: Array, default: () => [] },
    height: { type: String, default: '280px' },
    width: { type: String, default: '100%' },
    colors: {
      type: Array,
      default: () => ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#7b61ff', '#19b5a5']
    }
  },
  data () { return { chart: null } },
  watch: {
    title () { this.setOptions() },
    data: { deep: true, handler () { this.setOptions() } }
  },
  mounted () {
    this.chart = echarts.init(this.$el, 'macarons')
    this.setOptions()
    window.addEventListener('resize', this.resize)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.resize)
    if (this.chart) this.chart.dispose()
    this.chart = null
  },
  methods: {
    setOptions () {
      if (!this.chart) return
      const rows = (this.data || []).filter(item => Number(item.value || 0) > 0)
      const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0)
      const series = rows.map((item, index) => ({
        name: String(item.name),
        value: Number(item.value || 0),
        itemStyle: { color: item.color || this.colors[index % this.colors.length] }
      }))
      this.chart.setOption({
        title: [
          { text: this.title, left: 0, top: 0, textStyle: { fontSize: 14, color: '#303133' } },
          {
            text: Math.round(total).toLocaleString(),
            subtext: '请求',
            left: '34%',
            top: '40%',
            textAlign: 'center',
            textStyle: { fontSize: 22, fontWeight: 600, color: '#303133' },
            subtextStyle: { fontSize: 12, color: '#909399' }
          }
        ],
        tooltip: {
          trigger: 'item',
          backgroundColor: '#fff',
          borderColor: '#e4e7ed',
          textStyle: { color: '#303133' },
          formatter: params => `${params.marker}${params.name}<br/>请求数：${Math.round(params.value).toLocaleString()}<br/>占比：${params.percent}%`
        },
        legend: {
          type: 'scroll',
          orient: 'vertical',
          right: 8,
          top: 'middle',
          width: '34%',
          textStyle: { color: '#606266' },
          formatter: name => {
            const item = series.find(row => row.name === name)
            return `${name}  ${Math.round(item ? item.value : 0).toLocaleString()}`
          }
        },
        series: [{
          type: 'pie',
          radius: ['43%', '68%'],
          center: ['35%', '55%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: { scale: true, scaleSize: 6, label: { show: false } },
          data: series
        }]
      }, true)
    },
    resize () { if (this.chart) this.chart.resize() }
  }
}
</script>
