<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">实训室空缺统计</h2>
          <p class="page-desc">基于计划名额与已确认/最终录取人数计算各实训室剩余名额，作为调剂依据。</p>
        </div>
        <el-button @click="exportList">导出 CSV</el-button>
      </div>
    </div>

    <el-row :gutter="14" class="summary">
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">计划名额合计</div><div class="stat-value">{{ totals.quota }}</div></div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">已确认 / 录取</div><div class="stat-value">{{ totals.admitted }}</div></div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">空缺合计</div><div class="stat-value warning">{{ totals.remaining }}</div></div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">满员实训室</div><div class="stat-value">{{ fullCount }}</div></div>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="rows" stripe>
        <el-table-column prop="laboratoryName" label="实训室" min-width="220" />
        <el-table-column prop="quota" label="计划名额" width="100" align="center" />
        <el-table-column prop="intended" label="拟录取" width="95" align="center" />
        <el-table-column prop="confirmed" label="已确认" width="95" align="center" />
        <el-table-column prop="admitted" label="最终录取" width="100" align="center" />
        <el-table-column label="名额使用率" min-width="200">
          <template #default="{ row }">
            <el-progress :percentage="usage(row)" :stroke-width="9" :status="usage(row) >= 100 ? 'success' : undefined" />
          </template>
        </el-table-column>
        <el-table-column label="剩余名额" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.remaining > 0 ? 'warning' : 'success'" effect="light">{{ row.remaining }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.remaining > 0 ? 'warning' : 'success'" effect="plain">
              {{ row.remaining > 0 ? '有空缺' : '已满员' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { collegeApi } from '@/api/college'
import type { CapacityRow } from '@/types'
import { exportExcel } from './shared'

const rows = ref<CapacityRow[]>([])
const loading = ref(false)

const totals = computed(() => ({
  quota: rows.value.reduce((s, r) => s + r.quota, 0),
  admitted: rows.value.reduce((s, r) => s + (r.admitted || r.confirmed), 0),
  remaining: rows.value.reduce((s, r) => s + r.remaining, 0)
}))
const fullCount = computed(() => rows.value.filter((r) => r.remaining === 0).length)

function usage(row: CapacityRow) {
  if (!row.quota) return 0
  return Math.min(Math.round(((row.admitted || row.confirmed) / row.quota) * 100), 100)
}

async function load() {
  loading.value = true
  try {
    rows.value = await collegeApi.capacity()
  } finally {
    loading.value = false
  }
}

function exportList() {
  exportExcel(
    `实训室空缺统计-${new Date().toISOString().slice(0, 10)}.csv`,
    ['实训室', '计划名额', '拟录取', '已确认', '最终录取', '剩余名额'],
    rows.value.map((r) => [r.laboratoryName, r.quota, r.intended, r.confirmed, r.admitted, r.remaining])
  )
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.summary { margin-bottom: 14px; }
.stat-card { background: #fff; border: 1px solid var(--lm-border); border-radius: var(--lm-radius); padding: 14px 16px; margin-bottom: 12px; }
.stat-label { color: var(--lm-text-secondary); font-size: 12.5px; }
.stat-value { font-size: 24px; font-weight: 600; margin-top: 6px; }
.stat-value.warning { color: #d97706; }
</style>
