<template>
  <section class="screen-panel">
    <div class="panel-glow" aria-hidden="true"></div>
    <header class="screen-panel-head">
      <div>
        <span class="panel-kicker">{{ kicker }}</span>
        <h3>{{ title }}</h3>
      </div>
      <span v-if="badge" class="panel-badge">{{ badge }}</span>
    </header>
    <div ref="chartRef" class="screen-chart"></div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  title: String,
  kicker: { type: String, default: 'DATA INSIGHT' },
  badge: String,
  option: Object
})

const chartRef = ref()
let chart
let resizeObserver

function render() {
  if (!chart || !props.option) return
  chart.setOption({
    animation: true,
    animationDuration: 900,
    animationDurationUpdate: 650,
    animationEasing: 'cubicOut',
    color: ['#7182ea', '#42bfa0', '#f3aa57', '#ee7891', '#59b8cf', '#9a76e7'],
    textStyle: {
      color: '#61708a',
      fontFamily: 'Inter, PingFang SC, Microsoft YaHei, system-ui, sans-serif'
    },
    ...props.option,
    tooltip: {
      backgroundColor: 'rgba(255,255,255,.96)',
      borderColor: '#dde5f3',
      borderWidth: 1,
      textStyle: { color: '#243553' },
      extraCssText: 'box-shadow:0 14px 36px rgba(67,79,130,.15);border-radius:12px;',
      ...props.option.tooltip
    }
  }, true)
}

onMounted(() => {
  chart = echarts.init(chartRef.value)
  render()
  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(chartRef.value)
})

watch(() => props.option, render, { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
})
</script>

<style scoped>
.screen-panel{position:relative;min-width:0;overflow:hidden;border:1px solid rgba(214,224,242,.88);border-radius:22px;background:rgba(255,255,255,.78);box-shadow:0 16px 42px rgba(72,88,142,.1);backdrop-filter:blur(18px);animation:panel-in .72s both}
.screen-panel::before{position:absolute;z-index:2;top:0;left:-35%;width:28%;height:2px;background:linear-gradient(90deg,transparent,#7790f2,transparent);content:'';animation:panel-scan 5s linear infinite}
.panel-glow{position:absolute;right:-40px;top:-55px;width:145px;height:145px;border-radius:50%;background:radial-gradient(circle,rgba(128,145,235,.14),transparent 70%);pointer-events:none}
.screen-panel-head{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:17px 20px 0}.panel-kicker{color:#99a4b7;font-size:9px;font-weight:800;letter-spacing:.16em}.screen-panel-head h3{margin:4px 0 0;color:#263754;font-size:15px}.panel-badge{padding:5px 9px;border:1px solid #dae2f5;border-radius:999px;background:#f2f5ff;color:#6372d8;font-size:10px;font-weight:700}.screen-chart{height:245px}
@keyframes panel-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}@keyframes panel-scan{to{left:110%}}
@media(prefers-reduced-motion:reduce){.screen-panel{animation:none}.screen-panel::before{animation:none}}
</style>
