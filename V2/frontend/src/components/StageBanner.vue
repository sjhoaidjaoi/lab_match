<template>
  <div class="banner">
    <div class="left">
      <el-tag effect="dark">第 {{ current.no }} 阶段</el-tag>
      <strong>{{ current.name }}</strong>
      <span class="muted">{{ current.start }} ~ {{ current.end }}</span>
      <el-tag size="small" :type="remaining === '已结束' ? 'info' : 'success'" effect="plain">
        剩余 {{ remaining }}
      </el-tag>
    </div>
    <div class="right">
      <el-tag :type="current.isDemo ? 'warning' : 'success'" size="small">
        {{ current.isDemo ? '演示阶段' : '服务端阶段' }}
      </el-tag>
      <el-tag size="small" effect="plain" type="info">系统时间 {{ clock.nowText }}</el-tag>
      <el-tag v-if="previousPending" size="small" type="warning" effect="plain">上一阶段未完成</el-tag>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStageStore } from '@/stores/stage'
import { useClockStore } from '@/stores/clock'
import { remainingText } from '@/utils/time'

const stageStore = useStageStore()
const clock = useClockStore()
const current = computed(() => stageStore.current)
const remaining = computed(() => remainingText(current.value.end, clock.now))

const previousPending = computed(() => {
  const no = current.value.no
  if (no <= 4) return false
  return !stageStore.completion[no - 1]?.ok
})
</script>

<style scoped>
.banner {
  margin: 12px 20px 0;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid var(--trs-border);
  border-left: 4px solid var(--trs-primary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

@media (max-width: 900px) {
  .banner { flex-direction: column; align-items: flex-start; margin: 10px 12px 0; padding: 10px 12px; }
  .right { width: 100%; }
  .right :deep(.el-select),
  .right :deep(.el-date-editor) { width: 100% !important; }
}
</style>
