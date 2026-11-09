<template>
  <div class="stage-banner">
    <div class="stage-main">
      <span class="stage-label">当前阶段</span>
      <span class="stage-no">{{ stage?.stage ?? 0 }}</span>
      <span class="stage-name">{{ stage?.name || '加载中…' }}</span>
      <el-tag :type="statusType" size="small" effect="light">{{ stage?.status || '—' }}</el-tag>
    </div>
    <div class="stage-meta">
      <span v-if="cycle?.name" class="cycle-name">{{ cycle.name }}</span>
      <span v-if="stage?.roundNo" class="round">第 {{ stage.roundNo }} 轮</span>
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

const stage = computed(() => cycleStore.stage)
const cycle = computed(() => cycleStore.cycle)

const statusType = computed<'success' | 'warning' | 'info'>(() => {
  if (stage.value?.status === '进行中') return 'success'
  if (stage.value?.status === '已结束') return 'info'
  return 'warning'
})

function parseTime(value?: string) {
  if (!value) return 0
  return new Date(value.replace(' ', 'T')).getTime()
}

const countdown = computed(() => {
  const end = parseTime(stage.value?.endAt)
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
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<style scoped>
.stage-banner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.4;
}

.stage-main {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--lm-text);
  font-weight: 600;
}

.stage-label {
  font-size: 12px;
  font-weight: 400;
  color: var(--lm-text-secondary);
}

.stage-no {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--lm-primary);
  color: #fff;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.stage-name {
  font-size: 15px;
}

.stage-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--lm-text-secondary);
}

.countdown {
  color: var(--lm-primary-dark);
  font-weight: 600;
}
</style>
