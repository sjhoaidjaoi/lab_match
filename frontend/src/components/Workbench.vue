<template>
  <div class="page">
    <div class="hero">
      <div>
        <h1 class="hero-title">{{ config.title }}</h1>
        <p class="hero-desc">{{ config.subtitle }}</p>
        <p class="hero-user">{{ auth.user?.realName || auth.user?.username }}（{{ auth.roleName }}）· {{ cycleStore.batch?.batchName || '选拔批次' }}</p>
      </div>
      <div class="hero-stage">
        <div class="hero-stage-name">{{ currentStage?.stageName || '未开始' }}</div>
        <el-tag :type="statusTagType" effect="dark">{{ statusText }}</el-tag>
        <p class="hero-stage-tip">{{ currentStageDesc }}</p>
      </div>
    </div>

    <el-card shadow="never" class="timeline-card">
      <el-steps :active="activeStep" finish-status="success" process-status="process" align-center>
        <el-step v-for="item in stages" :key="item.no" :title="item.name" :description="item.time || item.key" />
      </el-steps>
    </el-card>

    <div class="section-title">常用功能</div>
    <el-row :gutter="16">
      <el-col v-for="card in config.cards" :key="card.path" :xs="24" :sm="12" :lg="8">
        <el-card shadow="hover" class="entry-card" @click="router.push(card.path)">
          <div class="entry-title">{{ card.title }}</div>
          <div class="entry-desc">{{ card.desc }}</div>
          <div class="entry-link">进入模块 <el-icon><ArrowRight /></el-icon></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCycleStore } from '@/stores/cycle'
import { stages } from '@/config/stages'
import { workbenches } from '@/config/workbenches'

const props = defineProps<{ role: string }>()
const router = useRouter()
const auth = useAuthStore()
const cycleStore = useCycleStore()

const config = computed(() => workbenches[props.role] ?? workbenches.STUDENT)
const currentStage = computed(() => cycleStore.currentStage)
const activeStep = computed(() => Math.max(0, (currentStage.value?.stageNumber ?? 1) - 1))

const STATUS_MAP: Record<string, string> = {
  NOT_STARTED: '未开始',
  IN_PROGRESS: '进行中',
  COMPLETED: '已结束',
  PAUSED: '已暂停'
}
const statusText = computed(() => STATUS_MAP[currentStage.value?.stageStatus || 'NOT_STARTED'] || '—')
const statusTagType = computed<'success' | 'info' | 'warning'>(() => {
  if (currentStage.value?.stageStatus === 'IN_PROGRESS') return 'success'
  if (currentStage.value?.stageStatus === 'COMPLETED') return 'info'
  return 'warning'
})
const currentStageDesc = computed(() => stages.find((s) => s.no === currentStage.value?.stageNumber)?.desc || '等待学院发布选拔批次')

onMounted(() => { cycleStore.load() })
</script>

<style scoped>
.hero { display: flex; justify-content: space-between; gap: 24px; background: linear-gradient(120deg, #2457d6 0%, #4f7df0 60%, #6f9bff 100%); color: #fff; border-radius: 14px; padding: 26px 28px; margin-bottom: 18px; }
.hero-title { margin: 0 0 8px; font-size: 24px; }
.hero-desc { margin: 0 0 10px; opacity: 0.92; }
.hero-user { margin: 0; font-size: 13px; opacity: 0.8; }
.hero-stage { min-width: 220px; background: rgba(255, 255, 255, 0.14); border-radius: 10px; padding: 14px 16px; }
.hero-stage-name { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.hero-stage-tip { margin: 10px 0 0; font-size: 12px; line-height: 1.6; opacity: 0.9; }
.timeline-card { margin-bottom: 18px; }
.section-title { font-size: 16px; font-weight: 600; margin: 6px 0 12px; }
.entry-card { cursor: pointer; margin-bottom: 16px; transition: transform 0.15s ease; }
.entry-card:hover { transform: translateY(-2px); }
.entry-title { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
.entry-desc { color: var(--lm-text-secondary); font-size: 13px; line-height: 1.6; min-height: 42px; }
.entry-link { margin-top: 10px; color: var(--lm-primary); font-size: 13px; display: inline-flex; align-items: center; gap: 4px; }
</style>
