<template>
  <div class="picker">
    <div class="picker-panel">
      <div class="panel-title">
        <span>题库</span>
        <el-input
          v-model="bankKeyword"
          size="small"
          placeholder="搜索题干"
          clearable
          style="width: 180px"
        />
      </div>
      <el-table :data="filteredBank" size="small" height="240">
        <el-table-column label="题型" width="80">
          <template #default="{ row }">{{ row.questionTypeText }}</template>
        </el-table-column>
        <el-table-column prop="content" label="题干" show-overflow-tooltip />
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              text
              :disabled="isSelected(row.id)"
              @click="emit('add', row)"
            >
              {{ isSelected(row.id) ? '已加入' : '加入' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="picker-panel">
      <div class="panel-title">
        <span>已选题目</span>
        <span class="hint">按加入顺序排题号</span>
      </div>
      <el-table :data="selected" size="small" height="240">
        <el-table-column label="题号" width="60">
          <template #default="{ $index }">{{ $index + 1 }}</template>
        </el-table-column>
        <el-table-column prop="content" label="题干" show-overflow-tooltip />
        <el-table-column label="分值" width="120">
          <template #default="{ row }">
            <el-input-number v-model="row.score" :min="0.5" :max="100" :precision="2" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{ $index }">
            <el-button size="small" type="danger" text @click="emit('remove', $index)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="selected.length === 0" description="请从左侧题库加入题目" :image-size="60" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ExamSelectedQuestion, QuestionItem } from '@/types/exam'

const props = defineProps<{
  bank: QuestionItem[]
  selected: ExamSelectedQuestion[]
}>()

const emit = defineEmits<{
  add: [question: QuestionItem]
  remove: [index: number]
}>()

const bankKeyword = ref('')

const filteredBank = computed(() => {
  const text = bankKeyword.value.trim()
  return text ? props.bank.filter((item) => item.content.includes(text)) : props.bank
})

function isSelected(questionId: number): boolean {
  return props.selected.some((item) => item.questionId === questionId)
}
</script>

<style scoped>
.picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 8px;
}

.picker-panel {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 600;
  color: #303133;
}

.hint {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}
</style>
