<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">拟录取名单管理</h2>
          <p class="page-desc">查看各实训室提交的拟录取与递补名单；名单由实训室组长在面试后生成。</p>
        </div>
        <div class="tools">
          <el-select v-model="labFilter" clearable placeholder="按实训室筛选" style="width: 200px">
            <el-option v-for="l in labs" :key="l.id" :label="l.name" :value="l.id" />
          </el-select>
          <el-radio-group v-model="typeFilter">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="INTENDED">拟录取</el-radio-button>
            <el-radio-button value="ALTERNATE">递补</el-radio-button>
          </el-radio-group>
          <el-button @click="exportList">导出 CSV</el-button>
        </div>
      </div>
    </div>

    <el-row :gutter="14" class="summary">
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">拟录取</div><div class="stat-value">{{ counts.intended }}</div></div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">递补</div><div class="stat-value">{{ counts.alternate }}</div></div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">已确认</div><div class="stat-value">{{ counts.confirmed }}</div></div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card"><div class="stat-label">已放弃 / 逾期</div><div class="stat-value">{{ counts.rejected + counts.expired }}</div></div>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="filtered" stripe>
        <el-table-column prop="studentNumber" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column prop="laboratoryName" label="实训室" min-width="200" />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.admissionType === 'INTENDED' ? 'primary' : 'warning'" effect="light">
              {{ ADMISSION_TYPE_LABELS[row.admissionType] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="确认状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" effect="light">
              {{ ADMISSION_STATUS_LABELS[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="确认截止" width="170">
          <template #default="{ row }">{{ formatTime(row.confirmationDeadline) }}</template>
        </el-table-column>
        <el-table-column label="确认时间" width="170">
          <template #default="{ row }">{{ formatTime(row.confirmedAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { AdmissionDetail, LabView } from '@/types'
import { ADMISSION_STATUS_LABELS, ADMISSION_TYPE_LABELS, exportExcel, formatTime, statusTag } from './shared'

const list = ref<AdmissionDetail[]>([])
const labs = ref<LabView[]>([])
const loading = ref(false)
const labFilter = ref<number | ''>('')
const typeFilter = ref('')

const filtered = computed(() =>
  list.value
    .filter((a) => (labFilter.value ? a.laboratoryId === labFilter.value : true))
    .filter((a) => (typeFilter.value ? a.admissionType === typeFilter.value : true))
)

const counts = computed(() => ({
  intended: list.value.filter((a) => a.admissionType === 'INTENDED').length,
  alternate: list.value.filter((a) => a.admissionType === 'ALTERNATE').length,
  confirmed: list.value.filter((a) => a.status === 'CONFIRMED').length,
  rejected: list.value.filter((a) => a.status === 'REJECTED').length,
  expired: list.value.filter((a) => a.status === 'EXPIRED').length
}))

async function load() {
  loading.value = true
  try {
    const [a, l] = await Promise.all([collegeApi.admissions(), collegeApi.labs()])
    list.value = a
    labs.value = l
  } catch {
    ElMessage.error('拟录取名单加载失败')
  } finally {
    loading.value = false
  }
}

function exportList() {
  exportExcel(
    `拟录取名单-${new Date().toISOString().slice(0, 10)}.csv`,
    ['学号', '姓名', '实训室', '类型', '确认状态', '确认截止', '确认时间'],
    filtered.value.map((a) => [
      a.studentNumber, a.studentName, a.laboratoryName,
      ADMISSION_TYPE_LABELS[a.admissionType], ADMISSION_STATUS_LABELS[a.status] || a.status,
      formatTime(a.confirmationDeadline), formatTime(a.confirmedAt)
    ])
  )
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.tools { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.summary { margin-bottom: 14px; }
.stat-card { background: #fff; border: 1px solid var(--lm-border); border-radius: var(--lm-radius); padding: 14px 16px; margin-bottom: 12px; }
.stat-label { color: var(--lm-text-secondary); font-size: 12.5px; }
.stat-value { font-size: 24px; font-weight: 600; margin-top: 6px; }
</style>
