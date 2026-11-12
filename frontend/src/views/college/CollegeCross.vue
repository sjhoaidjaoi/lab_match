<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">跨实训室调剂</h2>
          <p class="page-desc">第二优先级：在服从全院调剂的学生中跨实训室匹配空缺名额。</p>
        </div>
        <el-button type="primary" @click="openCreate">发起跨室调剂</el-button>
      </div>
    </div>

    <el-card shadow="never" class="block">
      <template #header><span>有空缺的实训室</span></template>
      <el-table :data="vacancies" stripe>
        <el-table-column prop="laboratoryName" label="实训室" min-width="220" />
        <el-table-column prop="quota" label="计划名额" width="100" align="center" />
        <el-table-column prop="confirmed" label="已确认" width="100" align="center" />
        <el-table-column prop="admitted" label="最终录取" width="100" align="center" />
        <el-table-column label="剩余名额" width="110" align="center">
          <template #default="{ row }">
            <el-tag type="warning" effect="light">{{ row.remaining }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="block-header">
          <span>跨室调剂记录</span>
          <el-radio-group v-model="statusFilter" size="small">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="PENDING">待审核</el-radio-button>
            <el-radio-button value="CONFIRMED">已确认</el-radio-button>
            <el-radio-button value="REJECTED">已驳回</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-table v-loading="loading" :data="filtered" stripe>
        <el-table-column prop="studentNumber" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column label="原实训室" min-width="180">
          <template #default="{ row }">{{ row.sourceLabName || '—' }}</template>
        </el-table-column>
        <el-table-column prop="targetLabName" label="调剂至" min-width="180" />
        <el-table-column prop="reason" label="调剂原因" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" effect="light">
              {{ ADJUSTMENT_STATUS_LABELS[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" align="center">
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button size="small" text type="success" @click="review(row, 'CONFIRMED')">通过</el-button>
              <el-button size="small" text type="danger" @click="review(row, 'REJECTED')">驳回</el-button>
            </template>
            <span v-else class="muted">已处理</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="发起跨实训室调剂" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="学生" prop="studentId">
          <el-select v-model="form.studentId" filterable placeholder="选择服从全院调剂的学生" style="width: 100%">
            <el-option
              v-for="s in candidates"
              :key="s.studentId"
              :label="`${s.studentNumber} ${s.studentName}（原志愿：${s.preferenceLabs.join('、') || '无'}）`"
              :value="s.studentId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="调剂实训室" prop="targetLaboratoryId">
          <el-select v-model="form.targetLaboratoryId" style="width: 100%">
            <el-option
              v-for="v in vacancies"
              :key="v.laboratoryId"
              :label="`${v.laboratoryName}（剩余 ${v.remaining}）`"
              :value="v.laboratoryId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="调剂原因">
          <el-input v-model="form.reason" type="textarea" :rows="3" placeholder="如：学生服从全院调剂，专业方向匹配" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { AdjustmentDetail, CapacityRow, UnplacedStudent } from '@/types'
import { ADJUSTMENT_STATUS_LABELS, statusTag } from './shared'

const list = ref<AdjustmentDetail[]>([])
const route = useRoute()
const capacity = ref<CapacityRow[]>([])
const unplaced = ref<UnplacedStudent[]>([])
const loading = ref(false)
const statusFilter = ref('')
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({ studentId: 0, targetLaboratoryId: 0, reason: '' })
const rules: FormRules = {
  studentId: [{ required: true, message: '请选择学生', trigger: 'change' }],
  targetLaboratoryId: [{ required: true, message: '请选择调剂实训室', trigger: 'change' }]
}

const crossList = computed(() => list.value.filter((a) => a.adjustmentType === 'CROSS_LAB'))
const filtered = computed(() =>
  statusFilter.value ? crossList.value.filter((a) => a.status === statusFilter.value) : crossList.value
)
const vacancies = computed(() => capacity.value.filter((c) => c.remaining > 0))
const candidates = computed(() => unplaced.value.filter((s) => s.obeyCollegeAdjustment && s.hasPreference))

async function load() {
  loading.value = true
  try {
    const [a, c, u] = await Promise.all([
      collegeApi.adjustments(), collegeApi.capacity(), collegeApi.unplaced()
    ])
    list.value = a
    capacity.value = c
    unplaced.value = u
  } finally {
    loading.value = false
  }
}

function openCreate(studentId = 0) {
  Object.assign(form, { studentId, targetLaboratoryId: 0, reason: '学生服从全院调剂，专业方向匹配' })
  dialogVisible.value = true
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await collegeApi.createCrossAdjustment({ ...form, priorityLevel: 2 })
      ElMessage.success('跨室调剂已提交')
      dialogVisible.value = false
      await load()
    } finally {
      submitting.value = false
    }
  })
}

async function review(row: AdjustmentDetail, status: string) {
  const action = status === 'CONFIRMED' ? '通过' : '驳回'
  const { value } = await ElMessageBox.prompt(`确认${action} ${row.studentName} 的跨室调剂？`, `${action}调剂`, {
    inputPlaceholder: '审核意见（选填）', inputValue: ''
  })
  await collegeApi.reviewAdjustment(row.id, status, value)
  ElMessage.success(`已${action}`)
  await load()
}

onMounted(async () => {
  await load()
  const sid = Number(route.query.studentId)
  if (sid) openCreate(sid)
})
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.block { margin-bottom: 14px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
</style>
