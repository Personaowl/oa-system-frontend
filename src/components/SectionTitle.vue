<template>
  <div class="section-head">
    <div class="section-title-block">
      <h3>{{ title }}</h3>
      <div v-if="subtitle" class="muted" style="margin-top: 6px; font-size: 13px">{{ subtitle }}</div>
    </div>
    <slot name="extra" />
  </div>
</template>

<script setup>
defineProps({
  title: String,
  subtitle: String
})
</script>
