<template>
  <div class="leader-admission-page">
    <div class="page-header">
      <div>
        <h2>{{ isFinal ? '本室最终名单' : '录取确认汇总' }}</h2>
        <p class="subtitle">
          {{ isFinal ? '本室已确认与已入组学生名单，可导出 Excel' : '查看本室学生录取确认进度与最终去向' }}
        </p>
      </div>
      <el-button v-if="isFinal" type="primary" :loading="exporting" :disabled="!roundId" @click="handleExport">
        导出名单
      </el-button>
    </div>

    <div class="stat-grid">
      <el-card shadow="never"><div class="stat-label">本室名额</div><div class="stat-value">{{ summary?.labQuota ?? 0 }}</div></el-card>
      <el-card shadow="never"><div class="stat-label">已确认</div><div class="stat-value success">{{ summary?.confirmedCount ?? 0 }}</div></el-card>
      <el-card shadow="never"><div class="stat-label">待确认</div><div class="stat-value warn">{{ summary?.pendingCount ?? 0 }}</div></el-card>
      <el-card shadow="never"><div class="stat-label">已放弃</div><div class="stat-value muted">{{ summary?.abandonedCount ?? 0 }}</div></el-card>
      <el-card shadow="never"><div class="stat-label">已入组</div><div class="stat-value success">{{ summary?.enrolledCount ?? 0 }}</div></el-card>
      <el-card shadow="never"><div class="stat-label">剩余名额</div><div class="stat-value">{{ summary?.remainQuota ?? 0 }}</div></el-card>
    </div>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="section-title">{{ isFinal ? '最终名单' : '本室录取名单' }}</span>
          <el-radio-group v-if="!isFinal" v-model="statusFilter" size="small">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button :value="1">待确认</el-radio-button>
            <el-radio-button :value="2">已确认</el-radio-button>
            <el-radio-button :value="3">已入组</el-radio-button>
            <el-radio-button :value="4">已放弃</el-radio-button>
          </el-radio-group>
          <span v-else class="count">共 {{ filteredItems.length }} 人</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="filteredItems" stripe>
        <el-table-column prop="studentNo" label="学号" width="130" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column prop="mentorName" label="导师" width="120" />
        <el-table-column label="总分" width="90">
          <template #default="{ row }">{{ formatScore(row.totalScore) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sourceTypeText" label="来源" width="110" />
        <el-table-column label="确认时间" min-width="170">
          <template #default="{ row }">{{ row.confirmTime || '-' }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && filteredItems.length === 0" description="暂无录取记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { exportLeaderAdmissions, getLeaderAdmissions } from '@/api/leaderAdmission'
import { getCurrentRound } from '@/api/public'
import type { LeaderAdmissionSummary } from '@/types/admission'

const props = defineProps<{ mode: 'summary' | 'final' }>()

const loading = ref(false)
const exporting = ref(false)
const roundId = ref<number | null>(null)
const summary = ref<LeaderAdmissionSummary | null>(null)
const statusFilter = ref<number | ''>('')

const isFinal = computed(() => props.mode === 'final')

const filteredItems = computed(() => {
  const items = summary.value?.items ?? []
  if (isFinal.value || statusFilter.value === '') {
    return items
  }
  if (statusFilter.value === 4) {
    return items.filter((item) => item.status === 4 || item.status === 5)
  }
  return items.filter((item) => item.status === statusFilter.value)
})

function formatScore(value: number | null): string {
  return value === null ? '-' : value.toFixed(2)
}

function statusTag(status: number): 'success' | 'warning' | 'primary' | 'info' {
  if (status === 2 || status === 3) {
    return 'success'
  }
  if (status === 1) {
    return 'warning'
  }
  return 'info'
}

async function loadData() {
  loading.value = true
  try {
    const round = await getCurrentRound()
    roundId.value = round?.id ?? null
    summary.value = await getLeaderAdmissions({
      roundId: roundId.value ?? undefined,
      finalOnly: isFinal.value
    })
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const blob = await exportLeaderAdmissions(roundId.value ?? undefined)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '本室最终名单.xlsx'
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    exporting.value = false
  }
}

onMounted(loadData)

watch(
  () => props.mode,
  () => {
    statusFilter.value = ''
    loadData()
  }
)
</script>

<style scoped>
.leader-admission-page {
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

.stat-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 600;
  color: #1f2d3d;
}

.stat-value.success {
  color: #67c23a;
}

.stat-value.warn {
  color: #e6a23c;
}

.stat-value.muted {
  color: #909399;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
}

.count {
  font-size: 13px;
  color: #909399;
}
</style>
