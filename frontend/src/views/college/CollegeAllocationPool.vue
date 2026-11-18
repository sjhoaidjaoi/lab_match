<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">全院调剂池</h2>
          <p class="page-desc">
            三轮补录结束后，剩余名额纳入全院调剂池。系统按优先级排出候选，学院逐条确认即可生效，
            确认结果直接同步进最终录取名单。
          </p>
        </div>
        <div class="header-actions">
          <el-button :loading="loading" @click="load">刷新</el-button>
          <el-button @click="exportList">导出 CSV</el-button>
        </div>
      </div>
    </div>

    <el-row :gutter="14" class="summary">
      <el-col :xs="12" :lg="6">
        <div class="stat-card">
          <div class="stat-label">待安置学生</div>
          <div class="stat-value">{{ summary.pending }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card">
          <div class="stat-label">第一优先级 · 实训室内部调剂</div>
          <div class="stat-value priority-1">{{ summary.internal }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card">
          <div class="stat-label">第二优先级 · 全院跨实训室</div>
          <div class="stat-value priority-2">{{ summary.cross }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card">
          <div class="stat-label">第三优先级 · 未服从调剂安置</div>
          <div class="stat-value priority-3">{{ summary.placement }}</div>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <div class="toolbar">
        <el-radio-group v-model="priorityFilter" size="small">
          <el-radio-button :value="0">全部</el-radio-button>
          <el-radio-button :value="1">内部调剂</el-radio-button>
          <el-radio-button :value="2">跨实训室</el-radio-button>
          <el-radio-button :value="3">未服从调剂</el-radio-button>
        </el-radio-group>
        <el-input v-model="keyword" placeholder="按学号 / 姓名筛选" clearable size="small" class="search" />
      </div>

      <el-table v-loading="loading" :data="filteredRows" stripe>
        <el-table-column label="优先级" width="190">
          <template #default="{ row }">
            <el-tag :type="priorityTag(row.priority)" effect="light">
              {{ row.priority }} · {{ row.priorityLabel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="学生" min-width="150">
          <template #default="{ row }">
            <div class="student-name">{{ row.studentName || '—' }}</div>
            <div class="student-no">{{ row.studentNumber }}</div>
          </template>
        </el-table-column>
        <el-table-column label="原志愿" min-width="180">
          <template #default="{ row }">
            <div class="pref-list">
              <el-tag v-for="lab in row.preferredLabs" :key="lab.laboratoryId" size="small" effect="plain">
                {{ lab.laboratoryName || `实训室#${lab.laboratoryId}` }}
              </el-tag>
              <span v-if="!row.preferredLabs.length" class="muted">未填报</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="调剂意愿" width="130">
          <template #default="{ row }">
            <div class="obey">
              <span>室内：{{ row.obeyInternalAdjustment ? '服从' : '不服从' }}</span>
              <span>全院：{{ row.obeyCollegeAdjustment ? '服从' : '不服从' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="系统建议去向" min-width="150">
          <template #default="{ row }">
            <span v-if="row.suggestedLaboratoryName">{{ row.suggestedLaboratoryName }}</span>
            <span v-else class="muted">需人工指定</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="判定依据" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="110" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openConfirm(row)">确认调剂</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !filteredRows.length" description="当前没有待安置的学生" />
    </el-card>

    <el-dialog v-model="dialogVisible" title="确认调剂去向" width="520px">
      <el-form v-if="current" label-width="96px">
        <el-form-item label="学生">
          <span>{{ current.studentName }}（{{ current.studentNumber }}）</span>
        </el-form-item>
        <el-form-item label="优先级">
          <el-tag :type="priorityTag(current.priority)" effect="light">{{ current.priorityLabel }}</el-tag>
        </el-form-item>
        <el-form-item label="目标实训室" required>
          <el-select v-model="form.targetLaboratoryId" placeholder="请选择仍有余量的实训室" class="full" @change="onLabChange">
            <el-option
              v-for="lab in availableLabs"
              :key="lab.id"
              :label="`${lab.name}（剩余 ${lab.remaining}）`"
              :value="lab.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="指导教师">
          <el-select v-model="form.targetLabTeacherId" placeholder="可不指定" clearable class="full">
            <el-option
              v-for="teacher in selectableTeachers"
              :key="teacher.id"
              :label="`${teacher.name}（${teacher.remaining == null ? '不限名额' : `剩余 ${teacher.remaining}`}）`"
              :value="teacher.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="调剂说明">
          <el-input v-model="form.reason" type="textarea" :rows="2" maxlength="240" show-word-limit
            placeholder="例如：第一优先级实训室内部调剂" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!form.targetLaboratoryId" @click="submitConfirm">
          确认并同步名单
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { allocationApi, type LabSurplus, type PoolRow, type TeacherQuota } from '@/api/allocation'
import { exportExcel } from './shared'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const rows = ref<PoolRow[]>([])
const summary = ref({ pending: 0, internal: 0, cross: 0, placement: 0, remaining: 0 })
const labs = ref<LabSurplus[]>([])
const current = ref<PoolRow | null>(null)
const priorityFilter = ref(0)
const keyword = ref('')
const form = reactive<{ targetLaboratoryId: number | null; targetLabTeacherId: number | null; reason: string }>({
  targetLaboratoryId: null,
  targetLabTeacherId: null,
  reason: ''
})

const filteredRows = computed(() => {
  const key = keyword.value.trim()
  return rows.value.filter((row) => {
    if (priorityFilter.value && row.priority !== priorityFilter.value) return false
    if (!key) return true
    return row.studentName.includes(key) || row.studentNumber.includes(key)
  })
})

const availableLabs = computed(() => labs.value.filter((lab) => lab.remaining > 0))
const selectableTeachers = computed<TeacherQuota[]>(() => {
  const lab = labs.value.find((item) => item.id === form.targetLaboratoryId)
  if (!lab) return []
  return lab.teachers.filter((teacher) => teacher.remaining == null || teacher.remaining > 0)
})

function priorityTag(priority: number) {
  if (priority === 1) return 'success'
  if (priority === 2) return 'warning'
  return 'danger'
}

async function load() {
  loading.value = true
  try {
    const data = await allocationApi.pool()
    rows.value = data.rows || []
    summary.value = data.summary || { pending: 0, internal: 0, cross: 0, placement: 0, remaining: 0 }
    labs.value = data.surplus?.labs || []
  } finally {
    loading.value = false
  }
}

function openConfirm(row: PoolRow) {
  current.value = row
  const preferred = row.suggestedLaboratoryId
    && availableLabs.value.some((lab) => lab.id === row.suggestedLaboratoryId)
    ? row.suggestedLaboratoryId
    : availableLabs.value[0]?.id ?? null
  form.targetLaboratoryId = preferred
  form.targetLabTeacherId = null
  form.reason = row.priorityLabel
  dialogVisible.value = true
}

function onLabChange() {
  form.targetLabTeacherId = null
}

async function submitConfirm() {
  if (!current.value || !form.targetLaboratoryId) return
  submitting.value = true
  try {
    const result = await allocationApi.confirmPool({
      studentId: current.value.studentId,
      targetLaboratoryId: form.targetLaboratoryId,
      targetLabTeacherId: form.targetLabTeacherId || null,
      reason: form.reason || undefined
    })
    ElMessage.success(`已确认调剂，最终名单同步 ${result.synced} 人`)
    dialogVisible.value = false
    await load()
  } finally {
    submitting.value = false
  }
}

function exportList() {
  exportExcel(
    `全院调剂池-${new Date().toISOString().slice(0, 10)}.csv`,
    ['优先级', '学号', '姓名', '原志愿', '服从室内调剂', '服从全院调剂', '建议去向', '判定依据'],
    rows.value.map((row) => [
      `${row.priority} · ${row.priorityLabel}`,
      row.studentNumber,
      row.studentName,
      row.preferredLabs.map((lab) => lab.laboratoryName).join(' / '),
      row.obeyInternalAdjustment ? '是' : '否',
      row.obeyCollegeAdjustment ? '是' : '否',
      row.suggestedLaboratoryName,
      row.reason
    ])
  )
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.header-actions { display: flex; gap: 8px; }
.toolbar { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.search { max-width: 220px; }
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
.stat-value.priority-1 { color: #16a34a; }
.stat-value.priority-2 { color: #d97706; }
.stat-value.priority-3 { color: #dc2626; }
.student-name { font-weight: 600; }
.student-no { color: var(--lm-text-secondary); font-size: 12.5px; margin-top: 2px; }
.pref-list { display: flex; flex-wrap: wrap; gap: 4px; }
.obey { display: flex; flex-direction: column; font-size: 12.5px; color: var(--lm-text-secondary); }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
.full { width: 100%; }
</style>
