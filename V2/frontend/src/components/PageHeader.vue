<template>
  <div class="page-header">
    <div>
      <h2 class="page-title">{{ title }}</h2>
      <p v-if="desc" class="page-desc">{{ desc }}</p>
    </div>
    <div class="actions"><slot name="actions" /></div>
  </div>
</template>

<script setup>
defineProps({ title: { type: String, required: true }, desc: { type: String, default: '' } })
</script>

<style scoped>
.actions { display: flex; flex-wrap: wrap; gap: 8px; flex-shrink: 0; }
</style>
