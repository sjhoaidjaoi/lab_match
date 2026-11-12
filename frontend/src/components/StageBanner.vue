<template>
  <div class="stage-banner">
    <div class="stage-main">
      <span class="stage-label">当前阶段</span>
      <span class="stage-no">{{ currentStage?.stageNumber ?? '—' }}</span>
      <span class="stage-name">{{ currentStage?.stageName || '加载中…' }}</span>
      <el-tag :type="statusType" size="small" effect="light">{{ statusText }}</el-tag>
    </div>
    <div class="stage-meta">
      <span v-if="cycleStore.batch?.batchName" class="cycle-name">{{ cycleStore.batch.batchName }}</span>
      <span v-if="currentStage" class="period">{{ formatTime(currentStage.startTime) }} ~ {{ formatTime(currentStage.endTime) }}</span>
      <span v-if="countdown" class="countdown">{{ countdown }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useCycleStore } from '@/stores/cycle'

const cycleStore = useCycleStore()
const now = ref(Date.now())
let timer: number | undefined

const currentStage = computed(() => cycleStore.currentStage)

const STATUS_MAP: Record<string, string> = {
  NOT_STARTED: '未开始',
  IN_PROGRESS: '进行中',
  COMPLETED: '已结束',
  PAUSED: '已暂停'
}
const statusText = computed(() => (currentStage.value?.stageStatus ? STATUS_MAP[currentStage.value.stageStatus] : '—') || '—')
const statusType = computed<'success' | 'warning' | 'info'>(() => {
  if (currentStage.value?.stageStatus === 'IN_PROGRESS') return 'success'
  if (currentStage.value?.stageStatus === 'COMPLETED') return 'info'
  return 'warning'
})

function formatTime(value?: string) {
  if (!value) return ''
  try {
    const d = new Date(value)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

const countdown = computed(() => {
  const end = currentStage.value?.endTime ? new Date(currentStage.value.endTime).getTime() : 0
  if (!end) return ''
  const diff = end - now.value
  if (diff <= 0) return '阶段已结束'
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const hms = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return days > 0 ? `剩余 ${days} 天 ${hms}` : `剩余 ${hms}`
})

onMounted(() => {
  cycleStore.load()
  timer = window.setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => { if (timer) window.clearInterval(timer) })
</script>

<style scoped>
.stage-banner { display: flex; flex-direction: column; gap: 4px; line-height: 1.4; }
.stage-main { display: flex; align-items: center; gap: 8px; color: var(--lm-text); font-weight: 600; }
.stage-label { font-size: 12px; font-weight: 400; color: var(--lm-text-secondary); }
.stage-no { width: 22px; height: 22px; border-radius: 50%; background: var(--lm-primary); color: #fff; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
.stage-name { font-size: 15px; }
.stage-meta { display: flex; gap: 12px; font-size: 12px; color: var(--lm-text-secondary); }
.countdown { color: var(--lm-primary-dark); font-weight: 600; }
</style>
