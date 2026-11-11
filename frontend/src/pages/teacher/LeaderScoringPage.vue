<template>
  <div class="scoring-page">
    <div class="page-header">
      <div>
        <h2>本室评分录入</h2>
        <p class="subtitle">本室统一面试仅此一套分数，录入后本室所有导师共享使用</p>
      </div>
      <el-button @click="openImport">导入评分表</el-button>
    </div>

    <el-card shadow="never">
      <div class="filters">
        <el-input v-model="keyword" placeholder="学号 / 姓名" clearable class="keyword" />
        <el-select v-model="statusFilter" placeholder="评分状态" clearable class="status">
          <el-option label="未评分" :value="0" />
          <el-option label="草稿" :value="1" />
          <el-option label="已提交" :value="2" />
        </el-select>
        <el-button type="primary" plain @click="loadScores">查询</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="scores" stripe>
        <el-table-column prop="studentNo" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column prop="sessionName" label="场次" width="110" />
        <el-table-column label="态度" width="80">
          <template #default="{ row }">{{ formatScore(row.attitudeScore) }}</template>
        </el-table-column>
        <el-table-column label="逻辑" width="80">
          <template #default="{ row }">{{ formatScore(row.logicScore) }}</template>
        </el-table-column>
        <el-table-column label="编程" width="80">
          <template #default="{ row }">{{ formatScore(row.programmingScore) }}</template>
        </el-table-column>
        <el-table-column label="时间" width="80">
          <template #default="{ row }">{{ formatScore(row.timeScore) }}</template>
        </el-table-column>
        <el-table-column label="系统总分" width="100">
          <template #default="{ row }">{{ formatScore(row.systemTotal) }}</template>
        </el-table-column>
        <el-table-column label="最终总分" width="100">
          <template #default="{ row }">{{ formatScore(row.finalTotal) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 2 ? 'success' : row.status === 1 ? 'warning' : 'info'">
              {{ row.statusText }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openScore(row)">录分</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <ScoreFormDialog
      v-model="dialogVisible"
      :row="editingRow"
      :round-id="roundId"
      @saved="loadScores"
    />

    <el-dialog v-model="importVisible" title="导入评分表" width="540px">
      <el-upload
        :auto-upload="false"
        :limit="1"
        accept=".xlsx"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
      >
        <el-button plain>选择 Excel 文件</el-button>
        <template #tip>
          <div class="upload-tip">
            列顺序：学号、学习态度、逻辑思维、编程基础、时间投入、评语
          </div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" :disabled="!importFile" @click="handleImport">
          开始导入
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resultVisible" title="导入结果" width="560px">
      <div class="import-summary">
        <el-tag type="success">成功 {{ importResult?.successCount ?? 0 }} 条</el-tag>
        <el-tag type="danger">失败 {{ importResult?.failCount ?? 0 }} 条</el-tag>
        <span class="upload-tip">共 {{ importResult?.totalCount ?? 0 }} 条</span>
      </div>
      <el-table
        v-if="(importResult?.failList.length ?? 0) > 0"
        :data="importResult?.failList ?? []"
        size="small"
        max-height="320"
      >
        <el-table-column prop="rowNo" label="行号" width="80" />
        <el-table-column prop="userNo" label="学号" width="140" />
        <el-table-column prop="reason" label="失败原因" min-width="220" />
      </el-table>
      <el-empty v-else description="全部导入成功" :image-size="60" />
      <template #footer>
        <el-button type="primary" @click="resultVisible = false">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, type UploadFile } from 'element-plus'
import ScoreFormDialog from '@/components/ScoreFormDialog.vue'
import { importLeaderScores, listLeaderScores } from '@/api/leaderScore'
import { getCurrentRound } from '@/api/public'
import type { InterviewScoreRow, ScoreImportResult } from '@/types/interview'

const loading = ref(false)
const importing = ref(false)
const keyword = ref('')
const statusFilter = ref<number | ''>('')
const scores = ref<InterviewScoreRow[]>([])
const dialogVisible = ref(false)
const editingRow = ref<InterviewScoreRow | null>(null)
const roundId = ref<number | null>(null)

const importVisible = ref(false)
const importFile = ref<File | null>(null)
const resultVisible = ref(false)
const importResult = ref<ScoreImportResult | null>(null)

function formatScore(value: number | null): string {
  return value === null ? '-' : value.toFixed(2)
}

async function loadScores() {
  loading.value = true
  try {
    const round = await getCurrentRound()
    roundId.value = round?.id ?? null
    const page = await listLeaderScores({
      roundId: roundId.value ?? undefined,
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value === '' ? undefined : statusFilter.value,
      pageNum: 1,
      pageSize: 100
    })
    scores.value = page.list
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openScore(row: InterviewScoreRow) {
  if (!roundId.value) {
    ElMessage.warning('当前无选拔轮次')
    return
  }
  editingRow.value = row
  dialogVisible.value = true
}

function openImport() {
  if (!roundId.value) {
    ElMessage.warning('当前无选拔轮次')
    return
  }
  importFile.value = null
  importVisible.value = true
}

function handleFileChange(file: UploadFile) {
  importFile.value = file.raw ?? null
}

function handleFileRemove() {
  importFile.value = null
}

async function handleImport() {
  if (!importFile.value) {
    ElMessage.warning('请选择要导入的 Excel 文件')
    return
  }
  importing.value = true
  try {
    importResult.value = await importLeaderScores(importFile.value)
    importVisible.value = false
    resultVisible.value = true
    await loadScores()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    importing.value = false
  }
}

onMounted(loadScores)
</script>

<style scoped>
.scoring-page {
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

.filters {
  display: flex;
  gap: 12px;
}

.keyword {
  width: 220px;
}

.status {
  width: 160px;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.import-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
</style>
