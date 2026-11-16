<template>
  <section v-loading="loading" class="student-page">
    <h1>调剂与补录</h1>
    <el-card shadow="never">
      <el-radio-group v-model="stage" aria-label="调剂阶段">
        <el-radio-button :value="6">先 · 实训室内部调剂</el-radio-button>
        <el-radio-button :value="7">后 · 学院统筹调剂</el-radio-button>
      </el-radio-group>
      <p v-if="preference">本阶段调剂意愿：{{ (stage === 6 ? preference.obeyInternalAdjustment : preference.obeyCollegeAdjustment) ? '服从' : '不服从' }}</p>
      <p v-if="currentStage">批次当前阶段：{{ currentStage }}</p>
    </el-card>
    <el-alert v-if="failed" title="调剂数据读取失败" type="error" :closable="false"><el-button text @click="load">重试</el-button></el-alert>
    <el-empty v-if="!loading && !visible.length" description="暂无个人调剂通知" />
    <div v-else class="student-grid">
      <el-card v-for="item in visible" :key="item.id" shadow="never">
        <h2>{{ item.targetLabName || '实训室#' + item.targetLaboratoryId }}</h2>
        <p>调剂类型 · {{ typeLabel(item.adjustmentType) }}</p>
        <p>目标导师 · {{ item.targetTeacherName || '由实训室统筹' }}</p>
        <p v-if="item.sourceLabName && item.sourceLabName !== item.targetLabName">来源实训室 · {{ item.sourceLabName }}</p>
        <p v-if="item.reason">调剂说明 · {{ item.reason }}</p>
        <p>通知时间 · {{ formatDateTime(item.createdAt) }}</p>
        <p>处理结果 · <el-tag :type="statusTag(item.status)">{{ statusLabel(item.status) }}</el-tag></p>
        <div v-if="item.status === 'PENDING'" class="student-actions">
          <el-button type="primary" :loading="savingId === item.id" @click="decide(item, true)">接受调剂</el-button>
          <el-button :loading="savingId === item.id" @click="decide(item, false)">拒绝调剂</el-button>
        </div>
      </el-card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { PreferenceItem } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime, studentApi, type StudentAdjustmentRecord } from '@/api/student'

const route = useRoute()
const stage = ref(route.query.stage === '6' ? 6 : 7)
watch(() => route.query.stage, value => { stage.value = value === '6' ? 6 : 7 })
const preference = ref<PreferenceItem>()
const currentStage = ref('')
const failed = ref(false)

const loading = ref(false)
const savingId = ref<number | null>(null)
const records = ref<StudentAdjustmentRecord[]>([])

const visible = computed(() => {
  if (stage.value === 6) return records.value.filter((item) => item.adjustmentType === 'INTERNAL')
  return records.value.filter((item) => item.adjustmentType === 'CROSS_LAB' || item.adjustmentType === 'MANUAL_PLACEMENT')
})

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    INTERNAL: '实训室内部调剂', CROSS_LAB: '跨实训室调剂', MANUAL_PLACEMENT: '沟通安置'
  }
  return labels[type] ?? type
}
function statusLabel(status: string) {
  const labels: Record<string, string> = { PENDING: '待确认', CONFIRMED: '已接受', REJECTED: '已拒绝' }
  return labels[status] ?? status
}
function statusTag(status: string) {
  if (status === 'CONFIRMED') return 'success'
  if (status === 'PENDING') return 'warning'
  return 'info'
}

async function load() {
  loading.value = true
  try {
    const [items, choices, batch] = await Promise.all([studentApi.myAdjustments(), studentApi.myPreferences(), studentApi.batchesCurrent()])
    records.value = items
    preference.value = choices[0]
    currentStage.value = batch?.currentStage?.name ?? ''
    failed.value = false
  } catch (error) {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function decide(item: StudentAdjustmentRecord, confirmed: boolean) {
  if (savingId.value !== null) return
  const name = item.targetLabName || '该实训室'
  const agreed = await ElMessageBox.confirm(
    confirmed ? `确认接受「${name}」的调剂？` : `确认拒绝「${name}」的调剂？`,
    '调剂确认', { type: confirmed ? 'warning' : 'info' }
  ).then(() => true, () => false)
  if (!agreed) return
  savingId.value = item.id
  try {
    await studentApi.confirmAdjustment(item.id, confirmed)
    ElMessage.success('调剂结果已保存')
    await load()
  } catch (error) {
    console.error('调剂确认失败', error)
  } finally {
    savingId.value = null
  }
}

onMounted(load)
</script>
