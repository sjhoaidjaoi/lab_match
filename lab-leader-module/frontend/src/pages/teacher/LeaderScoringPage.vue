<template>
  <div class="scoring-page">
    <div class="page-header">
      <div>
        <h2>本室评分汇总</h2>
        <p class="subtitle">各导师独立面试评分，按“学生 + 导师”分别展示，负责人只做汇总</p>
      </div>
    </div>

    <el-card shadow="never">
      <div class="filters">
        <el-input v-model="keyword" placeholder="学号 / 姓名" clearable class="keyword" />
        <el-select v-model="statusFilter" placeholder="评分状态" clearable class="status">
          <el-option label="未评分" :value="0" />
          <el-option label="草稿" :value="1" />
          <el-option label="已提交" :value="2" />
        </el-select>
        <el-button type="primary" plain @click="loadScores">查询</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="scores" stripe>
        <el-table-column prop="studentNo" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column prop="mentorName" label="导师" width="110" />
        <el-table-column prop="sessionName" label="场次" width="110" />
        <el-table-column label="态度" width="80">
          <template #default="{ row }">{{ formatScore(row.attitudeScore) }}</template>
        </el-table-column>
        <el-table-column label="逻辑" width="80">
          <template #default="{ row }">{{ formatScore(row.logicScore) }}</template>
        </el-table-column>
        <el-table-column label="编程" width="80">
          <template #default="{ row }">{{ formatScore(row.programmingScore) }}</template>
        </el-table-column>
        <el-table-column label="时间" width="80">
          <template #default="{ row }">{{ formatScore(row.timeScore) }}</template>
        </el-table-column>
        <el-table-column label="系统总分" width="100">
          <template #default="{ row }">{{ formatScore(row.systemTotal) }}</template>
        </el-table-column>
        <el-table-column label="最终总分" width="100">
          <template #default="{ row }">{{ formatScore(row.finalTotal) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 2 ? 'success' : row.status === 1 ? 'warning' : 'info'">
              {{ row.statusText }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && scores.length === 0" description="暂无评分记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listLeaderScores } from '@/api/leaderScore'
import { getCurrentRound } from '@/api/public'
import type { InterviewScoreRow } from '@/types/interview'

const loading = ref(false)
const keyword = ref('')
const statusFilter = ref<number | ''>('')
const scores = ref<InterviewScoreRow[]>([])
const roundId = ref<number | null>(null)

function formatScore(value: number | null): string {
  return value === null ? '-' : value.toFixed(2)
}

async function loadScores() {
  loading.value = true
  try {
    const round = await getCurrentRound()
    roundId.value = round?.id ?? null
    const page = await listLeaderScores({
      roundId: roundId.value ?? undefined,
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value === '' ? undefined : statusFilter.value,
      pageNum: 1,
      pageSize: 100
    })
    scores.value = page.list
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

onMounted(loadScores)
</script>

<style scoped>
.scoring-page {
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

.filters {
  display: flex;
  gap: 12px;
}

.keyword {
  width: 220px;
}

.status {
  width: 160px;
}
</style>
