<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">补录统筹</h2>
          <p class="page-desc">汇总本实训室的调剂记录与未落实学生，并向学院上报剩余名额，供补录与统筹调剂使用。</p>
        </div>
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <el-alert
      v-if="!labId"
      type="warning"
      :closable="false"
      show-icon
      title="未绑定实训室"
      description="当前账号未绑定负责的实训室，请联系学院管理员配置后再使用本页面。"
    />

    <template v-else>
      <el-card shadow="never" class="block">
        <template #header>
          <div class="block-header">
            <span>向学院上报剩余名额</span>
            <span v-if="stats?.vacancyReport" class="muted">
              最近上报：{{ formatTime(stats.vacancyReport.reportedAt) }}
            </span>
          </div>
        </template>
        <el-form :inline="true" label-width="80px" @submit.prevent>
          <el-form-item label="剩余名额">
            <el-input-number v-model="reportRemaining" :min="0" :max="stats?.quota ?? 999" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="reportNote" placeholder="选填，如：已确认人数与空缺说明" style="width: 360px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="reporting" @click="submitReport">提交上报</el-button>
          </el-form-item>
        </el-form>
        <el-descriptions v-if="stats?.vacancyReport" :column="3" border class="report-detail">
          <el-descriptions-item label="上次上报剩余">{{ stats.vacancyReport.remaining }} 个</el-descriptions-item>
          <el-descriptions-item label="上报时间">{{ formatTime(stats.vacancyReport.reportedAt) }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ stats.vacancyReport.note || '—' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card shadow="never" class="block">
        <template #header><span>本室相关调剂记录</span></template>
        <el-table v-loading="loading" :data="records" stripe>
          <el-table-column prop="studentNumber" label="学号" width="120" />
          <el-table-column prop="studentName" label="姓名" width="90" />
          <el-table-column label="类型" width="140" align="center">
            <template #default="{ row }">{{ ADJUSTMENT_TYPE_LABELS[row.adjustmentType] || row.adjustmentType }}</template>
          </el-table-column>
          <el-table-column label="方向" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="direction(row) === '调出' ? 'warning' : 'primary'" effect="plain" size="small">
                {{ direction(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="targetLabName" label="目标实训室" min-width="180" />
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" effect="light" size="small">
                {{ ADJUSTMENT_STATUS_LABELS[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="调剂原因" min-width="200" show-overflow-tooltip />
          <el-table-column label="提交时间" width="170">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <template #empty><span class="muted">暂无本室调剂记录</span></template>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="block-header">
            <span>未落实学生</span>
            <span class="muted">共 {{ unplacedList.length }} 人</span>
          </div>
        </template>
        <el-table v-loading="loading" :data="unplacedList" stripe>
          <el-table-column prop="studentNumber" label="学号" width="120" />
          <el-table-column prop="studentName" label="姓名" width="90" />
          <el-table-column prop="phone" label="联系电话" width="130" />
          <el-table-column label="综合分" width="90" align="center">
            <template #default="{ row }">{{ row.comprehensiveScore ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="推荐结论" width="130" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.recommendation" type="info" effect="light" size="small">
                {{ RECOMMENDATION_LABELS[row.recommendation] || row.recommendation }}
              </el-tag>
              <span v-else class="muted">未评分</span>
            </template>
          </el-table-column>
          <el-table-column label="服从内部调剂" width="120" align="center">
            <template #default="{ row }">{{ row.obeyInternalAdjustment ? '是' : '否' }}</template>
          </el-table-column>
          <el-table-column label="服从全院调剂" width="120" align="center">
            <template #default="{ row }">{{ row.obeyCollegeAdjustment ? '是' : '否' }}</template>
          </el-table-column>
          <el-table-column prop="adjustmentStatus" label="调剂状态" min-width="110" align="center">
            <template #default="{ row }">
              <span v-if="row.adjustmentStatus">{{ ADJUSTMENT_STATUS_LABELS[row.adjustmentStatus] || row.adjustmentStatus }}</span>
              <span v-else class="muted">未发起</span>
            </template>
          </el-table-column>
          <template #empty><span class="muted">暂无未落实学生</span></template>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { labApi, type AdjustmentRow, type LabCandidate, type LabStats } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'
import {
  ADJUSTMENT_STATUS_LABELS,
  ADJUSTMENT_TYPE_LABELS,
  RECOMMENDATION_LABELS,
  formatTime,
  statusTag
} from '../college/shared'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const stats = ref<LabStats | null>(null)
const adjustments = ref<AdjustmentRow[]>([])
const candidates = ref<LabCandidate[]>([])
const loading = ref(false)
const reporting = ref(false)
const reportRemaining = ref(0)
const reportNote = ref('')

const records = computed(() => {
  const id = labId.value
  if (!id) return []
  return adjustments.value.filter(
    (a) => a.sourceLaboratoryId === id || a.targetLaboratoryId === id
  )
})

const unplacedList = computed(() => candidates.value.filter((c) => !c.placed))

function direction(row: AdjustmentRow) {
  const id = labId.value
  if (row.sourceLaboratoryId === id && row.targetLaboratoryId === id) return '本室内部'
  if (row.targetLaboratoryId === id) return '调入'
  return '调出'
}

async function submitReport() {
  const id = labId.value
  if (!id) return
  reporting.value = true
  try {
    await labApi.vacancyReport(id, { remaining: reportRemaining.value, note: reportNote.value.trim() })
    ElMessage.success('剩余名额上报成功')
    reportNote.value = ''
    await load()
  } catch (e) {
    console.error(e)
    ElMessage.error('剩余名额上报失败')
  } finally {
    reporting.value = false
  }
}

async function load() {
  const id = labId.value
  if (!id) return
  loading.value = true
  try {
    const [s, a, c] = await Promise.all([
      labApi.stats(id),
      labApi.adjustments(id),
      labApi.candidates(id)
    ])
    stats.value = s
    adjustments.value = a
    candidates.value = c
    reportRemaining.value = s?.vacancyReport?.remaining ?? s?.remaining ?? 0
  } catch (e) {
    console.error(e)
    ElMessage.error('补录统筹数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.block { margin-bottom: 14px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
.report-detail { margin-top: 4px; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
</style>
