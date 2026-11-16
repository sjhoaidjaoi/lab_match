<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">未落实学生安置</h2>
          <p class="page-desc">第三优先级：对前两轮仍未落实的学生逐一沟通，形成沟通记录并手动安置。</p>
        </div>
        <div class="header-actions">
          <el-button @click="load">刷新</el-button>
          <el-button @click="exportUnplaced">导出未落实名单</el-button>
        </div>
      </div>
    </div>

    <el-card shadow="never" class="block">
      <template #header><span>未落实学生（{{ unplaced.length }}）</span></template>
      <el-table v-loading="loading" :data="unplaced" stripe>
        <el-table-column prop="studentNumber" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column label="原志愿" min-width="220">
          <template #default="{ row }">
            <span v-if="row.preferenceLabs.length">{{ row.preferenceLabs.join('、') }}</span>
            <el-tag v-else type="info" effect="plain" size="small">未填报</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="调剂意愿" min-width="200">
          <template #default="{ row }">
            <div class="wish">
              <el-tag :type="row.obeyInternalAdjustment ? 'success' : 'info'" effect="plain" size="small">内部调剂</el-tag>
              <el-tag :type="row.obeyCollegeAdjustment ? 'success' : 'info'" effect="plain" size="small">全院调剂</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="面试情况" min-width="220">
          <template #default="{ row }">
            <div v-if="row.interviewList.length" class="interview">
              <div v-for="i in row.interviewList" :key="i.laboratoryId">
                {{ i.laboratoryName }} · {{ INTERVIEW_STATUS_LABELS[i.interviewStatus] || i.interviewStatus }}
                <span v-if="i.comprehensiveScore">（{{ i.comprehensiveScore }}）</span>
              </div>
            </div>
            <span v-else class="muted">无面试记录</span>
          </template>
        </el-table-column>
        <el-table-column label="联系电话" width="140">
          <template #default="{ row }">{{ row.phone || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="openPlace(row)">沟通安置</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header><span>沟通安置记录</span></template>
      <el-table :data="placements" stripe>
        <el-table-column prop="studentName" label="学生" width="110" />
        <el-table-column prop="targetLabName" label="安置实训室" min-width="200" />
        <el-table-column prop="reason" label="沟通情况" min-width="260" show-overflow-tooltip />
        <el-table-column prop="operatorName" label="操作人" width="110" />
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" effect="light">
              {{ ADJUSTMENT_STATUS_LABELS[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="沟通安置" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="学生">
          <el-input :model-value="current ? `${current.studentNumber} ${current.studentName}` : ''" disabled />
        </el-form-item>
        <el-form-item label="安置实训室" prop="targetLaboratoryId">
          <el-select v-model="form.targetLaboratoryId" style="width: 100%">
            <el-option
              v-for="v in vacancies"
              :key="v.laboratoryId"
              :label="`${v.laboratoryName}（剩余 ${v.remaining}）`"
              :value="v.laboratoryId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="沟通情况" prop="reason">
          <el-input v-model="form.reason" type="textarea" :rows="3" placeholder="记录沟通时间、学生意见与安置结果" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">记录并提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { AdjustmentDetail, CapacityRow, UnplacedStudent } from '@/types'
import { ADJUSTMENT_STATUS_LABELS, INTERVIEW_STATUS_LABELS, exportExcel, statusTag } from './shared'

const unplaced = ref<UnplacedStudent[]>([])
const route = useRoute()
const capacity = ref<CapacityRow[]>([])
const records = ref<AdjustmentDetail[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitting = ref(false)
const current = ref<UnplacedStudent | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({ targetLaboratoryId: 0, reason: '' })
const rules: FormRules = {
  targetLaboratoryId: [{ required: true, message: '请选择安置实训室', trigger: 'change' }],
  reason: [{ required: true, message: '请填写沟通情况', trigger: 'blur' }]
}

const vacancies = computed(() => capacity.value.filter((c) => c.remaining > 0))
const placements = computed(() => records.value.filter((r) => r.adjustmentType === 'MANUAL_PLACEMENT'))

async function load() {
  loading.value = true
  try {
    const [u, c, a] = await Promise.all([
      collegeApi.unplaced(), collegeApi.capacity(), collegeApi.adjustments()
    ])
    unplaced.value = u
    capacity.value = c
    records.value = a
  } finally {
    loading.value = false
  }
}

function openPlace(row: UnplacedStudent) {
  current.value = row
  Object.assign(form, { targetLaboratoryId: 0, reason: '' })
  dialogVisible.value = true
}

async function submit() {
  if (!formRef.value || !current.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await collegeApi.createPlacement({
        studentId: current.value!.studentId,
        targetLaboratoryId: form.targetLaboratoryId,
        reason: form.reason,
        priorityLevel: 3
      })
      ElMessage.success('沟通安置记录已提交')
      dialogVisible.value = false
      await load()
    } finally {
      submitting.value = false
    }
  })
}

function exportUnplaced() {
  exportExcel(
    `未落实学生名单-${new Date().toISOString().slice(0, 10)}.xlsx`,
    ['学号', '姓名', '原志愿', '服从内部调剂', '服从全院调剂', '联系电话'],
    unplaced.value.map((r) => [
      r.studentNumber, r.studentName, r.preferenceLabs.join('、'),
      r.obeyInternalAdjustment ? '是' : '否', r.obeyCollegeAdjustment ? '是' : '否', r.phone || ''
    ])
  )
}

onMounted(async () => {
  await load()
  const sid = Number(route.query.studentId)
  if (!sid) return
  const row = unplaced.value.find((u) => u.studentId === sid)
  if (row) openPlace(row)
  else ElMessage.warning('该学生已不在未落实名单中')
})
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.header-actions { display: flex; gap: 10px; }
.block { margin-bottom: 14px; }
.wish { display: flex; gap: 6px; flex-wrap: wrap; }
.interview { font-size: 12.5px; color: var(--lm-text-secondary); line-height: 1.7; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
</style>
