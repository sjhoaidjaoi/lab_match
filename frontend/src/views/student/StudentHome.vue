<template>
  <section v-loading="loading" class="student-page student-dashboard">
    <header class="student-welcome student-dashboard-hero">
      <div>
        <h1>{{ auth.user?.realName ? auth.user.realName + '，你好' : '学生工作台' }}</h1>
        <p class="student-hero-subtitle">What shall we do next?</p>
      </div>
      <pre class="student-hero-code" aria-hidden="true"><code><span>const</span> pipeline = [
  'explore', 'apply', 'review'
]</code></pre>
      <div class="student-current">
        <small>当前阶段</small>
        <strong>{{ currentStage?.name || '暂无进行中的阶段' }}</strong>
        <small v-if="stageEnd">截止 {{ formatDateTime(stageEnd) }}</small>
        <RouterLink v-if="currentStage" class="workspace-action" :to="stageLink(currentStage.no)">
          查看阶段
          <el-icon class="workspace-arrow" aria-hidden="true"><ArrowRight /></el-icon>
        </RouterLink>
      </div>
    </header>
    <el-alert v-if="loadError" title="部分数据加载失败" type="warning" :closable="false">
      <el-button text @click="load">重新加载</el-button>
    </el-alert>
    <el-card shadow="never" class="student-progress">
      <div class="student-stage-heading">
        <h2>选拔流程</h2>
        <small v-if="batch?.academicYear">学年 · {{ batch.academicYear }}</small>
      </div>
      <template v-if="batch">
        <ol class="student-timeline">
          <li v-for="stage in orderedStages" :key="stage.stageNumber"
            :class="{ active: stage.stageNumber === currentStage?.no, done: stage.stageStatus === 'COMPLETED' }">
            <RouterLink :to="stageLink(stage.stageNumber)" :aria-current="stage.stageNumber === currentStage?.no ? 'step' : undefined">
              <span class="student-step">{{ stage.stageNumber }}</span>{{ stage.stageName }}
              <small>{{ stageStatusText(stage.stageStatus) }}</small>
            </RouterLink>
          </li>
        </ol>
      </template>
      <el-empty v-else :image-size="56" description="暂无进行中的选拔批次" />
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
      <section class="student-personal student-grid" aria-label="个人选拔状态">
        <RouterLink to="/student/application" class="student-module workspace-action">
          <h2><el-icon aria-hidden="true"><EditPen /></el-icon>我的志愿</h2>
          <p>已填报 <strong>{{ preferences.length }}</strong> 个平行志愿 · {{ preferences.length ? '已提交' : '未提交' }}</p>
        </RouterLink>
        <RouterLink to="/student/interview" class="student-module workspace-action">
          <h2><el-icon aria-hidden="true"><Calendar /></el-icon>我的面试</h2>
          <p>面试安排 <strong>{{ interviews.length }}</strong> 条</p>
        </RouterLink>
        <article class="student-module">
          <h2><el-icon aria-hidden="true"><Connection /></el-icon>拟录取与调剂</h2>
          <p>拟录取待办 <strong>{{ pendingAdmissions }}</strong> 条 · 调剂待办 <strong>{{ pendingAdjustments }}</strong> 条</p>
          <div class="student-actions">
            <RouterLink class="workspace-action" to="/student/admission-confirmation">拟录取确认</RouterLink>
            <RouterLink class="workspace-action" to="/student/allocation">调剂通知</RouterLink>
          </div>
        </article>
        <RouterLink to="/student/result" class="student-module workspace-action">
          <h2><el-icon aria-hidden="true"><Trophy /></el-icon>最终结果</h2>
          <p>{{ finalResult ? '已公布个人录取结果' : '暂未公布' }}</p>
        </RouterLink>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AnnouncementItem, PreferenceItem } from '@/types'
import { useAuthStore } from '@/stores/auth'
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
const auth = useAuthStore()
const loadError = ref(false)
const announcements = ref<AnnouncementItem[]>([])
const batch = ref<CurrentBatch | null>(null)
const preferences = ref<PreferenceItem[]>([])
const interviews = ref<StudentInterview[]>([])
const admissions = ref<StudentAdmission[]>([])
const adjustments = ref<StudentAdjustmentRecord[]>([])
const finalResult = ref<StudentFinalResult | null>(null)

