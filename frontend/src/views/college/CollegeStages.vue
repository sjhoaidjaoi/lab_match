<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">阶段时间管理</h2>
          <p class="page-desc">配置八阶段起止时间：到点自动开始与结束，无需人工开启；如需干预可暂停或提前结束。</p>
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
        <el-table-column label="状态" width="130" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.stageStatus)" effect="light">{{ STAGE_STATUS_LABELS[row.stageStatus] || row.stageStatus }}</el-tag>
            <el-tag v-if="row.statusOverride" class="override-tag" type="warning" effect="plain" size="small">人工</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="248" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" text :disabled="batchStopped" @click="save(row)">保存</el-button>
            <el-button
              v-if="!row.statusOverride"
              size="small"
              text
              type="warning"
              :disabled="batchStopped"
              @click="togglePause(row)"
            >暂停</el-button>
            <el-button
              v-if="!row.statusOverride && row.stageStatus !== 'COMPLETED'"
              size="small"
              text
              type="danger"
              :disabled="batchStopped"
              @click="finishEarly(row)"
            >提前结束</el-button>
            <el-button
              v-if="row.statusOverride"
              size="small"
              text
              type="success"
              :disabled="batchStopped"
              @click="resumeAuto(row)"
            >恢复自动流转</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-alert
      class="tip"
      type="info"
      :closable="false"
      title="说明"
      description="阶段状态默认由起止时间自动推导：到点开始、到点结束，无需人工开启。暂停与提前结束属于人工干预，会一直生效，需点「恢复自动流转」才回到时间窗判定。"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { BatchInfo, StageInfo } from '@/types'
import { STAGE_STATUS_LABELS, statusTag } from './shared'

const route = useRoute()
const batches = ref<BatchInfo[]>([])
const batchId = ref<number>(0)
const stages = ref<StageInfo[]>([])
const loading = ref(false)
const batchStopped = computed(() => batches.value.find((b) => b.id === batchId.value)?.status === 'STOPPED')

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
  // 只提交时间；人工干预状态由「暂停/提前结束/恢复」单独控制，避免保存时间时误清除
  await collegeApi.updateStage(batchId.value, row.id, {
    startTime: new Date(row.startTime).toISOString(),
    endTime: new Date(row.endTime).toISOString()
  })
  ElMessage.success(`「${row.stageName}」时间已保存`)
  await loadStages()
}

async function togglePause(row: StageInfo) {
  await collegeApi.updateStage(batchId.value, row.id, { stageStatus: 'PAUSED' })
  ElMessage.success(`「${row.stageName}」已暂停`)
  await loadStages()
}

async function finishEarly(row: StageInfo) {
  try {
    await ElMessageBox.confirm(
      `确认提前结束「${row.stageName}」？结束后该阶段相关业务将立即关闭，需点「恢复自动流转」才会回到时间窗判定。`,
      '提前结束阶段',
      { type: 'warning', confirmButtonText: '确认结束', cancelButtonText: '取消' }
    )
  } catch { return }
  await collegeApi.updateStage(batchId.value, row.id, { stageStatus: 'COMPLETED' })
  ElMessage.success(`「${row.stageName}」已提前结束`)
  await loadStages()
}

async function resumeAuto(row: StageInfo) {
  await collegeApi.updateStage(batchId.value, row.id, { stageStatus: 'IN_PROGRESS' })
  ElMessage.success(`「${row.stageName}」已恢复按时间自动流转`)
  await loadStages()
}

watch(batchId, (v) => { if (v) loadStages() })
onMounted(loadBatches)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.tip { margin-top: 16px; }
.override-tag { margin-left: 6px; }
</style>
