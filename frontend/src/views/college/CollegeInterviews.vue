<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">面试进度管理</h2>
          <p class="page-desc">跟进各实训室的面试、正式评价和名单审核。</p>
        </div>
        <el-button @click="exportList">导出 CSV</el-button>
      </div>
    </div>

    <el-card v-loading="loading" shadow="never" class="block">
      <template #header><span>各实训室面试进度</span></template>
      <el-alert v-if="failed" title="面试进度加载失败" type="error" :closable="false"><el-button text @click="load">重试</el-button></el-alert>
      <el-table :data="labProgress" stripe empty-text="暂无本批次数据" @row-click="selectLab">
        <el-table-column prop="laboratoryName" label="实训室" min-width="200" />
        <el-table-column prop="applications" label="报名" width="85" align="center" />
        <el-table-column prop="scheduled" label="已预约 / 进行中" width="124" align="center" />
        <el-table-column prop="completed" label="已完成" width="95" align="center" />
        <el-table-column prop="pendingEvaluation" label="待评价" width="95" align="center" />
        <el-table-column prop="evaluated" label="已评价" width="95" align="center" />
        <el-table-column prop="abnormal" label="异常" width="85" align="center" />
        <el-table-column prop="intended" label="拟录取" width="95" align="center" />
      </el-table>
      <div class="links">
        <router-link to="/college/recruitment-reviews">名单审核 · {{ pendingReviews }} 份待审 →</router-link>
        <router-link to="/college/allocation/cross">跨实训室调剂 →</router-link>
        <router-link to="/college/final-list">最终名单 →</router-link>
      </div>
    </el-card>

    <el-card v-if="policy" shadow="never" class="block">
      <template #header>本批次评分规则</template>
      <p v-if="policyLocked">本批次已有正式评价，评分规则已锁定。</p>
      <el-form :disabled="policyLocked || saving" label-position="top" class="policy-form">
        <el-form-item v-for="dimension in scoreDimensions" :key="dimension.key" :label="dimension.label + '权重 (%)'">
          <el-input-number v-model="policy.weights[dimension.key]" :min="0" :max="100" :precision="0" />
        </el-form-item>
        <el-form-item label="面试官汇总方法">
          <el-select v-model="policy.aggregation"><el-option label="平均分" value="MEAN" /><el-option label="中位数" value="MEDIAN" /></el-select>
        </el-form-item>
        <el-form-item label="复核差值（留空关闭）">
          <el-input-number :model-value="policy.reviewThreshold ?? undefined" :min="0" :max="100" :precision="2"
            @update:model-value="updateThreshold" />
        </el-form-item>
      </el-form>
      <div v-if="!policyLocked" class="links">
        <span>权重合计 {{ totalWeight }}%</span>
        <el-button type="primary" :disabled="!validWeights" :loading="saving" @click="savePolicy">保存规则</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="block-header">
          <span>面试明细</span>
        </div>
      </template>
      <div class="filters">
        <el-input v-model="search" clearable placeholder="搜索姓名、学号或面试官" />
        <el-select v-model="labFilter" clearable placeholder="全部实训室">
          <el-option v-for="lab in labProgress" :key="lab.laboratoryId" :value="lab.laboratoryId" :label="lab.laboratoryName" />
        </el-select>
        <el-select v-model="statusFilter" clearable placeholder="全部面试状态">
          <el-option v-for="(label, key) in appointments" :key="key" :value="key" :label="label" />
        </el-select>
      </div>
      <el-table v-loading="loading" :data="filtered.slice((page - 1) * 20, page * 20)" stripe empty-text="没有匹配的面试">
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
              {{ appointments[row.appointmentStatus] || INTERVIEW_STATUS_LABELS[row.interviewStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="汇总分" width="125" align="center">
          <template #default="{ row }">{{ row.evaluationSummary?.total ?? '—' }} <el-tag v-if="row.evaluationSummary?.review" type="warning" size="small">需复核</el-tag></template>
        </el-table-column>
        <el-table-column label="评价与档案" width="180">
          <template #default="{ row }">
            <InterviewEvaluationRead :interview-id="row.id" />
            <router-link v-if="row.online" :to="{ path: '/college/interview-archives', query: { interviewId: row.id } }">档案 →</router-link>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-if="filtered.length > 20" v-model:current-page="page" :page-size="20" :total="filtered.length" layout="prev,pager,next" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { InterviewDetail } from '@/types'
import InterviewEvaluationRead from '@/views/common/InterviewEvaluationRead.vue'
import { appointments, interviewSelection, scoreDimensions, type ProgressRow, type ScorePolicy } from '@/api/interviewSelection'
import {
  INTERVIEW_STATUS_LABELS, exportExcel, formatTime, statusTag
} from './shared'

const list = ref<InterviewDetail[]>([])
const labProgress = ref<ProgressRow[]>([])
const policy = ref<ScorePolicy | null>(null)
const policyLocked = ref(false)
const loading = ref(false)
const failed = ref(false)
const saving = ref(false)
const statusFilter = ref('')
const search = ref('')
const labFilter = ref<number>()
const page = ref(1)
const pendingReviews = computed(() => labProgress.value.reduce((sum, lab) => sum + lab.pendingLabReview, 0))
const totalWeight = computed(() => Math.round(Object.values(policy.value?.weights || {}).reduce((sum, value) => sum + (value ?? 0), 0) * 100) / 100)
const validWeights = computed(() => totalWeight.value === 100 && Object.values(policy.value?.weights || {}).every(Number.isInteger))
function updateThreshold(value: number | undefined) {
  if (policy.value) policy.value.reviewThreshold = value ?? null
}

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return list.value.filter(row => (!statusFilter.value || row.appointmentStatus === statusFilter.value) &&
    (!labFilter.value || row.laboratoryId === labFilter.value) &&
    (!query || [row.studentName, row.studentNumber, row.interviewerName].some(value => value?.toLowerCase().includes(query))))
})
watch([statusFilter, labFilter, search], () => { page.value = 1 })

function selectLab(lab: ProgressRow) {
  labFilter.value = lab.laboratoryId
}

async function load() {
  loading.value = true
  failed.value = false
  try {
    const [items, progress] = await Promise.all([collegeApi.interviews(), interviewSelection.progress()])
    list.value = items
    labProgress.value = progress.perLab
    policy.value = progress.policy
    policyLocked.value = progress.policyLocked
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function savePolicy() {
  if (!policy.value || saving.value || !validWeights.value) return
  const confirmed = await ElMessageBox.confirm('确认保存本批次评分规则？', '评分规则').then(() => true, () => false)
  if (!confirmed) return
  saving.value = true
  try {
    await interviewSelection.savePolicy(policy.value)
    ElMessage.success('评分规则已保存')
    await load()
  } catch { /* 通用请求层显示错误 */ }
  finally { saving.value = false }
}

function exportList() {
  exportExcel(
    `面试进度-${new Date().toISOString().slice(0, 10)}.csv`,
    ['学号', '姓名', '实训室', '面试官', '面试时间', '状态', '汇总分', '差异复核'],
    filtered.value.map((i) => [
      i.studentNumber, i.studentName, i.laboratoryName, i.interviewerName,
      formatTime(i.interviewTime),
      appointments[i.appointmentStatus || 'UNSCHEDULED'] || INTERVIEW_STATUS_LABELS[i.interviewStatus],
      i.evaluationSummary?.total ?? '', i.evaluationSummary?.review ? '待复核' : ''
    ])
  )
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.block { margin-bottom: 14px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
.filters, .policy-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: 10px; }
.links { display: flex; gap: 12px 20px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
</style>
