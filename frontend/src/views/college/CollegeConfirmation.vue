<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">录取确认管理</h2>
          <p class="page-desc">跟踪拟录取学生的确认结果；逾期未确认的意向可一键释放名额。</p>
        </div>
        <div class="tools">
          <el-button @click="load">刷新</el-button>
          <el-button type="warning" :loading="expiring" @click="expire">释放逾期名额</el-button>
        </div>
      </div>
    </div>

    <el-card shadow="never" class="block">
      <template #header><span>各实训室确认情况</span></template>
      <el-table :data="perLab" stripe>
        <el-table-column prop="laboratoryName" label="实训室" min-width="200" />
        <el-table-column prop="quota" label="计划名额" width="95" align="center" />
        <el-table-column prop="intended" label="拟录取" width="90" align="center" />
        <el-table-column prop="confirmed" label="已确认" width="90" align="center" />
        <el-table-column prop="rejected" label="已放弃" width="90" align="center" />
        <el-table-column prop="admitted" label="最终录取" width="95" align="center" />
        <el-table-column label="剩余名额" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.remaining > 0 ? 'warning' : 'success'" effect="plain">{{ row.remaining }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="block-header">
          <span>确认明细</span>
          <el-radio-group v-model="statusFilter" size="small">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="PENDING">待确认</el-radio-button>
            <el-radio-button value="CONFIRMED">已确认</el-radio-button>
            <el-radio-button value="REJECTED">已放弃</el-radio-button>
            <el-radio-button value="EXPIRED">已逾期</el-radio-button>
          </el-radio-group>
        </div>
      </template>
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
import type { AdmissionDetail, CollegeDashboard } from '@/types'
import { ADMISSION_STATUS_LABELS, ADMISSION_TYPE_LABELS, formatTime, statusTag } from './shared'

const list = ref<AdmissionDetail[]>([])
const perLab = ref<CollegeDashboard['perLab']>([])
const loading = ref(false)
const expiring = ref(false)
const statusFilter = ref('')

const filtered = computed(() =>
  statusFilter.value
    ? list.value.filter((a) => a.admissionType === 'INTENDED' && a.status === statusFilter.value)
    : list.value.filter((a) => a.admissionType === 'INTENDED')
)

async function load() {
  loading.value = true
  try {
    const [a, d] = await Promise.all([collegeApi.admissions(), collegeApi.dashboard()])
    list.value = a
    perLab.value = d.perLab
  } finally {
    loading.value = false
  }
}

async function expire() {
  expiring.value = true
  try {
    const res = await collegeApi.expireAdmissions()
    ElMessage.success(res.expired > 0 ? `已释放 ${res.expired} 个逾期名额` : '暂无逾期未确认的意向')
    await load()
  } finally {
    expiring.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.tools { display: flex; gap: 10px; }
.block { margin-bottom: 14px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
</style>
