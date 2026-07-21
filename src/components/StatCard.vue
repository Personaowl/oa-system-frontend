<template>
  <div class="panel section">
    <div class="tool-row" style="justify-content: space-between; align-items: flex-start">
      <div>
        <div class="muted" style="font-size: 13px">{{ title }}</div>
        <div style="margin-top: 8px; font-size: 28px; font-weight: 700">{{ value }}</div>
      </div>
      <el-icon :style="{ color }" :size="26">
        <component :is="icon" />
      </el-icon>
    </div>
    <div style="margin-top: 10px; font-size: 12px" class="muted">{{ subtitle }}</div>
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
