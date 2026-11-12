<template>
  <div class="stat-card">
    <div class="label">{{ label }}</div>
    <div class="value-row">
      <span class="value" :style="{ color: tone || 'var(--trs-text)' }">{{ value }}</span>
      <span v-if="suffix" class="suffix">{{ suffix }}</span>
    </div>
    <div v-if="hint" class="hint">{{ hint }}</div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '-' },
  suffix: { type: String, default: '' },
  hint: { type: String, default: '' },
  tone: { type: String, default: '' }
})
</script>

<style scoped>
.stat-card { background: #fff; border: 1px solid var(--trs-border); border-radius: 10px; padding: 14px 16px; }
.label { font-size: 13px; color: var(--trs-muted); }
.value-row { margin-top: 8px; display: flex; align-items: baseline; gap: 4px; }
.value { font-size: 26px; font-weight: 600; line-height: 1.1; }
.suffix { font-size: 12px; color: var(--trs-muted); }
.hint { margin-top: 6px; font-size: 12px; color: var(--trs-muted); }
</style>
