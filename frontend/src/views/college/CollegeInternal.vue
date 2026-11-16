<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">内部调剂汇总</h2>
      <p class="page-desc">汇总各实训室内部调剂名单；内部调剂由组长主导，学院端审核并纳入最终名单。</p>
    </div>

    <el-card shadow="never" class="block">
      <template #header><span>各实训室内部调剂情况</span></template>
      <el-table :data="byLab" stripe>
        <el-table-column prop="laboratoryName" label="实训室" min-width="220" />
        <el-table-column prop="total" label="提交记录" width="100" align="center" />
        <el-table-column prop="confirmed" label="已确认" width="100" align="center" />
        <el-table-column prop="pending" label="待审核" width="100" align="center" />
        <el-table-column prop="remaining" label="剩余名额" width="100" align="center" />
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="block-header">
          <span>内部调剂明细</span>
          <div class="tools">
            <el-radio-group v-model="statusFilter" size="small">
              <el-radio-button value="">全部</el-radio-button>
              <el-radio-button value="PENDING">待审核</el-radio-button>
              <el-radio-button value="CONFIRMED">已确认</el-radio-button>
              <el-radio-button value="REJECTED">已驳回</el-radio-button>
            </el-radio-group>
            <el-button size="small" @click="exportList">导出 Excel</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="filtered" stripe>
        <el-table-column prop="studentNumber" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column prop="targetLabName" label="调剂实训室" min-width="200" />
        <el-table-column prop="reason" label="调剂原因" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" effect="light">
              {{ ADJUSTMENT_STATUS_LABELS[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { AdjustmentDetail, CapacityRow } from '@/types'
import { ADJUSTMENT_STATUS_LABELS, exportExcel, formatTime, statusTag } from './shared'

const list = ref<AdjustmentDetail[]>([])
const capacity = ref<CapacityRow[]>([])
const loading = ref(false)
const statusFilter = ref('')

const internal = computed(() => list.value.filter((a) => a.adjustmentType === 'INTERNAL'))
const filtered = computed(() =>
  statusFilter.value ? internal.value.filter((a) => a.status === statusFilter.value) : internal.value
)
const byLab = computed(() =>
  capacity.value.map((c) => {
    const rows = internal.value.filter((a) => a.targetLaboratoryId === c.laboratoryId)
    return {
      laboratoryName: c.laboratoryName,
      remaining: c.remaining,
      total: rows.length,
      confirmed: rows.filter((r) => r.status === 'CONFIRMED').length,
      pending: rows.filter((r) => r.status === 'PENDING').length
    }
  })
)

async function load() {
  loading.value = true
  try {
    const [a, c] = await Promise.all([collegeApi.adjustments(), collegeApi.capacity()])
    list.value = a
    capacity.value = c
  } finally {
    loading.value = false
  }
}

async function review(row: AdjustmentDetail, status: string) {
  const action = status === 'CONFIRMED' ? '通过' : '驳回'
  const { value } = await ElMessageBox.prompt(`确认${action} ${row.studentName} 的内部调剂？可填写审核意见`, `${action}调剂`, {
    inputPlaceholder: '审核意见（选填）',
    inputValue: ''
  })
  await collegeApi.reviewAdjustment(row.id, status, value)
  ElMessage.success(`已${action}`)
  await load()
}

function exportList() {
  exportExcel(
    `内部调剂汇总-${new Date().toISOString().slice(0, 10)}.xlsx`,
    ['学号', '姓名', '调剂实训室', '调剂原因/审核意见', '状态', '提交时间'],
    filtered.value.map((r) => [
      r.studentNumber, r.studentName, r.targetLabName, r.reason,
      ADJUSTMENT_STATUS_LABELS[r.status] || r.status, formatTime(r.createdAt)
    ])
  )
}

onMounted(load)
</script>

<style scoped>
.block { margin-bottom: 14px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
.tools { display: flex; align-items: center; gap: 10px; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
</style>
