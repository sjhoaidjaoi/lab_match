<template>
  <div v-loading="loading" class="take-page">
    <div class="page-header">
      <div>
        <h2>{{ detail?.title || '在线笔试' }}</h2>
        <p class="subtitle" v-if="detail">
          {{ detail.labName }} · {{ detail.mentorName }} · 总分 {{ detail.totalScore.toFixed(2) }}
        </p>
      </div>
      <div class="header-actions">
        <el-button @click="router.push('/student/exams')">返回列表</el-button>
        <el-tag v-if="detail && !submitted" size="large" :type="remaining <= 300 ? 'danger' : 'warning'">
          剩余 {{ countdownText }}
        </el-tag>
        <el-tag v-else-if="detail" size="large" type="success">已交卷</el-tag>
      </div>
    </div>

    <el-alert v-if="detail" type="info" :closable="false" show-icon>
      <template #title>
        答题时间：{{ detail.startTime }} ~ {{ detail.endTime }}，限时 {{ detail.durationMinutes }} 分钟。
        暂存后仍可修改，交卷后不可更改。
      </template>
    </el-alert>

    <el-alert v-if="submitted" type="success" :closable="false" show-icon>
      <template #title>
        本次得分 {{ scoreText }} / {{ detail?.totalScore.toFixed(2) ?? '—' }}
        <span v-if="result">（答对 {{ result.correctCount }} / {{ result.questionCount }} 题）</span>
      </template>
    </el-alert>

    <div v-if="detail" class="question-list">
      <ExamQuestionCard
        v-for="question in detail.questions"
        :key="question.questionId"
        :question="question"
        :model-value="answers[String(question.questionId)] || ''"
        :disabled="submitted"
        @update:model-value="onAnswer(question.questionId, $event)"
      />
    </div>

    <div v-if="detail && !submitted" class="footer-bar">
      <span class="save-hint">{{ saving ? '保存中…' : '作答将自动暂存' }}</span>
      <el-button :loading="saving" @click="handleSave">保存草稿</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">交卷</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import ExamQuestionCard from '@/components/ExamQuestionCard.vue'
import { getMyExam, saveExamAnswers, startExam, submitExam } from '@/api/studentExam'
import type { ExamSubmitResp, StudentExamDetail } from '@/types/exam'

const route = useRoute()
const router = useRouter()
const paperId = Number(route.params.paperId)

const loading = ref(true)
const saving = ref(false)
const submitting = ref(false)
const detail = ref<StudentExamDetail | null>(null)
const answers = reactive<Record<string, string>>({})
const submitted = ref(false)
const result = ref<ExamSubmitResp | null>(null)
const remaining = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let autoSubmitting = false

const countdownText = computed(() => {
  const total = Math.max(0, remaining.value)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
})
const scoreText = computed(() => {
  if (result.value) {
    return result.value.totalScore.toFixed(2)
  }
  return detail.value?.myScore === null || detail.value?.myScore === undefined
    ? '—' : detail.value.myScore.toFixed(2)
})

function applyDetail(data: StudentExamDetail) {
  detail.value = data
  Object.keys(answers).forEach((key) => {
    delete answers[key]
  })
  data.questions.forEach((question) => {
    answers[String(question.questionId)] = question.answerContent ?? ''
  })
  submitted.value = data.answerStatus === 2
  remaining.value = data.remainingSeconds
  if (submitted.value) {
    stopCountdown()
  } else {
    startCountdown()
  }
}

async function loadExam() {
  loading.value = true
  try {
    const data = await startExam(paperId)
    applyDetail(data)
  } catch {
    router.replace('/student/exams')
  } finally {
    loading.value = false
  }
}

async function refreshDetail() {
  try {
    applyDetail(await getMyExam(paperId))
  } catch {
    // 错误提示已由请求层统一处理
  }
}

function startCountdown() {
  stopCountdown()
  countdownTimer = setInterval(() => {
    if (remaining.value <= 0) {
      return
    }
    remaining.value -= 1
    if (remaining.value === 0) {
      autoSubmit()
    }
  }, 1000)
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function onAnswer(questionId: number, value: string) {
  answers[String(questionId)] = value
  scheduleSave()
}

function scheduleSave() {
  if (submitted.value) {
    return
  }
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => saveDraft(false), 800)
}

async function saveDraft(showMessage: boolean) {
  if (!detail.value || submitted.value) {
    return
  }
  saving.value = true
  try {
    const items = detail.value.questions.map((question) => ({
      questionId: question.questionId,
      answerContent: answers[String(question.questionId)] || ''
    }))
    const resp = await saveExamAnswers(paperId, items)
    remaining.value = resp.remainingSeconds
    if (resp.answerStatus === 2) {
      ElMessage.warning('答题时间已结束，系统已自动交卷')
      await refreshDetail()
    } else if (showMessage) {
      ElMessage.success('已保存')
    }
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}

async function handleSave() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  await saveDraft(true)
}

async function handleSubmit() {
  try {
    await ElMessageBox.confirm('交卷后不可再修改答案，确认交卷？', '交卷确认', { type: 'warning' })
  } catch {
    return
  }
  submitting.value = true
  try {
    result.value = await submitExam(paperId)
    submitted.value = true
    stopCountdown()
    ElMessage.success('交卷成功')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    submitting.value = false
  }
}

async function autoSubmit() {
  if (autoSubmitting || submitted.value) {
    return
  }
  autoSubmitting = true
  try {
    result.value = await submitExam(paperId)
    submitted.value = true
    stopCountdown()
    ElMessage.warning('答题时间已到，系统已自动交卷')
  } catch {
    await refreshDetail()
  } finally {
    autoSubmitting = false
  }
}

onMounted(loadExam)
onBeforeUnmount(() => {
  stopCountdown()
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
})
</script>

<style scoped>
.take-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 72px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.footer-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 220px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 24px;
  background: #fff;
  border-top: 1px solid #ebeef5;
  box-shadow: 0 -2px 8px rgb(0 0 0 / 4%);
}

.save-hint {
  margin-right: auto;
  font-size: 13px;
  color: #909399;
}
</style>
