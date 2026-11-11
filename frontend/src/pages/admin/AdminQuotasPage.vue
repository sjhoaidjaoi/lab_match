<template>
  <div v-loading="loading" class="quota-page">
    <div class="page-header">
      <div>
        <h2>名额总览</h2>
        <p class="subtitle">按实训室汇总导师个人名额与占用情况</p>
      </div>
      <el-button type="primary" :loading="exporting" @click="handleExport">导出 Excel</el-button>
    </div>

    <el-alert
      v-if="overQuota"
      type="warning"
      :closable="false"
      show-icon
      title="存在导师名额合计超过实训室总名额的实训室，请及时调整"
    />

    <el-table :data="rows" border show-summary :summary-method="summaryMethod" class="quota-table">
      <el-table-column prop="labName" label="实训室" min-width="200" />
      <el-table-column prop="totalQuota" label="总名额" width="110" align="right" />
      <el-table-column prop="quotaSum" label="导师名额合计" width="130" align="right">
        <template #default="{ row }">
          <span :class="{ 'danger-text': row.quotaSum > row.totalQuota }">{{ row.quotaSum }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="quotaUsedSum" label="已占用" width="110" align="right" />
      <el-table-column prop="remainQuota" label="剩余名额" width="110" align="right">
        <template #default="{ row }">
          <el-tag :type="row.remainQuota === 0 ? 'warning' : 'success'" size="small">
            {{ row.remainQuota }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exportQuotas, getQuotaOverview } from '@/api/adminQuota'
import type { QuotaOverviewItem } from '@/types/quota'

const loading = ref(false)
const exporting = ref(false)
const rows = ref<QuotaOverviewItem[]>([])

const totals = computed(() =>
  rows.value.reduce(
    (acc, item) => ({
      totalQuota: acc.totalQuota + item.totalQuota,
      quotaSum: acc.quotaSum + item.quotaSum,
      quotaUsedSum: acc.quotaUsedSum + item.quotaUsedSum,
      remainQuota: acc.remainQuota + item.remainQuota
    }),
    { totalQuota: 0, quotaSum: 0, quotaUsedSum: 0, remainQuota: 0 }
  )
)

const overQuota = computed(() => rows.value.some((item) => item.quotaSum > item.totalQuota))

function summaryMethod(): string[] {
  return [
    '合计',
    String(totals.value.totalQuota),
    String(totals.value.quotaSum),
    String(totals.value.quotaUsedSum),
    String(totals.value.remainQuota)
  ]
}

async function loadOverview() {
  loading.value = true
  try {
    rows.value = await getQuotaOverview()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const blob = await exportQuotas()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '全院名额总览.xlsx'
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    exporting.value = false
  }
}

onMounted(loadOverview)
</script>

<style scoped>
.quota-page {
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

.danger-text {
  color: #f56c6c;
  font-weight: 600;
}

.quota-table {
  width: 100%;
}
</style>
