<template>
  <div class="metric-card panel" :style="{ '--metric-color': color }">
    <div class="metric-card-head">
      <div class="metric-card-label">{{ title }}</div>
      <div class="metric-icon">
        <el-icon :size="18"><component :is="icon" /></el-icon>
      </div>
    </div>
    <div class="metric-value">{{ value }}</div>
    <div class="metric-foot"><span class="metric-foot-dot"></span>{{ subtitle }}</div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  value: [String, Number],
  subtitle: String,
  icon: Object,
  color: String
})
</script>
