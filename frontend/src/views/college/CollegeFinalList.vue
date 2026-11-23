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
        <el-button type="primary" :disabled="!check || !!check.enrollmentBlocker || total === enrolled" @click="enrollAll">批量确认正式入组</el-button>
      </div>
      <div class="muted hint">{{ check?.enrollmentBlocker || (check ? '本批次已满足正式入组条件' : '暂无本批次校验结果') }}</div>
    </el-card>

    <h3>全院学生入组情况</h3>
    <CollegeRosterTable :rows="data?.roster || []" admin>
      <el-table-column label="录取来源" min-width="120">
        <template #default="{ row }">{{ sourceLabel(row.studentId) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="130">
        <template #default="{ row }">
          <el-button v-if="row.finalStatus === 'ADMITTED'" link type="primary" :disabled="!check || !!check.enrollmentBlocker" @click="enrollStudent(row.studentId)">确认入组</el-button>
          <span v-else>—</span>
        </template>
      </el-table-column>
    </CollegeRosterTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { FinalCheck } from '@/types'
import CollegeRosterTable from '@/components/CollegeRosterTable.vue'
import { rosterStatus } from '@/config/roster'
import { SOURCE_LABELS, exportExcel } from './shared'

const data = ref<Awaited<ReturnType<typeof collegeApi.finalList>> | null>(null)
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

async function enrollStudent(studentId: number) {
  const row = allStudents.value.find(student => student.studentId === studentId)
  if (!row) return
  await ElMessageBox.confirm(`确认 ${row.studentName} 正式入组？`, '正式入组', { type: 'info' })
  await collegeApi.enroll(row.id)
  ElMessage.success('已确认入组')
  await load()
}

const sources = computed(() => new Map(allStudents.value.map(row => [row.studentId, row.admissionSource])))
function sourceLabel(studentId: number) {
  const source = sources.value.get(studentId)
  return source ? SOURCE_LABELS[source] || source : '—'
}

function exportList() {
  exportExcel(
    `最终录取名单-${new Date().toISOString().slice(0, 10)}.csv`,
    ['实训室', '指导教师', '学号', '姓名', '录取来源', '入组情况'],
    (data.value?.roster || []).map(row => [row.laboratoryName || '未落实去向', row.teacherName || '—',
      row.studentNumber, row.studentName, sourceLabel(row.studentId), rosterStatus(row.finalStatus)])
  )
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.tools { display: flex; gap: 10px; }
.summary { margin-bottom: 14px; }
.stat-card {
  border: 0;
  background-color: var(--workspace-paper, rgba(255, 255, 255, 0.46));
  background-image: linear-gradient(152deg, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0.08) 62%);
  -webkit-backdrop-filter: blur(6px) saturate(175%);
  backdrop-filter: blur(6px) saturate(175%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    inset 0 -1px 0 rgba(255, 255, 255, 0.6),
    var(--lg-shadow);
  border-radius: var(--lm-radius);
  padding: 14px 16px;
  margin-bottom: 12px;
}
.stat-label { color: var(--lm-text-secondary); font-size: 12.5px; }
.stat-value { font-size: 24px; font-weight: 600; margin-top: 6px; }
.stat-value.small { font-size: 15px; }
.block { margin-bottom: 14px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
.check-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.hint { margin-top: 8px; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
</style>
