<template>
  <el-card shadow="never" class="question-card">
    <div class="question-header">
      <span class="question-no">{{ question.questionNo }}.</span>
      <el-tag size="small" type="info">{{ question.questionTypeText }}</el-tag>
      <span class="question-score">{{ question.score.toFixed(2) }} 分</span>
    </div>
    <div class="question-content">{{ question.content }}</div>
    <div class="question-answer">
      <el-radio-group
        v-if="question.questionType === 1"
        :model-value="modelValue"
        :disabled="disabled"
        @update:model-value="onSingle"
      >
        <el-radio
          v-for="(option, index) in question.options"
          :key="index"
          :value="optionKey(index)"
          class="option-item"
        >
          {{ optionKey(index) }}. {{ option }}
        </el-radio>
      </el-radio-group>

      <el-checkbox-group
        v-else-if="question.questionType === 2"
        :model-value="multiValue"
        :disabled="disabled"
        @update:model-value="onMulti"
      >
        <el-checkbox
          v-for="(option, index) in question.options"
          :key="index"
          :value="optionKey(index)"
          class="option-item"
        >
          {{ optionKey(index) }}. {{ option }}
        </el-checkbox>
      </el-checkbox-group>

      <el-radio-group
        v-else-if="question.questionType === 3"
        :model-value="modelValue"
        :disabled="disabled"
        @update:model-value="onSingle"
      >
        <el-radio value="T" class="option-item">正确</el-radio>
        <el-radio value="F" class="option-item">错误</el-radio>
      </el-radio-group>

      <el-input
        v-else
        :model-value="modelValue"
        :disabled="disabled"
        maxlength="2000"
        placeholder="请输入答案"
        @update:model-value="onInput"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StudentExamQuestion } from '@/types/exam'

const props = defineProps<{
  question: StudentExamQuestion
  modelValue: string
  disabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [string]
}>()

const multiValue = computed(() => props.modelValue
  ? props.modelValue.split(',').filter((item) => item !== '')
  : [])

function optionKey(index: number): string {
  return String.fromCharCode(65 + index)
}

function onSingle(value: unknown) {
  emit('update:modelValue', value === null || value === undefined ? '' : String(value))
}

function onMulti(value: unknown) {
  const list = Array.isArray(value) ? value.map((item) => String(item)) : []
  emit('update:modelValue', [...list].sort().join(','))
}

function onInput(value: string) {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.question-card {
  border-left: 4px solid #409eff;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.question-no {
  font-weight: 700;
  color: #303133;
}

.question-score {
  margin-left: auto;
  font-size: 13px;
  color: #909399;
}

.question-content {
  margin-bottom: 14px;
  font-size: 15px;
  line-height: 1.7;
  color: #1f2d3d;
  white-space: pre-wrap;
}

.question-answer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  margin-right: 18px;
}
</style>
