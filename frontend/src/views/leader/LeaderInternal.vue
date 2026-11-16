<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">本实训室内部调剂</h2>
          <p class="page-desc">首轮确认结束后，为服从本室内部调剂且尚未确认去向的学生安排其他导师。</p>
        </div>
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <el-alert
      v-if="!labId"
      type="warning"
      :closable="false"
      show-icon
      title="未绑定实训室"
      description="当前账号未绑定负责的实训室，请联系学院管理员配置后再使用本页面。"
    />

    <template v-else>
      <el-alert v-if="!canAdjust" class="block" type="info" :closable="false" title="首轮确认结束并开启内部调剂阶段后可提交" />
      <el-card shadow="never" class="block">
        <template #header>
          <div class="block-header">
            <span>可调剂候选学生</span>
            <span class="muted">共 {{ eligibleList.length }} 人，单选一名学生后填写调剂原因</span>
          </div>
        </template>
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="eligibleList"
          stripe
          @selection-change="onSelectionChange"
        >
          <el-table-column type="selection" width="46" />
          <el-table-column prop="studentNumber" label="学号" width="120" />
          <el-table-column prop="studentName" label="姓名" width="90" />
          <el-table-column prop="phone" label="联系电话" width="130" />
          <el-table-column label="面试状态" width="100" align="center">
            <template #default="{ row }">
              <span>{{ row.interviewStatus ? INTERVIEW_STATUS_LABELS[row.interviewStatus] || row.interviewStatus : '未安排' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="综合分" width="90" align="center">
            <template #default="{ row }">{{ row.comprehensiveScore ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="推荐结论" min-width="130" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.recommendation" :type="recommendationTag(row.recommendation)" effect="light" size="small">
                {{ RECOMMENDATION_LABELS[row.recommendation] || row.recommendation }}
              </el-tag>
              <span v-else class="muted">未评分</span>
            </template>
          </el-table-column>
          <template #empty><span class="muted">暂无可调剂候选学生</span></template>
        </el-table>
      </el-card>

      <el-card shadow="never" class="block">
        <template #header><span>提交内部调剂</span></template>
        <el-form label-width="90px" class="adjust-form">
          <el-form-item label="调剂学生">
            <el-tag v-if="selected" type="primary" effect="light">
              {{ selected.studentName }}（{{ selected.studentNumber }}）
            </el-tag>
            <span v-else class="muted">请在上表勾选一名学生</span>
          </el-form-item>
          <el-form-item label="目标导师">
            <el-select v-model="targetTeacherId" clearable placeholder="请选择目标导师">
              <el-option v-for="mentor in mentors" :key="mentor.id" :value="mentor.id" :label="mentor.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="调剂原因">
            <el-input
              v-model="reason"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              placeholder="如：学生专业方向与本实训室当前项目更匹配，经沟通同意内部调剂"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitting" :disabled="!canAdjust || !selected || !targetTeacherId || !reason.trim()" @click="submit">
              提交内部调剂
            </el-button>
            <el-button :disabled="submitting" @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header><span>本室调剂记录</span></template>
        <el-table v-loading="loading" :data="records" stripe>
          <el-table-column prop="studentNumber" label="学号" width="120" />
          <el-table-column prop="studentName" label="姓名" width="90" />
          <el-table-column label="类型" width="140" align="center">
            <template #default="{ row }">{{ ADJUSTMENT_TYPE_LABELS[row.adjustmentType] || row.adjustmentType }}</template>
          </el-table-column>
          <el-table-column prop="targetLabName" label="目标实训室" min-width="180" />
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" effect="light" size="small">
                {{ ADJUSTMENT_STATUS_LABELS[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="调剂原因" min-width="220" show-overflow-tooltip />
          <el-table-column label="提交时间" width="170">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <template #empty><span class="muted">暂无调剂记录</span></template>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { labApi, type AdjustmentRow, type LabCandidate } from '@/api/lab'
import { studentApi, type LabTeacher } from '@/api/student'
import { useAuthStore } from '@/stores/auth'
import { useCycleStore } from '@/stores/cycle'
import {
  ADJUSTMENT_STATUS_LABELS,
  ADJUSTMENT_TYPE_LABELS,
  INTERVIEW_STATUS_LABELS,
  RECOMMENDATION_LABELS,
  formatTime,
  statusTag,
  type TagType
} from '../college/shared'

const auth = useAuthStore()
const cycle = useCycleStore()
const labId = computed(() => auth.user?.laboratoryId ?? null)
const canAdjust = computed(() => {
  const now = Date.now()
  const stage = (number: number) => cycle.stages.find(item => item.stageNumber === number)
  const open = (number: number) => {
    const item = stage(number)
    return item?.stageStatus === 'IN_PROGRESS' && (!item.startTime || Date.parse(item.startTime) <= now) &&
      (!item.endTime || Date.parse(item.endTime) >= now)
  }
  const firstRound = stage(5)
  return open(6) && !open(4) && !open(5) && (firstRound?.stageStatus === 'COMPLETED' ||
    Boolean(firstRound?.endTime && Date.parse(firstRound.endTime) < now))
})

const candidates = ref<LabCandidate[]>([])
const records = ref<AdjustmentRow[]>([])
const loading = ref(false)
const submitting = ref(false)
const reason = ref('')
const mentors = ref<LabTeacher[]>([])
const targetTeacherId = ref<number>()
const selected = ref<LabCandidate | null>(null)
const tableRef = ref()

const eligibleList = computed(() => candidates.value.filter((c) => c.eligible))

function recommendationTag(value: string): TagType {
  if (value === 'INTENDED') return 'success'
  if (value === 'ALTERNATE') return 'warning'
  if (value === 'REJECTED') return 'danger'
  return 'info'
}

function onSelectionChange(rows: LabCandidate[]) {
  const latest = rows[rows.length - 1]
  if (rows.length > 1 && latest) {
    tableRef.value?.clearSelection()
    tableRef.value?.toggleRowSelection(latest, true)
    selected.value = latest
    return
  }
  selected.value = latest || null
}

function resetForm() {
  reason.value = ''
  targetTeacherId.value = undefined
  selected.value = null
  tableRef.value?.clearSelection()
}

function errorMessage(e: unknown, fallback: string) {
  const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
  if (message) return message
  if (e instanceof Error && e.message) return e.message
  return fallback
}

async function submit() {
  const id = labId.value
  if (!id || !canAdjust.value || submitting.value) return
  if (!selected.value) {
    ElMessage.warning('请先勾选一名调剂学生')
    return
  }
  submitting.value = true
  try {
    await labApi.internalAdjustment({
      studentId: selected.value.studentId,
      sourceLaboratoryId: id,
      targetLaboratoryId: id,
      targetLabTeacherId: targetTeacherId.value || undefined,
      reason: reason.value.trim()
    })
    ElMessage.success('内部调剂提交成功，等待学院审核')
    resetForm()
    await load()
  } catch (e) {
    console.error(e)
    ElMessage.error(errorMessage(e, '内部调剂提交失败'))
  } finally {
    submitting.value = false
  }
}

async function load() {
  const id = labId.value
  if (!id) return
  loading.value = true
  try {
    const [c, a, detail] = await Promise.all([labApi.candidates(id), labApi.adjustments(id), studentApi.labDetail(id), cycle.load(true)])
    candidates.value = c
    records.value = a
    mentors.value = detail.teachers ?? []
  } catch (e) {
    console.error(e)
    ElMessage.error('内部调剂数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.block { margin-bottom: 14px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
.adjust-form { max-width: 720px; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
</style>
