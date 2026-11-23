<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">各实训室剩余名额</h2>
          <p class="page-desc">
            按「计划名额 − 已录取 − 待学生确认」实时计算各实训室剩余名额。
            第一轮录取结束后公布剩余名额，未录取学生据此填报第二轮、第三轮补录志愿。
          </p>
        </div>
        <div class="header-actions">
          <el-button @click="exportList">导出 CSV</el-button>
          <el-button :loading="acting" :disabled="!round?.canOpenNext" type="primary" @click="openNextRound">
            公布名额并开启第 {{ nextRound }} 轮补录
          </el-button>
          <el-button :loading="acting" :disabled="!round?.canClose" @click="closeCurrentRound">结束本轮录取</el-button>
        </div>
      </div>
    </div>

    <el-card shadow="never" class="round-card">
      <div class="round-row">
        <div class="round-info">
          <span class="round-label">当前批次</span>
          <strong>{{ view?.batchName || '—' }}</strong>
          <el-tag v-if="view?.academicYear" effect="plain" size="small">{{ view.academicYear }}</el-tag>
        </div>
        <el-steps :active="roundActive" align-center class="round-steps">
          <el-step v-for="item in roundSteps" :key="item.round" :title="item.label" :description="item.desc" />
        </el-steps>
      </div>
      <el-alert
        v-if="!round?.open"
        type="warning"
        :closable="false"
        show-icon
        title="当前没有开放的报名轮次"
         :description="round?.current === 3 ? '三轮已结束，进入统筹调剂录取阶段后可在全院调剂池办理。' : '在分轮补录阶段公布名额后，学生即可重新填报。'"
      />
      <el-alert
        v-else-if="round.supplementActive"
        type="info"
        :closable="false"
        show-icon
        :title="`第 ${round.open} 轮补录报名中`"
        description="学生在「调剂与补录」页可看到下列剩余名额并重新填报志愿。"
      />
    </el-card>

    <el-row :gutter="14" class="summary">
      <el-col :xs="12" :lg="6">
        <div class="stat-card">
          <div class="stat-label">计划名额合计</div>
          <div class="stat-value">{{ totals.plan }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card">
          <div class="stat-label">已录取</div>
          <div class="stat-value">{{ totals.admitted }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card">
          <div class="stat-label">待学生确认</div>
          <div class="stat-value">{{ totals.pending }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :lg="6">
        <div class="stat-card">
          <div class="stat-label">剩余名额</div>
          <div class="stat-value warning">{{ totals.remaining }}</div>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="view?.labs || []" row-key="id" stripe>
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="teacher-panel">
              <div class="teacher-title">导师名额明细</div>
              <el-table :data="row.teachers" size="small">
                <el-table-column prop="name" label="导师" min-width="120" />
                <el-table-column prop="identity" label="身份" min-width="120" />
                <el-table-column label="招生名额" width="110" align="center">
                  <template #default="{ row: teacher }">{{ teacher.quota == null ? '不限' : teacher.quota }}</template>
                </el-table-column>
                <el-table-column prop="admitted" label="已录取" width="90" align="center" />
                <el-table-column label="剩余" width="90" align="center">
                  <template #default="{ row: teacher }">
                    <el-tag :type="teacherRemainingType(teacher)" effect="light" size="small">
                      {{ teacher.remaining == null ? '不限' : teacher.remaining }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-if="!row.teachers.length" :image-size="60" description="本室尚未配置导师" />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="实训室" min-width="200">
          <template #default="{ row }">
            <div class="lab-name">{{ row.name }}</div>
            <div class="lab-sub">{{ row.researchDirection || row.college || '—' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="plan" label="计划" width="80" align="center" />
        <el-table-column prop="admitted" label="已录取" width="90" align="center" />
        <el-table-column prop="pending" label="待确认" width="90" align="center" />
        <el-table-column label="名额使用率" min-width="180">
          <template #default="{ row }">
            <el-progress :percentage="usage(row)" :stroke-width="9" :status="usage(row) >= 100 ? 'success' : undefined" />
          </template>
        </el-table-column>
        <el-table-column label="剩余名额" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.remaining > 0 ? 'warning' : 'success'" effect="light">{{ row.remaining }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { allocationApi, type SurplusView, type TeacherQuota } from '@/api/allocation'
import { exportExcel } from './shared'

const view = ref<SurplusView | null>(null)
const loading = ref(false)
const acting = ref(false)

const totals = computed(() => view.value?.totals || { plan: 0, admitted: 0, pending: 0, remaining: 0 })
const round = computed(() => view.value?.round || null)
const nextRound = computed(() => Math.min((round.value?.current || 1) + 1, round.value?.max || 3))
const roundActive = computed(() => round.value?.rounds.filter(item => item.status === 'CLOSED').length ?? 0)

const roundSteps = computed(() => {
  const labels: Record<number, string> = { 1: '第一轮录取', 2: '第二轮补录', 3: '第三轮补录' }
  const list = round.value?.rounds || []
  return Array.from({ length: round.value?.max || 3 }, (_, index) => {
    const no = index + 1
    const item = list.find((row) => row.round === no)
    return {
      round: no,
      label: labels[no] || `第 ${no} 轮`,
      desc: !item ? '未开始' : item.status === 'OPEN' ? '录取中' : '已结束'
    }
  })
})

function usage(row: { plan: number; admitted: number; pending: number }) {
  if (!row.plan) return 0
  return Math.min(Math.round(((row.admitted + row.pending) / row.plan) * 100), 100)
}

function teacherRemainingType(teacher: TeacherQuota) {
  if (teacher.remaining == null) return 'info'
  return teacher.remaining > 0 ? 'warning' : 'success'
}

async function load() {
  loading.value = true
  try {
    view.value = await allocationApi.surplus()
  } finally {
    loading.value = false
  }
}

async function openNextRound() {
  try {
    await ElMessageBox.confirm(
      `开启第 ${nextRound.value} 轮补录后，未录取学生可重新填报志愿并参加实训室面试。确定开启？`,
      '开启补录轮次',
      { type: 'warning' }
    )
  } catch { return }
  acting.value = true
  try {
    await allocationApi.openRound(nextRound.value)
    ElMessage.success(`第 ${nextRound.value} 轮补录已开启`)
    await load()
  } finally {
    acting.value = false
  }
}

async function closeCurrentRound() {
  const current = round.value?.open
  if (!current) return
  try {
    await ElMessageBox.confirm(
      `结束第 ${current} 轮录取后，本轮将不再接收志愿与录取结果。确定结束？`,
      '结束本轮录取',
      { type: 'warning' }
    )
  } catch { return }
  acting.value = true
  try {
    await allocationApi.closeRound(current)
    ElMessage.success(`第 ${current} 轮录取已结束`)
    await load()
  } finally {
    acting.value = false
  }
}

function exportList() {
  exportExcel(
    `各实训室剩余名额-${new Date().toISOString().slice(0, 10)}.csv`,
    ['实训室', '研究方向', '计划名额', '已录取', '待确认', '剩余名额'],
    (view.value?.labs || []).map((lab) => [
      lab.name, lab.researchDirection, lab.plan, lab.admitted, lab.pending, lab.remaining
    ])
  )
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.round-card { margin-bottom: 14px; }
.round-row { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
.round-info { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--lm-text-secondary); }
.round-info strong { color: var(--lm-text); font-size: 15px; }
.round-steps { flex: 1; min-width: 360px; }
.summary { margin-bottom: 14px; }
.stat-card {
  border: 0;
  background-color: var(--workspace-paper, rgba(255, 255, 255, 0.46));
  background-image: linear-gradient(152deg, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0.08) 62%);
  -webkit-backdrop-filter: blur(6px) saturate(175%);
  backdrop-filter: blur(6px) saturate(175%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    inset 0 -1px 0 rgba(255, 255, 255, 0.6),
    var(--lg-shadow);
  border-radius: var(--lm-radius);
  padding: 14px 16px;
  margin-bottom: 12px;
}
.stat-label { color: var(--lm-text-secondary); font-size: 12.5px; }
.stat-value { font-size: 24px; font-weight: 600; margin-top: 6px; }
.stat-value.warning { color: #d97706; }
.lab-name { font-weight: 600; }
.lab-sub { color: var(--lm-text-secondary); font-size: 12.5px; margin-top: 2px; }
.teacher-panel { padding: 6px 16px 12px; background: #fafafa; }
.teacher-title { font-size: 13px; color: var(--lm-text-secondary); margin-bottom: 8px; }
</style>
