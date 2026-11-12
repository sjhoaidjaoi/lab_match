<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">递补与调剂候选名单</h2>
          <p class="page-desc">汇总全院递补学生与未落实学生，按三级优先级排序：内部递补 → 跨实训室调剂 → 沟通安置。</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" :disabled="!selectedRows.length" @click="openBatch">
            批量跨室调剂{{ selectedRows.length ? `（${selectedRows.length}）` : '' }}
          </el-button>
          <el-button @click="exportList">导出 Excel</el-button>
        </div>
      </div>
    </div>

    <el-row :gutter="14" class="summary">
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">候选总数</div><div class="stat-value">{{ list.length }}</div></div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">建议内部递补</div><div class="stat-value">{{ priorityCount(1) }}</div></div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">建议跨室调剂</div><div class="stat-value">{{ priorityCount(2) }}</div></div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">需沟通安置</div><div class="stat-value">{{ priorityCount(3) }}</div></div>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <div class="block-header">
          <span>候选明细</span>
          <div class="tools">
            <el-select v-model="priorityFilter" clearable placeholder="按优先级筛选" style="width: 160px">
              <el-option label="内部递补" :value="1" />
              <el-option label="跨室调剂" :value="2" />
              <el-option label="沟通安置" :value="3" />
            </el-select>
            <el-input v-model="keyword" clearable placeholder="搜索姓名/学号" style="width: 180px" />
          </div>
        </div>
      </template>
      <el-table ref="tableRef" v-loading="loading" :data="filtered" stripe @selection-change="onSelectionChange">
        <el-table-column type="selection" width="46" />
        <el-table-column prop="studentNumber" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="90" />
        <el-table-column label="填报志愿" min-width="200">
          <template #default="{ row }">{{ row.preferenceLabs.join('、') || '未填报' }}</template>
        </el-table-column>
        <el-table-column label="递补实训室" min-width="160">
          <template #default="{ row }">{{ row.alternateLabs.join('、') || '—' }}</template>
        </el-table-column>
        <el-table-column label="面试均分" width="100" align="center">
          <template #default="{ row }">{{ row.averageScore ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="服从调剂" width="130" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.obeyInternalAdjustment" size="small" effect="plain" type="success">内部</el-tag>
            <el-tag v-if="row.obeyCollegeAdjustment" size="small" effect="plain" type="primary">全院</el-tag>
            <span v-if="!row.obeyInternalAdjustment && !row.obeyCollegeAdjustment" class="muted">不服从</span>
          </template>
        </el-table-column>
        <el-table-column label="建议优先级" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="PRIORITY_TAG[row.suggestedPriority]" effect="light">{{ PRIORITY_LABELS[row.suggestedPriority] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前调剂" min-width="160">
          <template #default="{ row }">
            <span v-if="row.adjustment">{{ row.adjustment.targetLabName }} · {{ ADJUSTMENT_STATUS_LABELS[row.adjustment.status] || row.adjustment.status }}</span>
            <span v-else class="muted">未发起</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="goCross(row)">跨室调剂</el-button>
            <el-button size="small" text type="warning" @click="goPlacement(row)">沟通安置</el-button>
          </template>
        </el-table-column>
        <template #empty><span class="muted">暂无候选学生</span></template>
      </el-table>
    </el-card>

    <el-dialog v-model="batchVisible" title="批量跨实训室调剂方案" width="620px">
      <el-alert type="info" :closable="false" show-icon class="batch-tip"
        :title="`已选择 ${selectedRows.length} 名学生，若目标实训室名额不足将逐条提示失败原因`" />
      <el-form label-width="100px">
        <el-form-item label="目标实训室" required>
          <el-select v-model="batchLabId" style="width: 100%">
            <el-option
              v-for="l in capacity" :key="l.laboratoryId"
              :label="`${l.laboratoryName}（剩余 ${l.remaining}）`"
              :value="l.laboratoryId" :disabled="l.remaining <= 0"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="调剂原因">
          <el-input v-model="batchReason" type="textarea" :rows="3" placeholder="如：学生服从全院调剂，专业方向与目标实训室匹配" />
        </el-form-item>
      </el-form>
      <div class="batch-list">
        <span v-for="r in selectedRows" :key="r.studentId" class="batch-chip">{{ r.studentName }}</span>
      </div>
      <template #footer>
        <el-button @click="batchVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchSubmitting" :disabled="!batchLabId" @click="submitBatch">
          创建调剂方案
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { CandidateRow, CapacityRow } from '@/types'
import { ADJUSTMENT_STATUS_LABELS, exportExcel } from './shared'

const router = useRouter()
const list = ref<CandidateRow[]>([])
const loading = ref(false)
const priorityFilter = ref<number | ''>('')
const keyword = ref('')
const tableRef = ref()
const selectedRows = ref<CandidateRow[]>([])

// 批量跨室调剂
const batchVisible = ref(false)
const batchSubmitting = ref(false)
const batchLabId = ref<number | undefined>()
const batchReason = ref('')
const capacity = ref<CapacityRow[]>([])

function onSelectionChange(rows: CandidateRow[]) {
  selectedRows.value = rows
}

async function openBatch() {
  batchLabId.value = undefined
  batchReason.value = '学生服从全院调剂，专业方向与目标实训室匹配'
  capacity.value = await collegeApi.capacity()
  batchVisible.value = true
}

async function submitBatch() {
  if (!batchLabId.value) return
  batchSubmitting.value = true
  try {
    const res = await collegeApi.createCrossBatch(
      selectedRows.value.map((r) => ({
        studentId: r.studentId,
        targetLaboratoryId: batchLabId.value as number,
        reason: batchReason.value
      }))
    )
    ElMessage.success(`已创建 ${res.created} 条调剂方案${res.failed.length ? `，${res.failed.length} 条失败` : ''}`)
    if (res.failed.length) {
      ElMessage.warning(res.failed.map((f) => f.reason).join('；'))
    } else {
      batchVisible.value = false
    }
    tableRef.value?.clearSelection()
    await load()
  } finally {
    batchSubmitting.value = false
  }
}

const PRIORITY_LABELS: Record<number, string> = { 1: '内部递补', 2: '跨室调剂', 3: '沟通安置' }
const PRIORITY_TAG: Record<number, 'success' | 'primary' | 'warning'> = { 1: 'success', 2: 'primary', 3: 'warning' }

const filtered = computed(() => {
  const kw = keyword.value.trim()
  return list.value.filter((r) => {
    if (priorityFilter.value !== '' && r.suggestedPriority !== priorityFilter.value) return false
    if (kw && !r.studentName.includes(kw) && !r.studentNumber.includes(kw)) return false
    return true
  })
})

function priorityCount(p: number) {
  return list.value.filter((r) => r.suggestedPriority === p).length
}

function goCross(row: CandidateRow) {
  router.push({ path: '/college/allocation/cross', query: { studentId: String(row.studentId) } })
}

function goPlacement(row: CandidateRow) {
  router.push({ path: '/college/allocation/placement', query: { studentId: String(row.studentId) } })
}

function exportList() {
  exportExcel(
    `调剂候选名单-${new Date().toISOString().slice(0, 10)}.xlsx`,
    ['学号', '姓名', '填报志愿', '递补实训室', '面试均分', '服从内部调剂', '服从全院调剂', '建议优先级', '当前调剂'],
    filtered.value.map((r) => [
      r.studentNumber, r.studentName, r.preferenceLabs.join('、'), r.alternateLabs.join('、'),
      r.averageScore ?? '', r.obeyInternalAdjustment ? '是' : '否', r.obeyCollegeAdjustment ? '是' : '否',
      PRIORITY_LABELS[r.suggestedPriority],
      r.adjustment ? `${r.adjustment.targetLabName}·${ADJUSTMENT_STATUS_LABELS[r.adjustment.status] || r.adjustment.status}` : '未发起'
    ])
  )
}

async function load() {
  loading.value = true
  try {
    list.value = await collegeApi.candidates()
  } catch {
    ElMessage.error('候选名单加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.summary { margin-bottom: 14px; }
.stat-card { background: #fff; border: 1px solid var(--lm-border); border-radius: var(--lm-radius); padding: 14px 16px; margin-bottom: 12px; }
.stat-label { color: var(--lm-text-secondary); font-size: 12.5px; }
.stat-value { font-size: 24px; font-weight: 600; margin-top: 6px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
.tools { display: flex; gap: 10px; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
.header-actions { display: flex; gap: 10px; }
.batch-tip { margin-bottom: 12px; }
.batch-list { display: flex; flex-wrap: wrap; gap: 8px; padding-left: 100px; }
.batch-chip { background: #f0f5ff; color: #2f6fed; border: 1px solid #dbe6ff; border-radius: 12px; padding: 2px 10px; font-size: 12.5px; }
</style>
