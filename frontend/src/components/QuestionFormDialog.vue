<template>
  <el-dialog
    :model-value="modelValue"
    :title="question ? '编辑题目' : '新增题目'"
    width="640px"
    @update:model-value="close"
  >
    <el-form :model="form" label-width="90px">
      <el-form-item label="题型" required>
        <el-radio-group v-model="form.questionType" @change="handleTypeChange">
          <el-radio-button :value="1">单选题</el-radio-button>
          <el-radio-button :value="2">多选题</el-radio-button>
          <el-radio-button :value="3">判断题</el-radio-button>
          <el-radio-button :value="4">填空题</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="题干" required>
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="3"
          maxlength="1000"
          show-word-limit
          placeholder="请输入题干"
        />
      </el-form-item>
      <el-form-item v-if="isChoice" label="选项" required>
        <div class="option-list">
          <div v-for="(_, index) in form.options" :key="index" class="option-row">
            <span class="option-key">{{ optionKey(index) }}</span>
            <el-input v-model="form.options[index]" maxlength="200" placeholder="选项内容" />
            <el-button
              v-if="form.options.length > 2"
              text
              type="danger"
              @click="removeOption(index)"
            >
              删除
            </el-button>
          </div>
          <el-button v-if="form.options.length < 8" text type="primary" @click="form.options.push('')">
            + 添加选项
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="正确答案" required>
        <el-radio-group v-if="form.questionType === 1" v-model="singleAnswer">
          <el-radio v-for="(_, index) in form.options" :key="index" :value="optionKey(index)">
            {{ optionKey(index) }}
          </el-radio>
        </el-radio-group>
        <el-checkbox-group v-else-if="form.questionType === 2" v-model="multiAnswer">
          <el-checkbox v-for="(_, index) in form.options" :key="index" :value="optionKey(index)">
            {{ optionKey(index) }}
          </el-checkbox>
        </el-checkbox-group>
        <el-radio-group v-else-if="form.questionType === 3" v-model="judgeAnswer">
          <el-radio value="T">正确</el-radio>
          <el-radio value="F">错误</el-radio>
        </el-radio-group>
        <el-input
          v-else
          v-model="blankAnswer"
          maxlength="500"
          placeholder="多个可接受答案用 | 分隔，如：TCP|传输控制协议"
        />
      </el-form-item>
      <el-form-item label="分值" required>
        <el-input-number v-model="form.score" :min="0.5" :max="100" :precision="2" :step="0.5" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="close(false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createQuestion, updateQuestion } from '@/api/teacherExam'
import type { QuestionItem, QuestionSaveReq } from '@/types/exam'

const props = defineProps<{
  modelValue: boolean
  question: QuestionItem | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: []
}>()

const saving = ref(false)
const form = reactive<QuestionSaveReq>({
  questionType: 1,
  content: '',
  options: ['', ''],
  correctAnswer: 'A',
  score: 5
})
const singleAnswer = ref('A')
const multiAnswer = ref<string[]>([])
const judgeAnswer = ref('T')
const blankAnswer = ref('')

const isChoice = computed(() => form.questionType === 1 || form.questionType === 2)

const correctAnswer = computed(() => {
  if (form.questionType === 1) {
    return singleAnswer.value
  }
  if (form.questionType === 2) {
    return [...multiAnswer.value].sort().join(',')
  }
  if (form.questionType === 3) {
    return judgeAnswer.value
  }
  return blankAnswer.value.trim()
})

function optionKey(index: number): string {
  return String.fromCharCode(65 + index)
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      initForm()
    }
  }
)

function initForm() {
  const question = props.question
  if (!question) {
    form.questionType = 1
    form.content = ''
    form.options = ['', '']
    form.score = 5
    singleAnswer.value = 'A'
    multiAnswer.value = []
    judgeAnswer.value = 'T'
    blankAnswer.value = ''
    return
  }
  form.questionType = question.questionType
  form.content = question.content
  form.options = question.options.length >= 2 ? [...question.options] : ['', '']
  form.score = question.score
  singleAnswer.value = question.questionType === 1 ? question.correctAnswer : 'A'
  multiAnswer.value = question.questionType === 2
    ? question.correctAnswer.split(',').filter((item) => item !== '')
    : []
  judgeAnswer.value = question.questionType === 3 ? question.correctAnswer : 'T'
  blankAnswer.value = question.questionType === 4 ? question.correctAnswer : ''
}

function handleTypeChange() {
  singleAnswer.value = 'A'
  multiAnswer.value = []
  judgeAnswer.value = 'T'
  blankAnswer.value = ''
  if (isChoice.value && form.options.length < 2) {
    form.options = ['', '']
  }
}

function removeOption(index: number) {
  form.options.splice(index, 1)
  singleAnswer.value = 'A'
  multiAnswer.value = []
}

function close(visible: boolean) {
  emit('update:modelValue', visible)
}

function validate(): boolean {
  if (!form.content.trim()) {
    ElMessage.warning('请输入题干')
    return false
  }
  if (!form.score || form.score <= 0) {
    ElMessage.warning('请输入有效分值')
    return false
  }
  if (isChoice.value) {
    if (form.options.length < 2) {
      ElMessage.warning('选择题至少 2 个选项')
      return false
    }
    if (form.options.some((item) => !item.trim())) {
      ElMessage.warning('选项内容不能为空')
      return false
    }
  }
  if (form.questionType === 2 && multiAnswer.value.length < 2) {
    ElMessage.warning('多选题至少选择两个正确答案')
    return false
  }
  if (!correctAnswer.value) {
    ElMessage.warning('请设置正确答案')
    return false
  }
  return true
}

async function handleSave() {
  if (!validate()) {
    return
  }
  saving.value = true
  const payload: QuestionSaveReq = {
    questionType: form.questionType,
    content: form.content.trim(),
    options: isChoice.value ? form.options.map((item) => item.trim()) : [],
    correctAnswer: correctAnswer.value,
    score: form.score
  }
  try {
    if (props.question) {
      await updateQuestion(props.question.id, payload)
    } else {
      await createQuestion(payload)
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
.option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-key {
  width: 22px;
  font-weight: 600;
  color: #606266;
}
</style>
