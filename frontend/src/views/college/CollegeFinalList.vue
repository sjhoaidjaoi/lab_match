<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">最终名单管理</h2>
          <p class="page-desc">合并「已确认的拟录取」与「已确认的调剂」生成最终名单，并支持确认正式入组。</p>
        </div>
        <div class="tools">
          <el-button type="warning" :loading="merging" @click="merge">合并生成最终名单</el-button>
          <el-button @click="exportList">导出 CSV</el-button>
        </div>
      </div>
    </div>

    <el-row :gutter="14" class="summary">
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">批次</div><div class="stat-value small">{{ data?.batchName || '—' }}</div></div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">最终录取</div><div class="stat-value">{{ total }}</div></div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">已正式入组</div><div class="stat-value">{{ enrolled }}</div></div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">计划名额</div><div class="stat-value">{{ quotaTotal }}</div></div>
      </el-col>
    </el-row>

    <el-card shadow="never" class="block">
      <template #header>
        <div class="block-header">
          <span>名单校验与审核</span>
          <el-tag v-if="check?.review" :type="check.review.status === 'APPROVED' ? 'success' : 'danger'" effect="light">
            审核{{ check.review.status === 'APPROVED' ? '通过' : '驳回' }}
          </el-tag>
          <el-tag v-else type="warning" effect="light">待审核</el-tag>
        </div>
      </template>
      <el-alert
        v-if="check && (check.overQuota.length || check.duplicates.length)"
        type="error" :closable="false" show-icon title="校验未通过"
      >
        <div v-if="check.overQuota.length">
          超额实训室：{{ check.overQuota.map((l) => `${l.laboratoryName} ${l.count}/${l.quota}`).join('；') }}
        </div>
        <div v-if="check.duplicates.length">
          重复录取：{{ check.duplicates.map((d) => d.studentName).join('、') }}
        </div>
      </el-alert>
      <el-alert
        v-else-if="check"
        type="success" :closable="false" show-icon
        :title="`校验通过：无超额、无重复录取；已录取 ${check.admittedTotal} 人，未落实 ${check.unplacedCount} 人`"
      />
      <div class="check-actions">
        <el-button @click="loadCheck">重新校验</el-button>
        <el-button type="success" :disabled="!check?.canReview" @click="review('APPROVED')">审核通过</el-button>
        <el-button type="danger" plain @click="review('REJECTED')">驳回名单</el-button>
        <el-button type="primary" :disabled="check?.review?.status !== 'APPROVED'" @click="enrollAll">批量确认正式入组</el-button>
      </div>
      <div class="muted hint">批量入组需先审核通过，且公示结束后方可操作（公示未结束时后端会拒绝）。</div>
    </el-card>

    <el-card v-for="lab in data?.perLab || []" :key="lab.laboratoryId" shadow="never" class="block">
      <template #header>
        <div class="block-header">
          <span>{{ lab.laboratoryName }}</span>
          <span class="muted">{{ lab.students.length }} / {{ lab.quota }} 人</span>
        </div>
      </template>
      <el-table :data="lab.students" stripe size="small">
        <el-table-column prop="studentNumber" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column label="录取来源" min-width="160">
          <template #default="{ row }">{{ SOURCE_LABELS[row.admissionSource] || row.admissionSource }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.finalStatus)" effect="light">
              {{ FINAL_STATUS_LABELS[row.finalStatus] || row.finalStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="center">
          <template #default="{ row }">
            <el-button v-if="row.finalStatus !== 'ENROLLED'" size="small" text type="primary" @click="enroll(row)">
              确认入组
            </el-button>
            <span v-else class="muted">已入组</span>
          </template>
        </el-table-column>
        <template #empty><span class="muted">暂无录取学生</span></template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { FinalAdmissionDetail, FinalCheck } from '@/types'
import { FINAL_STATUS_LABELS, SOURCE_LABELS, exportExcel, statusTag } from './shared'

interface LabGroup {
  laboratoryId: number
  laboratoryName: string
  quota: number
  students: FinalAdmissionDetail[]
}
const data = ref<{ batchId: number; batchName: string; perLab: LabGroup[] } | null>(null)
const check = ref<FinalCheck | null>(null)
const merging = ref(false)

const allStudents = computed(() => (data.value?.perLab || []).flatMap((l) => l.students))
const total = computed(() => allStudents.value.length)
const enrolled = computed(() => allStudents.value.filter((s) => s.finalStatus === 'ENROLLED').length)
const quotaTotal = computed(() => (data.value?.perLab || []).reduce((s, l) => s + l.quota, 0))

async function load() {
  data.value = await collegeApi.finalList()
  await loadCheck()
}

async function loadCheck() {
  check.value = await collegeApi.finalCheck()
}

async function review(status: string) {
  const action = status === 'APPROVED' ? '审核通过' : '驳回'
  const { value } = await ElMessageBox.prompt(`确认${action}当前最终录取名单？`, `${action}名单`, {
    inputPlaceholder: '审核意见（选填）', inputValue: ''
  })
  await collegeApi.reviewFinal(status, value || '')
  ElMessage.success(`已${action}`)
  await loadCheck()
}

async function enrollAll() {
  await ElMessageBox.confirm('确认将当前名单内全部「拟录取」学生标记为正式入组？', '批量入组', { type: 'warning' })
  try {
    const res = await collegeApi.enrollAll()
    ElMessage.success(`已确认入组 ${res.enrolled} 人`)
    await load()
  } catch {
    /* 错误提示由请求拦截器统一处理 */
  }
}

async function merge() {
  await ElMessageBox.confirm('合并将依据「已确认拟录取 + 已确认调剂」重新生成最终名单，是否继续？', '合并最终名单', { type: 'warning' })
  merging.value = true
  try {
    const res = await collegeApi.mergeFinal()
    ElMessage.success(`最终名单已生成，共 ${res.merged} 人`)
    await load()
  } finally {
    merging.value = false
  }
}

async function enroll(row: FinalAdmissionDetail) {
  await ElMessageBox.confirm(`确认 ${row.studentName} 正式入组？`, '正式入组', { type: 'info' })
  await collegeApi.enroll(row.id)
  ElMessage.success('已确认入组')
  await load()
}

function exportList() {
  exportExcel(
    `最终录取名单-${new Date().toISOString().slice(0, 10)}.csv`,
    ['实训室', '学号', '姓名', '录取来源', '最终状态'],
    (data.value?.perLab || []).flatMap((l) =>
      l.students.map((s) => [
        l.laboratoryName, s.studentNumber, s.studentName,
        SOURCE_LABELS[s.admissionSource] || s.admissionSource,
        FINAL_STATUS_LABELS[s.finalStatus] || s.finalStatus
      ])
    )
  )
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
.stat-value.small { font-size: 15px; }
.block { margin-bottom: 14px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
.check-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.hint { margin-top: 8px; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
</style>
