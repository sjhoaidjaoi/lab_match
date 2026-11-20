<template>
  <section v-loading="loading" class="student-page student-dashboard" aria-label="学生工作台">
    <el-alert v-if="loadError" title="部分数据加载失败" type="warning" :closable="false">
      <el-button text @click="load">重新加载</el-button>
    </el-alert>
    <el-card shadow="never" class="student-progress">
      <div class="student-stage-heading">
        <h1>选拔流程</h1>
        <small v-if="batch?.academicYear">学年 · {{ batch.academicYear }}</small>
      </div>
      <ol class="student-timeline">
        <li v-for="stage in orderedStages" :key="stage.stageNumber"
          :class="{ active: stage.stageNumber === currentStage?.no, done: stage.stageStatus === 'COMPLETED' }">
          <RouterLink :to="stageLink(stage.stageNumber)" :aria-current="stage.stageNumber === currentStage?.no ? 'step' : undefined">
            <span class="student-step">{{ stage.stageNumber }}</span>{{ stage.stageName }}
            <small>{{ stageStatusText(stage.stageStatus) }}</small>
          </RouterLink>
        </li>
      </ol>
    </el-card>
    <div class="student-home-grid">
      <aside class="student-blackboard">
        <h2>学院通知</h2>
        <details v-for="notice in announcements.slice(0, 5)" :key="notice.id">
          <summary>{{ notice.title }}<small>{{ formatDateTime(notice.createdAt) }}</small></summary>
          <p>{{ notice.content || '暂无正文' }}</p>
        </details>
        <p v-if="!announcements.length && !loading">暂无学院公告</p>
      </aside>
      <el-card class="student-status-card" shadow="never" role="region" aria-labelledby="student-status-title">
        <h2 id="student-status-title">个人选拔状态</h2>
        <div class="student-status-grid">
          <RouterLink to="/student/application" class="student-status-item">
            <h3><el-icon aria-hidden="true"><EditPen /></el-icon>我的志愿</h3>
            <p>已填报 <strong>{{ preferences.length }}</strong> 个平行志愿 · {{ preferences.length ? '已提交' : '未提交' }}</p>
          </RouterLink>
          <RouterLink to="/student/interview" class="student-status-item">
            <h3><el-icon aria-hidden="true"><Calendar /></el-icon>我的面试</h3>
            <p>面试安排 <strong>{{ interviews.length }}</strong> 条</p>
          </RouterLink>
          <article class="student-status-item">
            <h3><el-icon aria-hidden="true"><Connection /></el-icon>拟录取与调剂</h3>
            <p>拟录取待办 <strong>{{ pendingAdmissions }}</strong> 条 · 调剂待办 <strong>{{ pendingAdjustments }}</strong> 条</p>
            <div class="student-actions">
              <RouterLink class="workspace-action" to="/student/admission-confirmation">拟录取确认</RouterLink>
              <RouterLink class="workspace-action" to="/student/allocation">调剂通知</RouterLink>
              <RouterLink class="workspace-action" to="/student/supplement">补录志愿</RouterLink>
            </div>
          </article>
          <RouterLink to="/student/result" class="student-status-item">
            <h3><el-icon aria-hidden="true"><Trophy /></el-icon>最终结果</h3>
            <p>{{ finalResult ? '已公布个人录取结果' : '暂未公布' }}</p>
          </RouterLink>
        </div>
      </el-card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Calendar, Connection, EditPen, Trophy } from '@element-plus/icons-vue'
import { stages } from '@/config/stages'
import type { AnnouncementItem, PreferenceItem, StageInfo } from '@/types'
import {
  formatDateTime, studentApi, type CurrentBatch, type StudentAdjustmentRecord,
  type StudentAdmission, type StudentFinalResult, type StudentInterview
} from '@/api/student'

const stageLinks = [
  '/student/announcement', '/student/labs', '/student/application', '/student/interview',
  '/student/admission-confirmation', '/student/allocation?stage=6', '/student/allocation?stage=7', '/student/result'
]
const statusLabels: Record<string, string> = {
  NOT_STARTED: '未开始', IN_PROGRESS: '进行中', COMPLETED: '已结束', PAUSED: '已暂停'
}

const loading = ref(false)
const loadError = ref(false)
const announcements = ref<AnnouncementItem[]>([])
const batch = ref<CurrentBatch | null>(null)
const preferences = ref<PreferenceItem[]>([])
const interviews = ref<StudentInterview[]>([])
const admissions = ref<StudentAdmission[]>([])
const adjustments = ref<StudentAdjustmentRecord[]>([])
const finalResult = ref<StudentFinalResult | null>(null)

