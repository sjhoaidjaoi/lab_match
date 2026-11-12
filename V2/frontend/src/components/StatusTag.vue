<template>
  <el-tag :type="meta.type" size="small" effect="light">{{ meta.label }}</el-tag>
</template>

<script setup>
import { computed } from 'vue'
import { STATUS_META } from '@/constants/enums'

const props = defineProps({
  status: { type: String, default: '' },
  // 同一状态在不同页面含义不同：如 PENDING 在面试页=待评价、确认页=待确认
  label: { type: String, default: '' },
  // 同一状态在不同上下文也可用不同颜色（如草稿=info）
  tone: { type: String, default: '' }
})
const meta = computed(() => {
  const base = STATUS_META[props.status] || { label: props.status || '-', type: 'info' }
  return {
    ...base,
    ...(props.label ? { label: props.label } : {}),
    ...(props.tone ? { type: props.tone } : {})
  }
})
</script>
