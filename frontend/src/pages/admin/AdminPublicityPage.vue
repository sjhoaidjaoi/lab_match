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
            <el-option label="第 2 轮补录" :value="2" />
            <el-option label="第 1 轮" :value="1" />
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

    <el-dialog v-model="rowsVisible" :title="rowsTitle" width="640px">
      <el-table :data="rows" max-height="420" stripe>
        <el-table-column prop="studentNo" label="学号" width="150" />
        <el-table-column prop="studentName" label="姓名" width="120" />
        <el-table-column prop="labName" label="实训室" min-width="170" />
        <el-table-column prop="mentorName" label="导师" min-width="120" />
      </el-table>
      <template #footer>
        <el-button type="primary" @click="rowsVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MockError } from '@/mock/auth'
import {
  mockAdminPublicityRows,
  mockConfirmPublicity,
  mockCreatePublicity,
  mockEndPublicity,
  mockPublicityList
} from '@/mock/publicity'
import type { PublicityBatch, PublicityRow } from '@/types/publicity'

const loading = ref(false)
const submitting = ref(false)
const createVisible = ref(false)
const rowsVisible = ref(false)
const batches = ref<PublicityBatch[]>([])
const rows = ref<PublicityRow[]>([])
const rowsTitle = ref('')
const createForm = reactive({ roundId: 2, title: '第 2 轮补录拟录取名单公示', durationHours: 24 })

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
  const seconds = Math.max(0, Math.floor((new Date(row.endTime.replace(' ', 'T')).getTime() - Date.now()) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours} 时 ${minutes} 分`
}

async function loadBatches() {
  loading.value = true
  try {
    batches.value = await mockPublicityList()
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '加载公示批次失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  createForm.roundId = 2
  createForm.title = '第 2 轮补录拟录取名单公示'
  createForm.durationHours = 24
  createVisible.value = true
}

async function handleCreate() {
  submitting.value = true
  try {
    const result = await mockCreatePublicity({ ...createForm })
    createVisible.value = false
    ElMessage.success(`公示已发布，共 ${result.admissionCount} 人`)
    await loadBatches()
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '发起公示失败')
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
    await mockEndPublicity(row.id)
    ElMessage.success('公示已结束')
    await loadBatches()
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '结束公示失败')
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
    const result = await mockConfirmPublicity(row.id)
    ElMessage.success(`已确认 ${result.confirmedCount} 名学生的入组结果`)
    await loadBatches()
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '确认失败')
  }
}

async function openRowsDialog(row: PublicityBatch) {
  try {
    rows.value = await mockAdminPublicityRows(row.id)
    rowsTitle.value = row.title
    rowsVisible.value = true
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '加载名单失败')
  }
}

onMounted(loadBatches)
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
</style>
