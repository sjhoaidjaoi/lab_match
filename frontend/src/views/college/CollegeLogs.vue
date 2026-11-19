<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">系统操作日志</h2>
      <p class="page-desc">记录涉及录取名单、调剂名单、阶段状态与重要权限的操作，便于追溯。</p>
    </div>

    <el-card shadow="never">
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索操作描述" clearable style="width: 220px" @keyup.enter="search" @clear="search" />
        <el-select v-model="operationType" clearable placeholder="操作类型" style="width: 200px" @change="search">
          <el-option v-for="(label, key) in OPERATION_LABELS" :key="key" :label="label" :value="key" />
        </el-select>
        <el-button @click="search">查询</el-button>
        <el-button @click="exportList">导出 Excel</el-button>
      </div>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="operatorName" label="操作人" width="110" />
        <el-table-column label="操作类型" width="160">
          <template #default="{ row }">
            <el-tag effect="plain" size="small">{{ OPERATION_LABELS[row.operationType] || row.operationType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetType" label="对象类型" width="120" />
        <el-table-column prop="targetId" label="对象 ID" width="90" align="center">
          <template #default="{ row }">{{ row.targetId ?? '—' }}</template>
        </el-table-column>
        <el-table-column prop="operationDescription" label="操作说明" min-width="320" show-overflow-tooltip />
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next, sizes"
          :page-sizes="[20, 50, 100, 200]"
          @current-change="load"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { collegeApi, listOf } from '@/api/college'
import type { OperationLogItem } from '@/types'
import { exportExcel, formatTime } from './shared'

const OPERATION_LABELS: Record<string, string> = {
  CREATE_BATCH: '创建批次',
  UPDATE_STAGE: '调整阶段时间',
  RESTART_STAGES: '重新开始选拔',
  CREATE_USER: '新建账号',
  UPDATE_USER: '修改账号',
  RESET_PASSWORD: '重置密码',
  DISABLE_USER: '停用账号',
  CREATE_LAB: '新增实训室',
  UPDATE_LAB: '修改实训室',
  CREATE_CROSS_ADJUSTMENT: '跨室调剂',
  MANUAL_PLACEMENT: '沟通安置',
  REVIEW_ADJUSTMENT: '审核调剂',
  MERGE_FINAL_LIST: '合并最终名单',
  ENROLL_STUDENT: '确认入组',
  PUBLISH_RESULT: '发布公示',
  CREATE_INTERNAL_ADJUSTMENT: '内部调剂'
}

const list = ref<OperationLogItem[]>([])
const loading = ref(false)
const keyword = ref('')
const operationType = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

async function load() {
  loading.value = true
  try {
    const res = await collegeApi.logs({
      keyword: keyword.value, operationType: operationType.value,
      page: page.value, pageSize: pageSize.value
    })
    list.value = listOf(res)
    total.value = Array.isArray(res) ? res.length : res.total
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}

function onSizeChange() {
  page.value = 1
  load()
}

async function exportList() {
  // 导出全部匹配记录（不带分页参数，后端返回完整数组）
  const res = await collegeApi.logs({ keyword: keyword.value, operationType: operationType.value })
  const rows = listOf(res)
  exportExcel(
    `操作日志-${new Date().toISOString().slice(0, 10)}.xlsx`,
    ['时间', '操作人', '操作类型', '对象类型', '对象ID', '操作说明'],
    rows.map((l) => [
      formatTime(l.createdAt), l.operatorName || '',
      OPERATION_LABELS[l.operationType] || l.operationType,
      l.targetType, l.targetId ?? '', l.operationDescription
    ])
  )
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.pager { display: flex; justify-content: flex-end; margin-top: 14px; }
@media (max-width: 768px) {
  .toolbar :deep(.el-input), .toolbar :deep(.el-select) { width: 100% !important; }
  .pager { justify-content: center; }
}
</style>
