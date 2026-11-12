<template>
  <div class="exam-list-page">
    <div class="page-header">
      <div>
        <h2>在线笔试</h2>
        <p class="subtitle">仅显示你选择的导师发布的试卷，进入答题后开始计时</p>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="exams" stripe>
        <el-table-column prop="title" label="试卷" min-width="220" show-overflow-tooltip />
        <el-table-column prop="mentorName" label="导师" width="110" />
        <el-table-column prop="labName" label="实训室" min-width="140" />
        <el-table-column label="答题时间" min-width="280">
          <template #default="{ row }">{{ row.startTime }} ~ {{ row.endTime }}</template>
        </el-table-column>
        <el-table-column label="时长" width="80">
          <template #default="{ row }">{{ row.durationMinutes }} 分钟</template>
        </el-table-column>
        <el-table-column label="总分" width="80">
          <template #default="{ row }">{{ row.totalScore.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="试卷状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.paperStatusText === '进行中' ? 'success' : 'info'">
              {{ row.paperStatusText }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="我的状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.answerStatus === 2 ? 'success' : row.answerStatus === 1 ? 'warning' : 'info'">
              {{ row.answerStatusText }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="得分" width="90">
          <template #default="{ row }">
            {{ row.myScore === null ? '—' : row.myScore.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.canStart || row.answerStatus > 0"
              size="small"
              type="primary"
              plain
              @click="enterExam(row)"
            >
              {{ row.answerStatus === 2 ? '查看答卷' : row.answerStatus === 1 ? '继续答题' : '开始答题' }}
            </el-button>
            <span v-else class="disabled-text">{{ row.paperStatusText === '未开始' ? '未开始' : '已结束' }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && exams.length === 0" description="暂无在线笔试，请等待导师发布" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listMyExams } from '@/api/studentExam'
import type { StudentExamItem } from '@/types/exam'

const router = useRouter()
const loading = ref(false)
const exams = ref<StudentExamItem[]>([])

async function loadData() {
  loading.value = true
  try {
    exams.value = await listMyExams()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function enterExam(row: StudentExamItem) {
  router.push(`/student/exams/${row.paperId}`)
}

onMounted(loadData)
</script>

<style scoped>
.exam-list-page {
  display: flex;
  flex-direction: column;
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

.disabled-text {
  font-size: 13px;
  color: #c0c4cc;
}
</style>
