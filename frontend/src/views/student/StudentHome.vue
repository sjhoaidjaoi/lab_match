<template>
  <section v-loading="loading" class="student-page">
    <header class="student-welcome student-dashboard-hero">
      <div>
        <p class="student-kicker">河北师范大学软件学院 · LAB MATCH</p>
        <h1>{{ auth.user?.realName ? auth.user.realName + '，你好' : '学生工作台' }}</h1>
        <p>{{ batch?.batchName || '实训室选拔工作台' }}</p>
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
      <el-empty v-else description="暂无进行中的选拔批次" />
    </el-card>
    <div class="student-home-grid">
      <aside class="student-blackboard">
        <h2>学院通知</h2>
        <details v-for="notice in announcements.slice(0, 5)" :key="notice.id">
          <summary>{{ notice.title }}<small>{{ formatDateTime(notice.createdAt) }}</small></summary>
          <p>{{ notice.content || '暂无正文' }}</p>
        </details>
        <p v-if="!announcements.length && !loading">暂无学院公告</p>
        <RouterLink to="/student/messages">消息通知（{{ unreadCount }} 条未读） →</RouterLink>
      </aside>
      <section class="student-personal student-grid" aria-label="个人选拔状态">
        <RouterLink to="/student/application" class="student-module workspace-action">
          <h2><el-icon aria-hidden="true"><EditPen /></el-icon>我的志愿</h2>
          <p>已填报 {{ preferences.length }} 个平行志愿 · {{ preferences.length ? '已提交' : '未提交' }}</p>
          <span class="student-module-link">前往意向填报 <span aria-hidden="true">→</span></span>
        </RouterLink>
        <RouterLink to="/student/interview" class="student-module workspace-action">
          <h2><el-icon aria-hidden="true"><Calendar /></el-icon>我的面试</h2>
          <p>面试安排 {{ interviews.length }} 条</p>
          <span class="student-module-link">查看面试安排 <span aria-hidden="true">→</span></span>
        </RouterLink>
        <article class="student-module">
          <h2><el-icon aria-hidden="true"><Connection /></el-icon>拟录取与调剂</h2>
          <p>拟录取待办 {{ pendingAdmissions }} 条 · 调剂待办 {{ pendingAdjustments }} 条</p>
          <div class="student-actions">
            <RouterLink class="workspace-action" to="/student/admission-confirmation">拟录取确认</RouterLink>
            <RouterLink class="workspace-action" to="/student/allocation">调剂通知</RouterLink>
          </div>
        </article>
        <RouterLink to="/student/result" class="student-module workspace-action">
          <h2><el-icon aria-hidden="true"><Trophy /></el-icon>最终结果</h2>
          <p>{{ finalResult ? '已公布个人录取结果' : '暂未公布' }}</p>
          <span class="student-module-link">查看最终结果 <span aria-hidden="true">→</span></span>
        </RouterLink>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AnnouncementItem, NoticeItem, PreferenceItem } from '@/types'
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
const notices = ref<NoticeItem[]>([])
const finalResult = ref<StudentFinalResult | null>(null)

const currentStage = computed(() => batch.value?.currentStage ?? null)
const orderedStages = computed(() => [...(batch.value?.stages ?? [])].sort((a, b) => a.stageNumber - b.stageNumber))
const stageEnd = computed(() => orderedStages.value.find(stage => stage.stageNumber === currentStage.value?.no)?.endTime)
const pendingAdmissions = computed(() =>
  admissions.value.filter((item) => item.admissionType === 'INTENDED' && item.status === 'PENDING').length
)
const pendingAdjustments = computed(() => adjustments.value.filter((item) => item.status === 'PENDING').length)
const unreadCount = computed(() => notices.value.filter((item) => !item.read).length)

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
    studentApi.myAdmissions(), studentApi.myAdjustments(), studentApi.myNotices(), studentApi.myFinal(), studentApi.announcements()
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
    else if (index === 5) notices.value = value as NoticeItem[]
    else if (index === 6) finalResult.value = value as StudentFinalResult | null
    else if (index === 7) announcements.value = value as AnnouncementItem[]
  })
  loading.value = false
}

onMounted(load)
</script>

<style scoped>
.student-dashboard-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(230px, .9fr);
  align-items: center;
  gap: clamp(14px, 3vw, 52px);
}
.student-welcome .student-kicker { margin: 0 0 6px; color: var(--workspace-accent); font-size: 12px; font-weight: 650; }
.student-dashboard-hero h1 { font-size: clamp(26px, 3.3vw, 45px); overflow-wrap: anywhere; }
.student-hero-code { display: none; }
@media (min-width: 1200px) {
  .student-dashboard-hero { grid-template-columns: minmax(0, 1.3fr) minmax(215px, .75fr) minmax(0, 1.1fr); }
  .student-hero-code {
    display: block;
    justify-self: center;
    margin: 0;
    padding: 12px 0 12px 16px;
    border-inline-start: 1px solid color-mix(in srgb, var(--workspace-accent) 26%, transparent);
    color: color-mix(in srgb, var(--workspace-accent) 56%, var(--workspace-paper));
    font: 13px/1.85 var(--workspace-mono);
    user-select: none;
  }
  .student-hero-code code { font: inherit; }
  .student-hero-code span { font-weight: 700; }
}
.student-current {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 14px 16px;
  border: 0;
  border-radius: 14px;
  background-color: rgba(255, 255, 255, 0.56);
  background-image: linear-gradient(152deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.24));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 -1px 0 rgba(255, 255, 255, 0.62);
}
.student-current .workspace-action { margin-top: 4px; }
.student-current small, .student-stage-heading small { color: var(--workspace-muted); font-size: 12px; }
.student-current strong { font-size: 16px; }
.student-stage-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.student-page .student-module {
  min-width: 0;
  min-height: 134px;
  padding: clamp(14px, 1.7vw, 23px);
  border-radius: 13px;
  color: var(--workspace-ink);
  overflow-wrap: anywhere;
}
.student-page article.student-module { border: 1px solid var(--workspace-border); background: var(--workspace-paper); }
.student-page a.student-module { display: grid; grid-template-columns: minmax(0, 1fr); align-content: start; gap: 0; font-weight: 400; }
.student-module h2 { display: flex; align-items: center; gap: 8px; }
.student-module h2 .el-icon { color: var(--workspace-accent); flex: none; }
.student-module p { margin: 5px 0; color: var(--workspace-muted); }
.student-module-link { margin-top: 10px; color: var(--workspace-accent); font-weight: 650; font-size: 13px; }
.student-module .student-actions { gap: 6px; }
.student-module .student-actions .workspace-action { min-height: 36px; font-size: 13px; }
@media (max-width: 600px) {
  .student-dashboard-hero { grid-template-columns: minmax(0, 1fr); }
}
</style>
