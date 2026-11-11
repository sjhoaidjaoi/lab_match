<template>
  <div class="admin-publicity-page">
    <div class="page-header">
      <div>
        <h2>公示管理</h2>
        <p class="subtitle">发起公示、结束公示并确认最终名单；存在未处理异议时不允许确认</p>
      </div>
      <el-button type="primary" :loading="loading" @click="openCreateDialog">发起公示</el-button>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="batches" row-key="id" stripe>
        <el-table-column prop="title" label="公示标题" min-width="240" />
        <el-table-column prop="roundName" label="轮次" width="120" />
        <el-table-column label="公示时间" min-width="210">
          <template #default="{ row }">
            <div class="time-cell">{{ row.startTime }}</div>
            <div class="time-cell">至 {{ row.endTime }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="tagType(row.status)" size="small">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="admissionCount" label="名单人数" width="100" />
        <el-table-column label="异议" width="120">
          <template #default="{ row }">
            <span>{{ row.disputeCount }} 条</span>
            <el-tag v-if="row.pendingDisputeCount > 0" type="warning" size="small" class="pending-tag">
              待处理 {{ row.pendingDisputeCount }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="剩余时间" width="140">
          <template #default="{ row }">{{ remainText(row) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openRowsDialog(row)">查看名单</el-button>
            <el-button v-if="row.status === 1" link type="warning" @click="handleEnd(row)">结束公示</el-button>
            <el-button v-if="row.status === 2" link type="success" @click="handleConfirm(row)">
              确认最终名单
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="createVisible" title="发起公示" width="520px">
      <el-form label-width="90px">
        <el-form-item label="轮次" required>
          <el-select v-model="createForm.roundId" class="full-width">
            <el-option
              v-for="round in rounds"
              :key="round.id"
              :label="round.roundName"
              :value="round.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="公示标题" required>
          <el-input v-model="createForm.title" maxlength="200" placeholder="如：第 2 轮补录拟录取名单公示" />
        </el-form-item>
        <el-form-item label="公示时长" required>
          <el-input-number v-model="createForm.durationHours" :min="1" :max="720" />
          <span class="unit">小时</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">发布</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="rowsVisible" :title="rowsTitle" width="960px">
      <div v-loading="rowsLoading" class="rows-body">
        <div v-if="rowsDetail" class="rows-meta">
          <span>公示时间：{{ rowsDetail.startTime }} 至 {{ rowsDetail.endTime }}</span>
          <span>名单人数：{{ rowsDetail.total }} 人</span>
        </div>
        <el-table
          :data="rowsDetail?.list ?? []"
          stripe
          max-height="460"
          empty-text="本批次暂无已确认名单"
        >
          <el-table-column prop="studentNo" label="学号" width="130" />
          <el-table-column prop="studentName" label="姓名" width="100" />
          <el-table-column label="学院 / 专业" min-width="180">
            <template #default="{ row }">
              <div>{{ row.college || '—' }}</div>
              <div class="time-cell">{{ row.major || '—' }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="labName" label="实训室" min-width="150" />
          <el-table-column prop="mentorName" label="导师" width="100" />
          <el-table-column label="总分" width="90">
            <template #default="{ row }">{{ formatScore(row.finalTotal) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small">{{ row.statusText }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="confirmTime" label="确认时间" min-width="160" />
        </el-table>
      </div>
      <template #footer>
        <el-button @click="rowsVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listRounds } from '@/api/adminRound'
import { getCurrentRound } from '@/api/public'
import {
  confirmPublicity,
  createPublicity,
  endPublicity,
  getAdminPublicityRows,
  listAdminPublicities
} from '@/api/publicity'
import type { RoundListItem } from '@/types/basic'
import type { PublicityAdminDetail, PublicityBatch } from '@/types/publicity'

const loading = ref(false)
const submitting = ref(false)
const createVisible = ref(false)
const batches = ref<PublicityBatch[]>([])
const rounds = ref<RoundListItem[]>([])
const currentRoundId = ref(0)
const createForm = reactive({ roundId: 0, title: '', durationHours: 24 })
const rowsVisible = ref(false)
const rowsLoading = ref(false)
const rowsTitle = ref('公示名单')
const rowsDetail = ref<PublicityAdminDetail | null>(null)

function formatScore(value: number | null): string {
  return value === null || value === undefined ? '—' : value.toFixed(2)
}

function tagType(status: number): 'success' | 'warning' | 'info' {
  if (status === 1) {
    return 'success'
  }
  return status === 2 ? 'warning' : 'info'
}

function remainText(row: PublicityBatch): string {
  if (row.status !== 1) {
    return '—'
  }
  const seconds = Math.max(0, row.remainSeconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours} 时 ${minutes} 分`
}

async function loadBatches() {
  loading.value = true
  try {
    const result = await listAdminPublicities({ pageNum: 1, pageSize: 100 })
    batches.value = result.list
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  const target = rounds.value.find((round) => round.id === currentRoundId.value) ?? rounds.value[0]
  createForm.roundId = target?.id ?? 0
  createForm.title = target ? `${target.roundName}拟录取名单公示` : ''
  createForm.durationHours = 24
  createVisible.value = true
}

async function handleCreate() {
  if (!createForm.roundId) {
    ElMessage.warning('请选择轮次')
    return
  }
  if (!createForm.title.trim()) {
    ElMessage.warning('请填写公示标题')
    return
  }
  submitting.value = true
  try {
    const result = await createPublicity({
      roundId: createForm.roundId,
      title: createForm.title.trim(),
      durationHours: createForm.durationHours
    })
    createVisible.value = false
    ElMessage.success(`公示已发布，共 ${result.admissionCount} 人`)
    await loadBatches()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    submitting.value = false
  }
}

async function handleEnd(row: PublicityBatch) {
  const message = row.pendingDisputeCount > 0
    ? `仍有 ${row.pendingDisputeCount} 条异议未处理，确认结束公示？`
    : '结束后学生将无法再提交异议，确认结束？'
  try {
    await ElMessageBox.confirm(message, '结束公示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await endPublicity(row.id)
    ElMessage.success('公示已结束')
    await loadBatches()
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function handleConfirm(row: PublicityBatch) {
  try {
    await ElMessageBox.confirm('确认后本轮录取将批量置为「已入组」，且不可撤回，是否继续？', '确认最终名单', {
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    const result = await confirmPublicity(row.id)
    ElMessage.success(`已确认 ${result.confirmedCount} 名学生的入组结果`)
    await loadBatches()
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function openRowsDialog(row: PublicityBatch) {
  rowsTitle.value = `${row.title} · 名单明细`
  rowsDetail.value = null
  rowsVisible.value = true
  rowsLoading.value = true
  try {
    rowsDetail.value = await getAdminPublicityRows(row.id)
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    rowsLoading.value = false
  }
}

async function init() {
  const [roundList, currentRound] = await Promise.all([
    listRounds().catch(() => [] as RoundListItem[]),
    getCurrentRound().catch(() => null)
  ])
  rounds.value = roundList
  currentRoundId.value = currentRound?.id ?? 0
  await loadBatches()
}

onMounted(init)
</script>

<style scoped>
.admin-publicity-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.time-cell {
  font-size: 13px;
  color: #606266;
}

.pending-tag {
  margin-left: 6px;
}

.unit {
  margin-left: 8px;
  font-size: 13px;
  color: #909399;
}

.full-width {
  width: 100%;
}

.rows-body {
  min-height: 120px;
}

.rows-meta {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #606266;
}
</style>
