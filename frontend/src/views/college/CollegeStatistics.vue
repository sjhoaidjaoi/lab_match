<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">数据统计与导出</h2>
          <p class="page-desc">按批次汇总报名、面试、拟录取、确认与录取数据，支持导出 CSV 存档。</p>
        </div>
        <div class="tools">
          <el-button @click="exportSummary">导出汇总表</el-button>
          <el-button @click="exportDetail">导出明细表</el-button>
        </div>
      </div>
    </div>

    <el-row :gutter="14" class="summary">
      <el-col v-for="card in cards" :key="card.label" :xs="12" :sm="8" :lg="4">
        <div class="stat-card">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value">{{ card.value }}</div>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header><span>各实训室数据汇总</span></template>
      <el-table v-loading="loading" :data="dashboard?.perLab || []" stripe show-summary :summary-method="summary">
        <el-table-column prop="laboratoryName" label="实训室" min-width="220" />
        <el-table-column prop="quota" label="计划名额" width="95" align="center" />
        <el-table-column prop="applicationCount" label="报名人数" width="100" align="center" />
        <el-table-column prop="interviewScheduled" label="待面试" width="90" align="center" />
        <el-table-column prop="interviewCompleted" label="面试完成" width="100" align="center" />
        <el-table-column prop="intended" label="拟录取" width="90" align="center" />
        <el-table-column prop="alternate" label="递补" width="80" align="center" />
        <el-table-column prop="confirmed" label="已确认" width="90" align="center" />
        <el-table-column prop="rejected" label="放弃" width="80" align="center" />
        <el-table-column prop="admitted" label="最终录取" width="95" align="center" />
        <el-table-column prop="remaining" label="剩余名额" width="100" align="center" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { CollegeDashboard } from '@/types'
import { exportExcel } from './shared'

const dashboard = ref<CollegeDashboard | null>(null)
const loading = ref(false)

const cards = computed(() => [
  { label: '学生总数', value: dashboard.value?.students.total ?? 0 },
  { label: '已填报', value: dashboard.value?.students.submitted ?? 0 },
  { label: '计划名额', value: dashboard.value?.totals.quota ?? 0 },
  { label: '最终录取', value: dashboard.value?.totals.admitted ?? 0 },
  { label: '剩余名额', value: dashboard.value?.totals.remaining ?? 0 },
  { label: '调剂记录', value: (dashboard.value?.adjustments.INTERNAL ?? 0) + (dashboard.value?.adjustments.CROSS_LAB ?? 0) + (dashboard.value?.adjustments.MANUAL_PLACEMENT ?? 0) }
])

async function load() {
  loading.value = true
  try {
    dashboard.value = await collegeApi.dashboard()
  } catch {
    ElMessage.error('统计数据加载失败')
  } finally {
    loading.value = false
  }
}

function summary({ columns, data }: { columns: Array<{ property: string }>; data: Array<Record<string, number>> }) {
  return columns.map((col, index) => {
    if (index === 0) return '合计'
    if (!col.property || ['laboratoryName'].includes(col.property)) return ''
    return data.reduce((sum, row) => sum + (Number(row[col.property]) || 0), 0)
  })
}

function exportSummary() {
  exportExcel(
    `学院选拔数据汇总-${new Date().toISOString().slice(0, 10)}.csv`,
    ['实训室', '计划名额', '报名人数', '待面试', '面试完成', '拟录取', '递补', '已确认', '放弃', '最终录取', '剩余名额'],
    (dashboard.value?.perLab || []).map((l) => [
      l.laboratoryName, l.quota, l.applicationCount, l.interviewScheduled, l.interviewCompleted,
      l.intended, l.alternate, l.confirmed, l.rejected, l.admitted, l.remaining
    ])
  )
}

async function exportDetail() {
  const [prefs, interviews, admissions] = await Promise.all([
    collegeApi.preferences(), collegeApi.interviews(), collegeApi.admissions()
  ])
  exportExcel(
    `志愿明细-${new Date().toISOString().slice(0, 10)}.csv`,
    ['学号', '姓名', '志愿实训室', '状态'],
    prefs.map((p) => [p.studentNumber, p.studentName, p.laboratoryName, p.status])
  )
  exportExcel(
    `面试明细-${new Date().toISOString().slice(0, 10)}.csv`,
    ['学号', '姓名', '实训室', '面试官', '状态', '综合分', '录取建议'],
    interviews.map((i) => [i.studentNumber, i.studentName, i.laboratoryName, i.interviewerName, i.interviewStatus, i.comprehensiveScore ?? '', i.recommendation])
  )
  exportExcel(
    `拟录取明细-${new Date().toISOString().slice(0, 10)}.csv`,
    ['学号', '姓名', '实训室', '类型', '状态'],
    admissions.map((a) => [a.studentNumber, a.studentName, a.laboratoryName, a.admissionType, a.status])
  )
  ElMessage.success('明细表已导出')
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.tools { display: flex; gap: 10px; }
.summary { margin-bottom: 14px; }
.stat-card { background: #fff; border: 1px solid var(--lm-border); border-radius: var(--lm-radius); padding: 14px 16px; margin-bottom: 12px; }
.stat-label { color: var(--lm-text-secondary); font-size: 12.5px; }
.stat-value { font-size: 24px; font-weight: 600; margin-top: 6px; }
</style>
