<template>
  <el-dialog
    :model-value="modelValue"
    :title="paperId ? '编辑试卷' : '新建试卷'"
    width="920px"
    top="6vh"
    @update:model-value="close"
  >
    <el-form :model="form" label-width="90px" v-loading="loading">
      <el-form-item label="试卷标题" required>
        <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="如：2026 年实验室进组笔试" />
      </el-form-item>
      <el-form-item label="试卷说明">
        <el-input v-model="form.description" type="textarea" :rows="2" maxlength="1000" show-word-limit />
      </el-form-item>
      <el-form-item label="答题时间" required>
        <el-date-picker
          v-model="form.startTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="开始时间"
          style="width: 220px"
        />
        <span class="time-separator">至</span>
        <el-date-picker
          v-model="form.endTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="结束时间"
          style="width: 220px"
        />
      </el-form-item>
      <el-form-item label="答题时长" required>
        <el-input-number v-model="form.durationMinutes" :min="1" :max="300" />
        <span class="unit">分钟</span>
        <span class="total-score">已选 {{ selected.length }} 题，总分 {{ totalScore.toFixed(2) }}</span>
      </el-form-item>
    </el-form>

    <ExamPaperQuestionPicker
      :bank="bank"
      :selected="selected"
      @add="addQuestion"
      @remove="removeQuestion"
    />

    <template #footer>
      <el-button @click="close(false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存草稿</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ExamPaperQuestionPicker from '@/components/ExamPaperQuestionPicker.vue'
import { createExamPaper, getExamPaper, listQuestions, updateExamPaper } from '@/api/teacherExam'
import type { ExamPaperSaveReq, ExamSelectedQuestion, QuestionItem } from '@/types/exam'

const props = defineProps<{
  modelValue: boolean
  paperId: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: []
}>()

const loading = ref(false)
const saving = ref(false)
const bank = ref<QuestionItem[]>([])
const selected = ref<ExamSelectedQuestion[]>([])
const form = reactive({
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  durationMinutes: 60
})

const totalScore = computed(() => selected.value.reduce((sum, item) => sum + (item.score || 0), 0))

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      initDialog()
    }
  }
)

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

function initDialog() {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  form.title = ''
  form.description = ''
  form.startTime = formatDate(start)
  form.endTime = formatDate(end)
  form.durationMinutes = 60
  selected.value = []
  loadBank()
  if (props.paperId) {
    loadPaper(props.paperId)
  }
}

async function loadBank() {
  loading.value = true
  try {
    const page = await listQuestions({ status: 1, pageNum: 1, pageSize: 100 })
    bank.value = page.list
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

async function loadPaper(paperId: number) {
  loading.value = true
  try {
    const detail = await getExamPaper(paperId)
    form.title = detail.title
    form.description = detail.description ?? ''
    form.startTime = detail.startTime
    form.endTime = detail.endTime
    form.durationMinutes = detail.durationMinutes
    selected.value = detail.questions.map((item) => ({
      questionId: item.questionId,
      content: item.content,
      questionTypeText: item.questionTypeText,
      score: item.score
    }))
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function addQuestion(question: QuestionItem) {
  if (selected.value.some((item) => item.questionId === question.id)) {
    return
  }
  selected.value.push({
    questionId: question.id,
    content: question.content,
    questionTypeText: question.questionTypeText,
    score: question.score
  })
}

function removeQuestion(index: number) {
  selected.value.splice(index, 1)
}

function close(visible: boolean) {
  emit('update:modelValue', visible)
}

function validate(): boolean {
  if (!form.title.trim()) {
    ElMessage.warning('请输入试卷标题')
    return false
  }
  if (!form.startTime || !form.endTime) {
    ElMessage.warning('请选择答题时间')
    return false
  }
  if (form.endTime <= form.startTime) {
    ElMessage.warning('结束时间必须晚于开始时间')
    return false
  }
  if (selected.value.length === 0) {
    ElMessage.warning('请至少加入一道题目')
    return false
  }
  return true
}

async function handleSave() {
  if (!validate()) {
    return
  }
  saving.value = true
  const payload: ExamPaperSaveReq = {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    startTime: form.startTime,
    endTime: form.endTime,
    durationMinutes: form.durationMinutes,
    questions: selected.value.map((item) => ({ questionId: item.questionId, score: item.score }))
  }
  try {
    if (props.paperId) {
      await updateExamPaper(props.paperId, payload)
    } else {
      await createExamPaper(payload)
    }
    ElMessage.success('保存成功')
    emit('saved')
    close(false)
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.time-separator {
  margin: 0 8px;
  color: #909399;
}

.unit {
  margin-left: 8px;
  color: #909399;
}

.total-score {
  margin-left: 20px;
  font-size: 13px;
  color: #606266;
}
</style>
