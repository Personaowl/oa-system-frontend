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
      color: ['#2563eb', '#0ea5e9', '#c77809', '#16a34a'],
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
        extraCssText: 'box-shadow: 0 10px 24px rgba(20, 42, 54, 0.10); border-radius: 6px;',
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
