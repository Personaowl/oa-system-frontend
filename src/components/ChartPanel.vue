<template>
  <div class="panel section">
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
  chart.setOption(props.option, true)
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
