<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">初选建议</h2>
      <p class="page-desc">根据面试结论提交拟录取或递补建议；拟录取人数不能超过本实训室计划名额。</p>
    </div>

    <el-card v-if="!labId" shadow="never">
      <el-empty description="未绑定实训室" />
    </el-card>

    <div v-else v-loading="loading">
      <el-row v-if="stats" :gutter="14" class="summary">
        <el-col :xs="12" :lg="6">
          <div class="stat-card"><div class="stat-label">计划名额</div><div class="stat-value">{{ stats.quota }}</div></div>
        </el-col>
        <el-col :xs="12" :lg="6">
          <div class="stat-card"><div class="stat-label">当前拟录取</div><div class="stat-value">{{ stats.intended }}</div></div>
        </el-col>
        <el-col :xs="12" :lg="6">
          <div class="stat-card"><div class="stat-label">已确认</div><div class="stat-value">{{ stats.confirmed }}</div></div>
        </el-col>
        <el-col :xs="12" :lg="6">
          <div class="stat-card"><div class="stat-label">剩余名额</div><div class="stat-value">{{ stats.remaining }}</div></div>
        </el-col>
      </el-row>

      <el-card shadow="never">
        <template #header><span>面试候选学生</span></template>
        <el-table :data="list" stripe empty-text="暂无面试候选学生">
          <el-table-column prop="studentNumber" label="学号" width="130" />
          <el-table-column prop="studentName" label="姓名" width="110" />
          <el-table-column label="面试状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.interviewStatus)" effect="light">
                {{ INTERVIEW_STATUS_LABELS[row.interviewStatus] || row.interviewStatus }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="综合分" width="90" align="center">
            <template #default="{ row }">{{ row.comprehensiveScore ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="面试结论" width="130" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.recommendation)" effect="plain">
                {{ RECOMMENDATION_LABELS[row.recommendation] || row.recommendation }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="录取状态" min-width="180">
            <template #default="{ row }">
              <el-tag v-if="admissionOf(row.studentId)" :type="statusTag(admissionStatusOf(row.studentId))" effect="light">
                {{ admissionText(row.studentId) }}
              </el-tag>
              <el-tag v-else type="info" effect="plain">未提交</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" align="center" fixed="right">
            <template #default="{ row }">
              <template v-if="!admissionOf(row.studentId)">
                <el-button
                  size="small"
                  text
                  type="primary"
                  :loading="submittingId === row.studentId"
                  @click="submitIntend(row, 'INTENDED')"
                >拟录取</el-button>
                <el-button
                  size="small"
                  text
                  type="warning"
                  :loading="submittingId === row.studentId"
                  @click="submitIntend(row, 'ALTERNATE')"
                >递补</el-button>
              </template>
              <span v-else class="muted">已提交</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  labApi,
  type AdmissionRow,
  type InterviewRow,
  type LabStats
} from '@/api/lab'
import { useAuthStore } from '@/stores/auth'
import {
  ADMISSION_STATUS_LABELS,
  ADMISSION_TYPE_LABELS,
  INTERVIEW_STATUS_LABELS,
  RECOMMENDATION_LABELS,
  statusTag
} from '../college/shared'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const list = ref<InterviewRow[]>([])
const admissions = ref<AdmissionRow[]>([])
const stats = ref<LabStats | null>(null)
const loading = ref(false)
const submittingId = ref<number | null>(null)

function admissionOf(studentId: number): AdmissionRow | null {
  return admissions.value.find((a) => a.studentId === studentId) ?? null
}

function admissionStatusOf(studentId: number): string {
  return admissionOf(studentId)?.status || ''
}

function admissionText(studentId: number): string {
  const record = admissionOf(studentId)
  if (!record) return ''
  const type = ADMISSION_TYPE_LABELS[record.admissionType] || record.admissionType
  const status = ADMISSION_STATUS_LABELS[record.status] || record.status
  return `${type} · ${status}`
}

async function submitIntend(row: InterviewRow, admissionType: 'INTENDED' | 'ALTERNATE') {
  if (!labId.value) return
  submittingId.value = row.studentId
  try {
    await labApi.intend({ studentId: row.studentId, laboratoryId: labId.value, admissionType })
    ElMessage.success(admissionType === 'INTENDED' ? '已提交拟录取建议' : '已提交递补建议')
    await load()
  } catch (err) {
    console.error('提交初选建议失败', err)
    ElMessage.error(err instanceof Error ? err.message : '提交初选建议失败')
  } finally {
    submittingId.value = null
  }
}

async function load() {
  if (!labId.value) return
  loading.value = true
  try {
    const [i, a, s] = await Promise.all([
      labApi.interviews(labId.value),
      labApi.admissions(labId.value),
      labApi.stats(labId.value)
    ])
    list.value = i
    admissions.value = a
    stats.value = s
  } catch (err) {
    console.error('初选数据加载失败', err)
    ElMessage.error('初选数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
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
.muted { color: var(--lm-text-secondary); }
</style>