const currentStage = computed(() => batch.value?.currentStage ?? null)
const orderedStages = computed(() => [...(batch.value?.stages ?? [])].sort((a, b) => a.stageNumber - b.stageNumber))
const stageEnd = computed(() => orderedStages.value.find(stage => stage.stageNumber === currentStage.value?.no)?.endTime)
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
.student-dashboard {
  width: 100%;
  max-width: 1560px;
  margin-inline: auto;
  gap: 20px;
}
.student-dashboard-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(230px, .8fr);
  align-items: center;
  gap: 24px;
  padding: clamp(24px, 2.5vw, 36px);
  border-radius: 16px;
}
.student-dashboard-hero h1 {
  font-size: clamp(28px, 3vw, 42px);
  line-height: 1.2;
  overflow-wrap: anywhere;
}
.student-dashboard-hero .student-hero-subtitle {
  margin: 10px 0 0;
  font-size: clamp(14px, 1.3vw, 17px);
  color: var(--workspace-muted);
}
.student-hero-code { display: none; }
.student-current {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid var(--workspace-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--workspace-paper) 90%, transparent);
}
.student-current .workspace-action { margin-top: 4px; }
.student-current small, .student-stage-heading small {
  color: var(--workspace-muted);
  font-size: 12px;
}
.student-current strong { font-size: 16px; line-height: 1.5; }
.student-progress {
  border-radius: 14px;
  box-shadow: 0 3px 16px #34241c04;
}
.student-progress :deep(.el-card__body) { padding: 20px 24px; }
.student-stage-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.student-stage-heading h2 { font-size: 17px; }
.student-progress :deep(.el-empty) {
  flex-direction: row;
  justify-content: flex-start;
  gap: 20px;
  padding: 20px 0 0;
}
.student-progress :deep(.el-empty__image) { flex: none; }
.student-progress :deep(.el-empty__description) { margin: 0; }
.student-progress :deep(.el-empty__description p) {
  margin: 0;
  color: var(--workspace-muted);
  font-size: 13px;
}
.student-progress .student-timeline {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 8px;
  margin: 16px 0 0;
  padding: 0;
  overflow: visible;
}
.student-progress .student-timeline li { padding: 0; min-width: 0; }
.student-progress .student-timeline li::before { display: none; }
.student-progress .student-timeline li a {
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--workspace-border);
  border-radius: 10px;
  line-height: 1.5;
}
.student-progress .student-timeline li.active a {
  background: var(--workspace-tint);
  border-color: var(--el-color-primary-light-5);
}
.student-home-grid {
  grid-template-columns: minmax(250px, .85fr) minmax(0, 2fr);
  gap: 20px;
  align-items: start;
}
.student-blackboard {
  min-width: 0;
  min-height: 216px;
  padding: 24px;
  border-radius: 14px;
  box-shadow: 0 3px 16px #22362f0a;
}
.student-blackboard h2 {
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #ffffff26;
  font-size: 17px;
}
.student-blackboard > p { color: #d6e0d7; font-size: 14px; }
.student-blackboard details:last-child { border-bottom: 0; }
.student-personal { gap: 16px; }
.student-page .student-module {
  min-width: 0;
  min-height: 152px;
  padding: 22px 24px;
  border-radius: 14px;
  color: var(--workspace-ink);
  overflow-wrap: anywhere;
  box-shadow: 0 3px 16px #34241c04;
}
.student-page article.student-module {
  border: 1px solid var(--workspace-border);
  background: var(--workspace-paper);
}
.student-page a.student-module {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 0;
  font-weight: 400;
}
.student-module h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
}
.student-module h2 .el-icon {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--workspace-accent);
  background: var(--workspace-tint);
  font-size: 18px;
}
.student-module p { margin: 12px 0 0; color: var(--workspace-muted); font-size: 13px; }
.student-module p strong {
  margin-inline: 3px;
  color: var(--workspace-ink);
  font-size: 23px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.student-module .student-actions { gap: 8px; margin-top: 14px; }
.student-module .student-actions .workspace-action { min-height: 36px; font-size: 12px; }
@media (min-width: 1280px) {
  .student-dashboard-hero { grid-template-columns: minmax(0, 1.1fr) minmax(200px, .8fr) minmax(0, 1fr); }
  .student-hero-code {
    display: block;
    margin: 0;
    padding: 8px 20px;
    border-inline-start: 1px solid color-mix(in srgb, var(--workspace-accent) 24%, transparent);
    color: color-mix(in srgb, var(--workspace-accent) 65%, var(--workspace-paper));
    font: 12px/1.8 var(--workspace-mono);
    user-select: none;
  }
  .student-hero-code code { font: inherit; }
  .student-hero-code span { font-weight: 700; }
}
@media (max-width: 1100px) {
  .student-progress .student-timeline { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .student-home-grid { grid-template-columns: minmax(0, 1fr); }
  .student-blackboard { min-height: 0; }
}
@media (max-width: 600px) {
  .student-dashboard { gap: 16px; }
  .student-dashboard-hero { grid-template-columns: minmax(0, 1fr); gap: 20px; padding: 24px; }
  .student-progress :deep(.el-card__body) { padding: 18px; }
  .student-progress .student-timeline { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .student-personal { grid-template-columns: minmax(0, 1fr); }
  .student-page .student-module, .student-blackboard { padding: 20px; }
}
</style>
