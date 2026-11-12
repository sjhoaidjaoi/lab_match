<template>
  <el-tag :type="tagType" size="small" effect="plain">{{ label }}</el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  noticeType: number
  noticeTypeText?: string
}>()

const TYPE_TEXT: Record<number, string> = {
  1: '宣讲',
  2: '开放日',
  3: '公示',
  4: '通知'
}

const typeTag: Record<number, 'primary' | 'success' | 'warning' | 'info'> = {
  1: 'primary',
  2: 'success',
  3: 'warning',
  4: 'info'
}

const label = computed(() => props.noticeTypeText || TYPE_TEXT[props.noticeType] || '通知')
const tagType = computed(() => typeTag[props.noticeType] ?? 'info')
</script>
