<template>
  <div>
    <div class="row">
      <span>已录取 <strong>{{ admitted }}</strong> / 名额 {{ quota }}</span>
      <span :class="{ danger: remaining < 0 }">剩余 {{ remaining }}</span>
    </div>
    <el-progress :percentage="percentage" :status="status" :stroke-width="10" />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  quota: { type: Number, default: 0 },
  admitted: { type: Number, default: 0 }
})

const remaining = computed(() => props.quota - props.admitted)
const percentage = computed(() => {
  if (!props.quota) return 0
  return Math.min(100, Math.round((props.admitted / props.quota) * 100))
})
const status = computed(() => {
  if (remaining.value < 0) return 'exception'
  if (percentage.value >= 100) return 'success'
  return undefined
})
</script>

<style scoped>
.row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
.danger { color: #f56c6c; }
</style>
