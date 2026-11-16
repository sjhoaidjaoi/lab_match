<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">阶段时间管理</h2>
          <p class="page-desc">配置八阶段起止时间；阶段状态由时间窗自动计算，也可手动暂停。</p>
        </div>
        <el-select v-model="batchId" placeholder="选择批次" style="width: 240px" @change="loadStages">
          <el-option v-for="b in batches" :key="b.id" :label="`${b.batchName}（${b.academicYear}）`" :value="b.id" />
        </el-select>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="stages" stripe>
        <el-table-column prop="stageNumber" label="序号" width="70" align="center" />
        <el-table-column prop="stageName" label="阶段" min-width="170" />
        <el-table-column label="开始时间" width="230">
          <template #default="{ row }">
            <el-date-picker v-model="row.startTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="结束时间" width="230">
          <template #default="{ row }">
            <el-date-picker v-model="row.endTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.stageStatus)" effect="light">{{ STAGE_STATUS_LABELS[row.stageStatus] || row.stageStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" text @click="save(row)">保存</el-button>
            <el-button
              size="small"
              text
              :type="row.stageStatus === 'PAUSED' ? 'success' : 'warning'"
              @click="togglePause(row)"
            >
              {{ row.stageStatus === 'PAUSED' ? '恢复' : '暂停' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-alert
      class="tip"
      type="info"
      :closable="false"
      title="说明"
      description="学生端与管理端展示的当前阶段依赖此时间窗，请按学院统一安排配置；保存后立即生效。"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { BatchInfo, StageInfo } from '@/types'
import { STAGE_STATUS_LABELS, statusTag } from './shared'

const route = useRoute()
const batches = ref<BatchInfo[]>([])
const batchId = ref<number>(0)
const stages = ref<StageInfo[]>([])
const loading = ref(false)

async function loadBatches() {
  batches.value = await collegeApi.batches()
  const fromQuery = Number(route.query.batchId || 0)
  const active = batches.value.find((b) => b.status === 'IN_PROGRESS')
  batchId.value = fromQuery || active?.id || batches.value[0]?.id || 0
}

async function loadStages() {
  if (!batchId.value) return
  loading.value = true
  try {
    const list = await collegeApi.stages(batchId.value)
    stages.value = list.map((s) => ({
      ...s,
      startTime: s.startTime ? s.startTime.slice(0, 19) : '',
      endTime: s.endTime ? s.endTime.slice(0, 19) : ''
    }))
  } finally {
    loading.value = false
  }
}

async function save(row: StageInfo) {
  await collegeApi.updateStage(batchId.value, row.id, {
    startTime: new Date(row.startTime).toISOString(),
    endTime: new Date(row.endTime).toISOString(),
    stageStatus: row.stageStatus === 'PAUSED' ? 'PAUSED' : undefined
  })
  ElMessage.success(`「${row.stageName}」时间已保存`)
  await loadStages()
}

async function togglePause(row: StageInfo) {
  const next = row.stageStatus === 'PAUSED' ? 'IN_PROGRESS' : 'PAUSED'
  await collegeApi.updateStage(batchId.value, row.id, { stageStatus: next })
  ElMessage.success(next === 'PAUSED' ? '阶段已暂停' : '阶段已恢复')
  await loadStages()
}

watch(batchId, (v) => { if (v) loadStages() })
onMounted(loadBatches)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.tip { margin-top: 16px; }
</style>
