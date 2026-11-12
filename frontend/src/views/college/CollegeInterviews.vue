<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">面试进度管理</h2>
          <p class="page-desc">掌握各实训室面试安排与完成情况；评分与录取建议由实训室教师填写。</p>
        </div>
        <el-button @click="exportList">导出 CSV</el-button>
      </div>
    </div>

    <el-card shadow="never" class="block">
      <template #header><span>各实训室面试进度</span></template>
      <el-table :data="labProgress" stripe>
        <el-table-column prop="laboratoryName" label="实训室" min-width="200" />
        <el-table-column prop="quota" label="计划名额" width="95" align="center" />
        <el-table-column prop="interviewScheduled" label="待面试" width="95" align="center" />
        <el-table-column prop="interviewCompleted" label="已完成" width="95" align="center" />
        <el-table-column label="完成率" min-width="180">
          <template #default="{ row }">
            <el-progress :percentage="rate(row.interviewScheduled, row.interviewCompleted)" :stroke-width="8" />
          </template>
        </el-table-column>
        <el-table-column prop="intended" label="建议拟录取" width="110" align="center" />
        <el-table-column prop="alternate" label="建议递补" width="100" align="center" />
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="block-header">
          <span>面试明细</span>
          <el-radio-group v-model="statusFilter" size="small">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="SCHEDULED">待面试</el-radio-button>
            <el-radio-button value="COMPLETED">已完成</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-table v-loading="loading" :data="filtered" stripe>
        <el-table-column prop="studentNumber" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column prop="laboratoryName" label="实训室" min-width="200" />
        <el-table-column prop="interviewerName" label="面试官" width="100" />
        <el-table-column label="面试时间" width="170">
          <template #default="{ row }">{{ formatTime(row.interviewTime) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.interviewStatus)" effect="light">
              {{ INTERVIEW_STATUS_LABELS[row.interviewStatus] || row.interviewStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="comprehensiveScore" label="综合分" width="90" align="center">
          <template #default="{ row }">{{ row.comprehensiveScore ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="录取建议" width="130" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.recommendation)" effect="plain">
              {{ RECOMMENDATION_LABELS[row.recommendation] || row.recommendation }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { CollegeDashboard, InterviewDetail } from '@/types'
import {
  INTERVIEW_STATUS_LABELS, RECOMMENDATION_LABELS, exportExcel, formatTime, statusTag
} from './shared'

const list = ref<InterviewDetail[]>([])
const labProgress = ref<CollegeDashboard['perLab']>([])
const loading = ref(false)
const statusFilter = ref('')

const filtered = computed(() =>
  statusFilter.value ? list.value.filter((i) => i.interviewStatus === statusFilter.value) : list.value
)

function rate(scheduled: number, completed: number) {
  const total = scheduled + completed
  return total === 0 ? 0 : Math.round((completed / total) * 100)
}

async function load() {
  loading.value = true
  try {
    const [items, dashboard] = await Promise.all([collegeApi.interviews(), collegeApi.dashboard()])
    list.value = items
    labProgress.value = dashboard.perLab
  } catch {
    ElMessage.error('面试数据加载失败')
  } finally {
    loading.value = false
  }
}

function exportList() {
  exportExcel(
    `面试进度-${new Date().toISOString().slice(0, 10)}.csv`,
    ['学号', '姓名', '实训室', '面试官', '面试时间', '状态', '综合分', '录取建议', '评语'],
    filtered.value.map((i) => [
      i.studentNumber, i.studentName, i.laboratoryName, i.interviewerName,
      formatTime(i.interviewTime),
      INTERVIEW_STATUS_LABELS[i.interviewStatus] || i.interviewStatus,
      i.comprehensiveScore ?? '', i.recommendation ? RECOMMENDATION_LABELS[i.recommendation] || i.recommendation : '',
      i.evaluation || ''
    ])
  )
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.block { margin-bottom: 14px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
</style>
