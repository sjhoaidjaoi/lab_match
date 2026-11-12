<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h2>全院录取总览</h2>
        <p class="subtitle">查看录取结果，归档后从最终快照渲染</p>
      </div>
      <el-button type="primary" :loading="exporting" @click="exportResults">导出 Excel</el-button>
    </div>

    <el-alert
      v-if="overview?.archived === 1"
      type="success"
      :closable="false"
      show-icon
      title="本批次已归档，数据来自最终归档快照（只读）"
    />

    <el-card shadow="never">
      <div class="filters">
        <el-select v-model="query.roundId" style="width: 170px" @change="handleRoundChange">
          <el-option
            v-for="item in rounds"
            :key="item.id"
            :label="`第 ${item.roundNo} 轮 · ${item.roundName}`"
            :value="item.id"
          />
        </el-select>
        <el-input
          v-model="query.keyword"
          placeholder="学号或姓名"
          clearable
          style="width: 180px"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="query.status" placeholder="录取状态" clearable style="width: 140px">
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </el-card>

    <ResultOverviewStats :overview="overview" />

    <el-card shadow="never">
      <el-table v-loading="loading" :data="overview?.page.list ?? []" stripe>
        <el-table-column prop="studentNo" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column label="学院 / 专业" min-width="180">
          <template #default="{ row }">
            <div>{{ row.college }}</div>
            <div class="muted">{{ row.major }} · {{ row.grade }} 级</div>
          </template>
        </el-table-column>
        <el-table-column prop="labName" label="实训室" min-width="150" />
        <el-table-column prop="mentorName" label="导师" width="100" />
        <el-table-column label="总分" width="90">
          <template #default="{ row }">
            {{ row.totalScore === null ? '—' : row.totalScore.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="录取状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag[row.status]">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sourceTypeText" label="来源" width="110" />
        <el-table-column label="确认时间" min-width="170">
          <template #default="{ row }">{{ row.confirmTime ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              :disabled="overview?.archived === 1"
              @click="openAdjust(row)"
            >
              阶段内调整
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        class="pagination"
        :total="overview?.page.total ?? 0"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="loadOverview"
        @size-change="handleSizeChange"
      />
    </el-card>

    <AdminResultAdjustDialog v-model="adjustVisible" :record="adjustRecord" @done="loadOverview" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exportResultExcel, getResultOverview } from '@/api/adminArchive'
import { listRounds } from '@/api/adminRound'
import AdminResultAdjustDialog from '@/components/AdminResultAdjustDialog.vue'
import ResultOverviewStats from '@/components/ResultOverviewStats.vue'
import type { ResultOverview, ResultQuery, ResultRow } from '@/types/archive'
import type { RoundListItem } from '@/types/basic'

const ADMISSION_STATUS_TEXT: Record<number, string> = {
  1: '待确认',
  2: '已确认',
  3: '已入组',
  4: '已放弃',
  5: '逾期未确认'
}

const loading = ref(false)
const exporting = ref(false)
const rounds = ref<RoundListItem[]>([])
const overview = ref<ResultOverview | null>(null)
const adjustVisible = ref(false)
const adjustRecord = ref<ResultRow | null>(null)

const query = reactive<ResultQuery>({
  roundId: 0,
  keyword: '',
  pageNum: 1,
  pageSize: 10
})

const statusOptions = Object.entries(ADMISSION_STATUS_TEXT).map(([value, label]) => ({
  value: Number(value),
  label
}))

const statusTag: Record<number, 'success' | 'warning' | 'info' | 'danger' | 'primary'> = {
  1: 'warning',
  2: 'primary',
  3: 'success',
  4: 'info',
  5: 'danger'
}

function openAdjust(row: ResultRow) {
  adjustRecord.value = row
  adjustVisible.value = true
}

async function loadOverview() {
  if (!query.roundId) {
    return
  }
  loading.value = true
  try {
    overview.value = await getResultOverview({
      ...query,
      keyword: query.keyword?.trim() || undefined
    })
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function handleRoundChange() {
  query.pageNum = 1
  loadOverview()
}

function handleSearch() {
  query.pageNum = 1
  loadOverview()
}

function handleReset() {
  query.keyword = ''
  query.status = undefined
  query.pageNum = 1
  loadOverview()
}

function handleSizeChange() {
  query.pageNum = 1
  loadOverview()
}

async function exportResults() {
  if (!query.roundId) {
    ElMessage.warning('请选择轮次')
    return
  }
  exporting.value = true
  try {
    const blob = await exportResultExcel({ ...query, pageNum: 1, pageSize: 1000 })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const roundNo = rounds.value.find((item) => item.id === query.roundId)?.roundNo ?? ''
    link.download = `录取结果_第${roundNo}轮.xlsx`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  try {
    rounds.value = await listRounds()
    const lastRound = rounds.value.reduce(
      (latest, item) => (item.roundNo > latest.roundNo ? item : latest),
      rounds.value[0]
    )
    query.roundId = lastRound?.id ?? 0
    await loadOverview()
  } catch {
    // 错误提示已由请求层统一处理
  }
})
</script>

<style scoped>
.admin-page {
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
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.muted {
  color: #909399;
  font-size: 12px;
}
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
