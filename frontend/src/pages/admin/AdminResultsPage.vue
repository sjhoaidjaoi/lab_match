<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h2>全院录取总览</h2>
        <p class="subtitle">按实训室 / 导师 / 学生查看录取结果，归档后从最终快照渲染</p>
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
        <el-radio-group v-model="query.groupBy" @change="handleGroupChange">
          <el-radio-button value="lab">按实训室</el-radio-button>
          <el-radio-button value="mentor">按导师</el-radio-button>
          <el-radio-button value="student">按学生</el-radio-button>
        </el-radio-group>
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

    <el-row :gutter="16">
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">名额上限</div>
          <div class="stat-value">{{ overview?.totalQuota ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">已录取</div>
          <div class="stat-value">{{ overview?.totalAdmitted ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">已确认</div>
          <div class="stat-value">{{ overview?.totalConfirmed ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">已入组</div>
          <div class="stat-value">{{ overview?.totalEnrolled ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">名额饱和度</div>
          <div class="stat-value">{{ formatRate(overview?.saturationRate ?? 0) }}%</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card v-if="query.groupBy !== 'student'" shadow="never">
      <template #header>分组名额饱和度</template>
      <el-table :data="overview?.groups ?? []" stripe>
        <el-table-column prop="name" :label="query.groupBy === 'lab' ? '实训室' : '导师'" min-width="150" />
        <el-table-column prop="totalQuota" label="名额上限" width="100" />
        <el-table-column prop="admitted" label="已录取" width="90" />
        <el-table-column prop="enrolled" label="已入组" width="90" />
        <el-table-column label="饱和度" min-width="200">
          <template #default="{ row }">
            <el-progress :percentage="Math.min(row.saturationRate, 100)" :stroke-width="10" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MockError } from '@/mock/auth'
import { mockRoundList } from '@/mock/basic'
import { ADMISSION_STATUS_TEXT, mockExportResults, mockResultOverview } from '@/mock/archive'
import type { RoundListItem } from '@/types/basic'
import type { ResultOverview, ResultQuery } from '@/types/archive'

const loading = ref(false)
const exporting = ref(false)
const rounds = ref<RoundListItem[]>([])
const overview = ref<ResultOverview | null>(null)

const query = reactive<ResultQuery>({
  roundId: 0,
  keyword: '',
  groupBy: 'lab',
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

function formatRate(value: number): string {
  return value.toFixed(2)
}

async function loadOverview() {
  if (!query.roundId) {
    return
  }
  loading.value = true
  try {
    overview.value = await mockResultOverview({
      ...query,
      keyword: query.keyword?.trim() || undefined
    })
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '加载录取总览失败')
  } finally {
    loading.value = false
  }
}

function handleRoundChange() {
  query.pageNum = 1
  loadOverview()
}

function handleGroupChange() {
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
  query.groupBy = 'lab'
  query.pageNum = 1
  loadOverview()
}

function handleSizeChange() {
  query.pageNum = 1
  loadOverview()
}

async function exportResults() {
  exporting.value = true
  try {
    const content = await mockExportResults({ ...query, pageNum: 1, pageSize: 1000 })
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `录取结果_第${query.roundId}轮.csv`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '导出失败')
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  try {
    rounds.value = await mockRoundList()
    const lastRound = rounds.value.reduce(
      (latest, item) => (item.roundNo > latest.roundNo ? item : latest),
      rounds.value[0]
    )
    query.roundId = lastRound?.id ?? 0
    await loadOverview()
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '加载轮次失败')
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

.stat-card {
  text-align: center;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
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
