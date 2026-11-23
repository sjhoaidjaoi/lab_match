<template>
  <section v-loading="loading" class="student-page portal-home student-home">
    <header class="page-header selection-heading">
      <p class="selection-context">{{ batch?.batchName || '学生工作台' }}<span v-if="auth.user?.realName"> · {{ auth.user.realName }}</span></p>
      <h1>我的实训室选拔</h1>
      <section class="student-progress" aria-label="完整选拔流程">
        <div class="progress-heading">
          <h2>选拔进度</h2>
          <span v-if="batch && !unavailable.has('batch')">已结束 {{ completedStages }} / {{ orderedStages.length }} 个阶段</span>
        </div>
        <p v-if="unavailable.has('batch')">流程暂未读取</p>
        <ol v-else-if="batch" class="student-timeline">
          <li v-for="stage in orderedStages" :key="stage.stageNumber"
            :class="{ active: stage.stageNumber === currentStage?.no, done: stage.stageStatus === 'COMPLETED' }">
            <RouterLink :to="stageLink(stage.stageNumber)" :aria-current="stage.stageNumber === currentStage?.no ? 'step' : undefined">
              <span class="student-step">{{ stage.stageNumber }}</span>{{ stage.stageName }}
              <small>{{ stageStatusText(stage.stageStatus) }}</small>
            </RouterLink>
          </li>
        </ol>
        <p v-else-if="!loading">暂无进行中的选拔批次</p>
      </section>
      <div class="stage-line">
        <span class="stage-label">当前阶段</span>
        <strong>{{ statusText('batch', currentStage?.name || '暂无进行中的阶段') }}</strong>
        <span v-if="stageEnd && !unavailable.has('batch')">截止 {{ formatDateTime(stageEnd) }}</span>
        <RouterLink v-if="currentStage && !unavailable.has('batch')" class="stage-action" :to="stageLink(currentStage.no)">
          {{ stageAction }} <span aria-hidden="true">→</span>
        </RouterLink>
      </div>
    </header>
    <el-alert v-if="unavailable.size" title="部分数据加载失败" type="warning" :closable="false">
      <el-button text @click="load">重新加载</el-button>
    </el-alert>
    <WorkspaceShortcuts title="我的选拔事项" :items="shortcuts" />

    <aside class="selection-notices">
      <div class="notice-heading">
        <h2>学院通知</h2>
        <RouterLink to="/student/messages">消息通知（{{ statusText('notices', unreadCount + ' 条未读') }}） →</RouterLink>
      </div>
      <details v-for="notice in visibleAnnouncements" :key="notice.id">
        <summary>{{ notice.title }}<small>{{ formatDateTime(notice.createdAt) }}</small></summary>
        <p>{{ notice.content || '暂无正文' }}</p>
      </details>
      <p v-if="unavailable.has('announcements')">学院公告暂未读取</p>
      <p v-else-if="!announcements.length && !loading">暂无学院公告</p>
    </aside>
  </section>
</template>

<script setup lang="ts">
import WorkspaceShortcuts from '@/components/WorkspaceShortcuts.vue'
import { stages } from '@/config/stages'
import { computed, onMounted, ref, type Ref } from 'vue'
import type { AnnouncementItem, NoticeItem, PreferenceItem, PublicationInfo } from '@/types'
import { useAuthStore } from '@/stores/auth'
import {
  formatDateTime, studentApi, type CurrentBatch, type StudentAdjustmentRecord,
  type StudentAdmission, type StudentInterview
} from '@/api/student'

const stageLinks = [
  '/student/announcement', '/student/labs', '/student/application', '/student/interview',
  '/student/admission-confirmation', '/student/supplement', '/student/allocation', '/student/result'
]
const stageActions = ['查看集中宣讲', '参加开放日', '填报志愿', '查看面试安排', '确认拟录取', '填报补录志愿', '查看统筹调剂', '查看最终结果']
const statusLabels: Record<string, string> = {
  NOT_STARTED: '未开始', IN_PROGRESS: '进行中', COMPLETED: '已结束', PAUSED: '已暂停'
}

const loading = ref(false)
const auth = useAuthStore()
type Section = 'batch' | 'preferences' | 'interviews' | 'admissions' | 'adjustments' | 'notices' | 'result' | 'announcements'
const unavailable = ref(new Set<Section>())
const announcements = ref<AnnouncementItem[]>([])
const batch = ref<CurrentBatch | null>(null)
const preferences = ref<PreferenceItem[]>([])
const interviews = ref<StudentInterview[]>([])
const admissions = ref<StudentAdmission[]>([])
const adjustments = ref<StudentAdjustmentRecord[]>([])
const notices = ref<NoticeItem[]>([])
const publication = ref<PublicationInfo | null>(null)

