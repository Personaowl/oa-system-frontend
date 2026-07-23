<template>
  <div class="panel section chart-panel">
    <SectionTitle :title="title" :subtitle="subtitle" />
    <div ref="elRef" class="chart-box"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import SectionTitle from './SectionTitle.vue'

const props = defineProps({
  title: String,
  subtitle: String,
  option: Object
})

const elRef = ref()
let chart = null
let ro = null

function render() {
  if (!chart || !props.option) return
  chart.setOption(
    {
      color: ['#5b5ff5', '#17c9a3', '#ff9f43', '#ff6680', '#43a5ff', '#a86df3'],
      textStyle: {
        color: '#647987',
        fontFamily: 'Inter, PingFang SC, Microsoft YaHei, system-ui, sans-serif'
      },
      ...props.option,
      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: '#dce6eb',
        borderWidth: 1,
        textStyle: { color: '#263f4d' },
        extraCssText: 'box-shadow: 0 16px 36px rgba(41, 47, 105, 0.16); border-radius: 12px;',
        ...props.option.tooltip
      }
    },
    true
  )
}

onMounted(() => {
  chart = echarts.init(elRef.value)
  render()
  ro = new ResizeObserver(() => chart?.resize())
  ro.observe(elRef.value)
})

watch(
  () => props.option,
  () => render(),
  { deep: true }
)

onBeforeUnmount(() => {
  ro?.disconnect()
  chart?.dispose()
})
</script>
