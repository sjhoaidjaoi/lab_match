<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">全院数据总览</h2>
      <p class="page-desc">
        {{ dashboard?.batch?.batchName || '暂无进行中的选拔批次' }}
        <template v-if="dashboard?.batch">（{{ dashboard.batch.academicYear }}）</template>
      </p>
    </div>

    <el-row :gutter="14" class="stat-row">
      <el-col v-for="card in statCards" :key="card.label" :xs="12" :sm="8" :lg="4">
        <div class="stat-card">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value">{{ card.value }}<span v-if="card.unit" class="stat-unit">{{ card.unit }}</span></div>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="never" class="block">
      <template #header>
        <div class="block-header">
          <span>八阶段进度</span>
          <el-tag v-if="dashboard?.currentStage" :type="statusTag(dashboard.currentStage.stageStatus)" effect="light">
            {{ dashboard.currentStage.stageName }} · {{ STAGE_STATUS_LABELS[dashboard.currentStage.stageStatus] }}
          </el-tag>
        </div>
      </template>
      <el-steps :active="activeStep" finish-status="success" align-center>
        <el-step v-for="s in dashboard?.stages || []" :key="s.id" :title="`${s.stageNumber}. ${s.stageName}`" :description="formatTime(s.endTime)" />
      </el-steps>
    </el-card>

    <el-card shadow="never" class="block">
      <template #header>
        <div class="block-header">
          <span>各实训室选拔进度</span>
          <el-button text type="primary" @click="router.push('/college/statistics')">查看统计报表</el-button>
        </div>
      </template>
      <el-table :data="dashboard?.perLab || []" stripe>
        <el-table-column prop="laboratoryName" label="实训室" min-width="200" />
        <el-table-column prop="quota" label="计划名额" width="90" align="center" />
        <el-table-column prop="applicationCount" label="报名" width="80" align="center" />
        <el-table-column label="面试（待/完成）" width="130" align="center">
          <template #default="{ row }">{{ row.interviewScheduled }} / {{ row.interviewCompleted }}</template>
        </el-table-column>
        <el-table-column prop="intended" label="拟录取" width="90" align="center" />
        <el-table-column prop="alternate" label="递补" width="80" align="center" />
        <el-table-column prop="confirmed" label="已确认" width="90" align="center" />
        <el-table-column prop="rejected" label="放弃" width="80" align="center" />
        <el-table-column prop="admitted" label="最终录取" width="95" align="center" />
        <el-table-column label="剩余名额" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.remaining > 0 ? 'warning' : 'success'" effect="plain">{{ row.remaining }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-row :gutter="14">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="block">
          <template #header><span>待处理事项</span></template>
          <ul class="todo-list">
            <li v-for="item in todoItems" :key="item.path">
              <div>
                <div class="todo-title">{{ item.title }}</div>
                <div class="todo-desc">{{ item.desc }}</div>
              </div>
              <el-button size="small" text type="primary" @click="router.push(item.path)">去处理</el-button>
            </li>
          </ul>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="block">
          <template #header><span>快捷入口</span></template>
          <div class="shortcuts">
            <el-button v-for="s in shortcuts" :key="s.path" @click="router.push(s.path)">{{ s.title }}</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { CollegeDashboard } from '@/types'
import { STAGE_STATUS_LABELS, formatTime, statusTag } from './shared'

const router = useRouter()
const dashboard = ref<CollegeDashboard | null>(null)
const loading = ref(false)

const activeStep = computed(() => {
  const current = dashboard.value?.currentStage
  if (!current) return 0
  return current.stageStatus === 'COMPLETED' ? current.stageNumber : current.stageNumber - 1
})

const statCards = computed(() => [
  { label: '学生总数', value: dashboard.value?.students.total ?? 0, unit: '人' },
  { label: '已填报志愿', value: dashboard.value?.students.submitted ?? 0, unit: '人' },
  { label: '未填报', value: dashboard.value?.students.unsubmitted ?? 0, unit: '人' },
  { label: '计划名额', value: dashboard.value?.totals.quota ?? 0, unit: '个' },
  { label: '最终录取', value: dashboard.value?.totals.admitted ?? 0, unit: '人' },
  { label: '剩余名额', value: dashboard.value?.totals.remaining ?? 0, unit: '个' }
])

const todoItems = computed(() => [
  {
    title: `待审核调剂 ${(dashboard.value?.adjustments.INTERNAL ?? 0) + (dashboard.value?.adjustments.CROSS_LAB ?? 0) + (dashboard.value?.adjustments.MANUAL_PLACEMENT ?? 0)} 条`,
    desc: '内部调剂汇总、跨实训室调剂与沟通安置统一在学院端审核',
    path: '/college/allocation/cross'
  },
  {
    title: `未落实学生 ${Math.max((dashboard.value?.students.submitted ?? 0) - (dashboard.value?.totals.admitted ?? 0), 0)} 人`,
    desc: '查看尚未产生拟录取确认或调剂结果的学生并进行沟通安置',
    path: '/college/allocation/placement'
  },
  {
    title: `已确认 ${dashboard.value?.lists.confirmed ?? 0} 人 / 放弃 ${dashboard.value?.lists.rejected ?? 0} 人`,
    desc: '核对拟录取确认结果，及时释放逾期名额',
    path: '/college/confirmation'
  }
])

const shortcuts = [
  { title: '批次管理', path: '/college/batches' },
  { title: '阶段时间', path: '/college/stages' },
  { title: '学生管理', path: '/college/students' },
  { title: '实训室管理', path: '/college/labs' },
  { title: '教师及组长', path: '/college/staff' },
  { title: '面试进度', path: '/college/interviews' },
  { title: '最终名单', path: '/college/final-list' },
  { title: '结果公示', path: '/college/publicity' }
]

async function load() {
  loading.value = true
  try {
    dashboard.value = await collegeApi.dashboard()
  } catch {
    ElMessage.error('总览数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.stat-row { margin-bottom: 14px; }
.stat-card { background: #fff; border: 1px solid var(--lm-border); border-radius: var(--lm-radius); padding: 14px 16px; margin-bottom: 12px; }
.stat-label { color: var(--lm-text-secondary); font-size: 12.5px; }
.stat-value { font-size: 24px; font-weight: 600; margin-top: 6px; color: #1f2937; }
.stat-unit { font-size: 12px; font-weight: 400; color: var(--lm-text-secondary); margin-left: 3px; }
.block { margin-bottom: 14px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
.todo-list { list-style: none; margin: 0; padding: 0; }
.todo-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px dashed var(--lm-border); }
.todo-list li:last-child { border-bottom: none; }
.todo-title { font-weight: 600; margin-bottom: 3px; }
.todo-desc { color: var(--lm-text-secondary); font-size: 12.5px; }
.shortcuts { display: flex; flex-wrap: wrap; gap: 10px; }
</style>