const currentStage = computed(() => batch.value?.currentStage ?? null)
const orderedStages = computed(() => stages.map(stage => {
  const scheduled = batch.value?.stages?.find(item => item.stageNumber === stage.no)
  return { stageNumber: stage.no, stageName: scheduled?.stageName || stage.name, stageStatus: scheduled?.stageStatus, endTime: scheduled?.endTime }
}))
const completedStages = computed(() => orderedStages.value.filter(stage => stage.stageStatus === 'COMPLETED').length)
const stageEnd = computed(() => orderedStages.value.find(stage => stage.stageNumber === currentStage.value?.no)?.endTime)
const pendingAdmissions = computed(() =>
  admissions.value.filter((item) => item.admissionType === 'INTENDED' && item.status === 'PENDING').length
)
const pendingAdjustments = computed(() => adjustments.value.filter((item) => item.status === 'PENDING').length)
const unreadCount = computed(() => notices.value.filter((item) => !item.read).length)

const visibleAnnouncements = computed(() => unavailable.value.has('announcements') ? [] : announcements.value.slice(0, 5))

function statusText(section: Section, value: string) {
  if (loading.value) return '正在读取'
  return unavailable.value.has(section) ? '暂未读取' : value
}

const shortcuts = computed(() => [
  { path: '/student/application', title: '填报志愿', icon: 'EditPen', detail: statusText('preferences', preferences.value.length ? `已填报 ${preferences.value.length} 个平行志愿` : '暂无提交记录') },
  { path: '/student/interview', title: '查看面试安排', icon: 'Calendar', detail: statusText('interviews', `共 ${interviews.value.length} 条安排`) },
  { path: '/student/admission-confirmation', title: '确认拟录取', icon: 'CircleCheck', detail: statusText('admissions', `待确认 ${pendingAdmissions.value} 条`) },
  { path: '/student/allocation', title: '查看调剂通知', icon: 'Connection', detail: statusText('adjustments', `待处理 ${pendingAdjustments.value} 条`) },
  { path: '/student/result', title: '查询录取结果', icon: 'Trophy', detail: statusText('result', publication.value ? '全院名单已公示' : '暂未公布') }
])

const stageAction = computed(() => {
  const no = currentStage.value?.no
  if (no === 5 && (unavailable.value.has('admissions') || !pendingAdmissions.value)) return '查看拟录取通知'
  return no ? stageActions[no - 1] || '查看当前阶段' : ''
})

function stageLink(no: number) {
  return stageLinks[no - 1] ?? '/student/dashboard'
}
function stageStatusText(status?: string) {
  return status ? statusLabels[status] ?? status : '待安排'
}

async function readSection<T>(section: Section, request: Promise<T>, target: Ref<T>) {
  try {
    target.value = await request
    unavailable.value.delete(section)
  } catch (error) {
    unavailable.value.add(section)
    console.error('学生工作台数据读取失败', section, error)
  }
}

async function load() {
  if (loading.value) return
  loading.value = true
  try {
    await Promise.all([
      readSection('batch', studentApi.batchesCurrent(), batch),
      readSection('preferences', studentApi.myPreferences(), preferences),
      readSection('interviews', studentApi.myInterviews(), interviews),
      readSection('admissions', studentApi.myAdmissions(), admissions),
      readSection('adjustments', studentApi.myAdjustments(), adjustments),
      readSection('notices', studentApi.myNotices(), notices),
      readSection('result', studentApi.publication(), publication),
      readSection('announcements', studentApi.announcements(), announcements)
    ])
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.student-page.student-home { gap: 0; }
.selection-heading { padding-bottom: 24px; }
.selection-heading .selection-context { color: var(--workspace-muted); font-size: 13px; margin: 0 0 6px; }
.selection-heading h1 { color: var(--workspace-ink); font-size: clamp(25px, 3vw, 34px); }
.stage-line { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-top: 16px; color: var(--workspace-muted); font-size: 13px; }
.stage-line strong { color: var(--workspace-ink); font-size: 15px; }
.stage-label { border-left: 3px solid var(--workspace-accent); padding-left: 8px; }
.stage-line a.stage-action { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; color: white; background: var(--lm-primary-dark); border-radius: 5px; font-weight: 650; }
.stage-action:hover { filter: brightness(.93); }
.student-progress { margin-top: 16px; }
.progress-heading { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 14px; }
.selection-heading .progress-heading h2 { font-size: 16px; }
.progress-heading span { font-size: 13px; color: var(--workspace-muted); }
.student-progress .student-timeline li.done::before { border-color: var(--workspace-accent); }
.student-progress .active .student-step, .student-progress .done .student-step { background: var(--lm-primary-dark); color: white; }
.selection-notices small { margin-inline-start: 12px; color: var(--workspace-muted); font-size: 13px; font-weight: 400; }
.selection-notices { padding-top: 20px; }
.notice-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.selection-notices details { padding-block: 10px; border-bottom: 1px solid var(--portal-line); }
.selection-notices p { color: var(--workspace-muted); }
</style>
