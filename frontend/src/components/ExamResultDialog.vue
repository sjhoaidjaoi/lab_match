<template>
  <el-dialog
    :model-value="modelValue"
    :title="`参考结果 · ${paperTitle || ''}`"
    width="760px"
    @update:model-value="close"
  >
    <div class="summary">
      <span>应考 {{ total }} 人</span>
      <span>已提交 {{ submittedCount }} 人</span>
      <span>平均分 {{ averageScore }}</span>
    </div>
    <el-table v-loading="loading" :data="results" size="small" height="420">
      <el-table-column prop="studentNo" label="学号" width="140" />
      <el-table-column prop="studentName" label="姓名" width="100" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 2 ? 'success' : row.status === 1 ? 'warning' : 'info'">
            {{ row.statusText }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="开始时间" width="170">
        <template #default="{ row }">{{ row.startTime || '—' }}</template>
      </el-table-column>
      <el-table-column label="交卷时间" width="170">
        <template #default="{ row }">{{ row.submitTime || '—' }}</template>
      </el-table-column>
      <el-table-column label="得分" width="100">
        <template #default="{ row }">
          {{ row.score === null ? '—' : row.score.toFixed(2) }}
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="close(false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { listExamResults } from '@/api/teacherExam'
import type { ExamResultItem } from '@/types/exam'

const props = defineProps<{
  modelValue: boolean
  paperId: number | null
  paperTitle: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

const loading = ref(false)
const results = ref<ExamResultItem[]>([])
const total = ref(0)

const submittedCount = computed(() => results.value.filter((item) => item.status === 2).length)
const averageScore = computed(() => {
  const scores = results.value
    .filter((item) => item.status === 2 && item.score !== null)
    .map((item) => item.score as number)
  if (scores.length === 0) {
    return '—'
  }
  const sum = scores.reduce((acc, item) => acc + item, 0)
  return (sum / scores.length).toFixed(2)
})

watch(
  () => props.modelValue,
  (visible) => {
    if (visible && props.paperId) {
      loadResults(props.paperId)
    }
  }
)

async function loadResults(paperId: number) {
  loading.value = true
  try {
    const page = await listExamResults(paperId, { pageNum: 1, pageSize: 100 })
    results.value = page.list
    total.value = page.total
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function close(visible: boolean) {
  emit('update:modelValue', visible)
}
</script>

<style scoped>
.summary {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #606266;
}
</style>
