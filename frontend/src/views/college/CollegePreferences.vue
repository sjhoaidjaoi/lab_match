<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">志愿填报管理</h2>
          <p class="page-desc">查看全院学生平行志愿与两项调剂意愿；同一学生最多 3 个志愿，无优先级。</p>
        </div>
        <div class="tools">
          <el-select v-model="labFilter" clearable placeholder="按实训室筛选" style="width: 200px">
            <el-option v-for="l in labs" :key="l.id" :label="l.name" :value="l.id" />
          </el-select>
          <el-button @click="exportList">导出 CSV</el-button>
        </div>
      </div>
    </div>

    <el-row :gutter="14" class="summary">
      <el-col v-for="l in labSummary" :key="l.id" :xs="12" :sm="8" :lg="4">
        <div class="mini-card">
          <div class="mini-name">{{ l.name }}</div>
          <div class="mini-value">{{ l.count }}<span>人</span></div>
          <div class="mini-sub">名额 {{ l.quota }}</div>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="filtered" stripe>
        <el-table-column prop="studentNumber" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column prop="laboratoryName" label="志愿实训室" min-width="200" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'SUBMITTED' ? 'success' : 'info'" effect="light">
              {{ row.status === 'SUBMITTED' ? '已提交' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="服从内部调剂" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.obeyInternalAdjustment ? 'success' : 'info'" effect="plain">
              {{ row.obeyInternalAdjustment ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="服从全院调剂" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.obeyCollegeAdjustment ? 'success' : 'info'" effect="plain">
              {{ row.obeyCollegeAdjustment ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ formatTime(row.submittedAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { collegeApi } from '@/api/college'
import type { LabView, PreferenceDetail } from '@/types'
import { exportExcel, formatTime } from './shared'

const list = ref<PreferenceDetail[]>([])
const labs = ref<LabView[]>([])
const loading = ref(false)
const labFilter = ref<number | ''>('')

const filtered = computed(() =>
  labFilter.value ? list.value.filter((p) => p.laboratoryId === labFilter.value) : list.value
)

const labSummary = computed(() =>
  labs.value.map((l) => ({
    id: l.id,
    name: l.name,
    quota: l.recruitmentQuota,
    count: list.value.filter((p) => p.laboratoryId === l.id && p.status === 'SUBMITTED').length
  }))
)

async function load() {
  loading.value = true
  try {
    const [p, l] = await Promise.all([collegeApi.preferences(), collegeApi.labs()])
    list.value = p
    labs.value = l
  } finally {
    loading.value = false
  }
}

function exportList() {
  exportExcel(
    `志愿填报明细-${new Date().toISOString().slice(0, 10)}.csv`,
    ['学号', '姓名', '志愿实训室', '状态', '服从内部调剂', '服从全院调剂', '提交时间'],
    filtered.value.map((p) => [
      p.studentNumber, p.studentName, p.laboratoryName,
      p.status === 'SUBMITTED' ? '已提交' : '草稿',
      p.obeyInternalAdjustment ? '是' : '否',
      p.obeyCollegeAdjustment ? '是' : '否',
      formatTime(p.submittedAt)
    ])
  )
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.tools { display: flex; gap: 10px; }
.summary { margin-bottom: 14px; }
.mini-card { background: #fff; border: 1px solid var(--lm-border); border-radius: var(--lm-radius); padding: 12px 14px; margin-bottom: 12px; }
.mini-name { font-size: 12.5px; color: var(--lm-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-value { font-size: 22px; font-weight: 600; margin: 4px 0; }
.mini-value span { font-size: 12px; font-weight: 400; color: var(--lm-text-secondary); margin-left: 2px; }
.mini-sub { font-size: 12px; color: var(--lm-text-secondary); }
</style>