const currentStage = computed(() => batch.value?.currentStage ?? null)
const orderedStages = computed(() => {
  const byNumber = new Map<number, Pick<StageInfo, 'stageNumber' | 'stageName' | 'stageStatus'>>(
    stages.map(({ no, name }) => [no, { stageNumber: no, stageName: name, stageStatus: 'NOT_STARTED' }])
  )
  for (const stage of batch.value?.stages ?? []) byNumber.set(stage.stageNumber, stage)
  return [...byNumber.values()].sort((a, b) => a.stageNumber - b.stageNumber)
})
const pendingAdmissions = computed(() =>
  admissions.value.filter((item) => item.admissionType === 'INTENDED' && item.status === 'PENDING').length
)
const pendingAdjustments = computed(() => adjustments.value.filter((item) => item.status === 'PENDING').length)

function stageLink(no: number) {
  return stageLinks[no - 1] ?? '/student/dashboard'
}
function stageStatusText(status?: string) {
  return status ? statusLabels[status] ?? status : '—'
}

async function load() {
  loading.value = true
  const results = await Promise.allSettled([
    studentApi.batchesCurrent(), studentApi.myPreferences(), studentApi.myInterviews(),
    studentApi.myAdmissions(), studentApi.myAdjustments(), studentApi.myFinal(), studentApi.announcements()
  ])
  loadError.value = results.some(result => result.status === 'rejected')
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('学生工作台数据读取失败', result.reason)
      return
    }
    const value = result.value
    if (index === 0) batch.value = value as CurrentBatch | null
    else if (index === 1) preferences.value = value as PreferenceItem[]
    else if (index === 2) interviews.value = value as StudentInterview[]
    else if (index === 3) admissions.value = value as StudentAdmission[]
    else if (index === 4) adjustments.value = value as StudentAdjustmentRecord[]
    else if (index === 5) finalResult.value = value as StudentFinalResult | null
    else if (index === 6) announcements.value = value as AnnouncementItem[]
  })
  loading.value = false
}

onMounted(load)
</script>

<style scoped>
.student-dashboard { max-width: 1560px; margin-inline: auto; }
.student-progress :deep(.el-card__body) { padding: clamp(16px, 2vw, 24px); }
.student-dashboard .student-timeline {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 8px;
  overflow: visible;
  padding: 0;
  margin-top: 16px;
}
.student-dashboard .student-timeline li { padding: 0; min-width: 0; }
.student-dashboard .student-timeline li::before { display: none; }
.student-dashboard .student-timeline li a { padding: 10px; box-shadow: inset 0 0 0 1px var(--workspace-border); }
.student-dashboard .student-timeline li.active a { background: var(--workspace-tint); }
.student-dashboard .student-home-grid { grid-template-columns: minmax(230px, .85fr) minmax(0, 2fr); align-items: start; }
.student-blackboard { min-height: 180px; }
.student-blackboard h2 { border-bottom: 1px solid var(--workspace-border); margin-bottom: 12px; padding-bottom: 12px; }
@media (max-width: 1100px) {
  .student-dashboard .student-timeline { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 950px) {
  .student-dashboard .student-home-grid { grid-template-columns: minmax(0, 1fr); }
  .student-blackboard { min-height: 0; }
}
@media (max-width: 520px) {
  .student-dashboard .student-timeline { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.student-dashboard .student-stage-heading h1 { font-size: 18px; letter-spacing: normal; }
.student-stage-heading small { color: var(--workspace-muted); font-size: 12px; }
.student-stage-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.student-status-card {
  --student-status-divider: color-mix(in srgb, var(--workspace-muted) 16%, transparent);
  min-width: 0;
}
.student-status-card :deep(.el-card__body) { padding: clamp(16px, 2vw, 24px); }
.student-status-card h2 { padding-bottom: 12px; }
.student-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--student-status-divider);
}
.student-status-grid .student-status-item {
  display: block;
  min-width: 0;
  padding: 16px;
  color: var(--workspace-ink);
  overflow-wrap: anywhere;
}
.student-status-item:nth-child(even) { border-inline-start: 1px solid var(--student-status-divider); }
.student-status-item:nth-child(n + 3) { border-top: 1px solid var(--student-status-divider); }
.student-status-grid a.student-status-item:is(:hover, :focus-visible) { background: var(--workspace-tint); }
.student-status-grid a.student-status-item:focus-visible { outline-offset: -2px; }
.student-status-item h3 { display: flex; align-items: center; gap: 8px; font-size: 16px; }
.student-status-item h3 .el-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--workspace-tint);
  color: var(--workspace-accent);
  flex: none;
}
.student-status-item p { margin: 8px 0 0; color: var(--workspace-muted); }
.student-status-item p strong { color: var(--workspace-ink); font-size: 22px; font-variant-numeric: tabular-nums; }
.student-status-item .student-actions { gap: 6px; }
.student-status-item .student-actions .workspace-action { min-height: 36px; font-size: 13px; }
@media (max-width: 600px) {
  .student-status-grid { grid-template-columns: minmax(0, 1fr); }
  .student-status-grid .student-status-item { padding-inline: 8px; }
  .student-status-item:nth-child(even) { border-inline-start: 0; }
  .student-status-item + .student-status-item { border-top: 1px solid var(--student-status-divider); }
}
</style>
