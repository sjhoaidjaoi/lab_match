<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">本实训室选拔汇总</h2>
          <p class="page-desc">汇总本实训室报名学生的面试五维评分、综合分与推荐结论，作为拟录取与递补依据。</p>
        </div>
        <div class="tools">
          <el-button :loading="loading" @click="load">刷新</el-button>
          <el-button type="primary" :disabled="!labId || !list.length" @click="exportList">导出 Excel</el-button>
        </div>
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
      <el-row :gutter="14" class="summary">
        <el-col v-for="card in summary" :key="card.label" :xs="12" :lg="6">
          <div class="stat-card">
            <div class="stat-label">{{ card.label }}</div>
            <div class="stat-value">{{ card.value }}<span class="stat-unit">{{ card.unit }}</span></div>
          </div>
        </el-col>
      </el-row>

      <el-card shadow="never">
        <template #header>
          <div class="block-header">
            <span>报名学生选拔情况</span>
            <span class="muted">共 {{ list.length }} 人</span>
          </div>
        </template>
        <el-table v-loading="loading" :data="list" stripe>
          <el-table-column prop="studentNumber" label="学号" width="120" />
          <el-table-column prop="studentName" label="姓名" width="90" />
          <el-table-column label="面试状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.interviewStatus" :type="statusTag(row.interviewStatus)" effect="plain" size="small">
                {{ INTERVIEW_STATUS_LABELS[row.interviewStatus] || row.interviewStatus }}
              </el-tag>
              <span v-else class="muted">未安排</span>
            </template>
          </el-table-column>
          <el-table-column label="态度" width="72" align="center">
            <template #default="{ row }">{{ row.attitudeScore ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="逻辑" width="72" align="center">
            <template #default="{ row }">{{ row.logicScore ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="编程" width="72" align="center">
            <template #default="{ row }">{{ row.programmingScore ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="时间投入" width="90" align="center">
            <template #default="{ row }">{{ row.timeCommitmentScore ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="综合分" width="90" align="center">
            <template #default="{ row }">
              <strong v-if="row.comprehensiveScore !== null">{{ row.comprehensiveScore }}</strong>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="推荐结论" width="120" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.recommendation" :type="recommendationTag(row.recommendation)" effect="light" size="small">
                {{ RECOMMENDATION_LABELS[row.recommendation] || row.recommendation }}
              </el-tag>
              <span v-else class="muted">未评分</span>
            </template>
          </el-table-column>
          <el-table-column label="拟录取/递补" min-width="150" align="center">
            <template #default="{ row }">
              <template v-if="row.admissionType">
                <el-tag :type="row.admissionType === 'INTENDED' ? 'primary' : 'warning'" effect="plain" size="small">
                  {{ ADMISSION_TYPE_LABELS[row.admissionType] || row.admissionType }}
                </el-tag>
                <el-tag v-if="row.admissionStatus" :type="statusTag(row.admissionStatus)" effect="light" size="small" class="tag-gap">
                  {{ ADMISSION_STATUS_LABELS[row.admissionStatus] || row.admissionStatus }}
                </el-tag>
              </template>
              <span v-else class="muted">未产生</span>
            </template>
          </el-table-column>
          <template #empty><span class="muted">暂无报名学生数据</span></template>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { labApi, type LabCandidate, type LabStats } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'
import {
  ADMISSION_STATUS_LABELS,
  ADMISSION_TYPE_LABELS,
  INTERVIEW_STATUS_LABELS,
  RECOMMENDATION_LABELS,
  exportExcel,
  statusTag,
  type TagType
} from '../college/shared'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const list = ref<LabCandidate[]>([])
const stats = ref<LabStats | null>(null)
const loading = ref(false)

const summary = computed(() => [
  { label: '计划名额', value: stats.value?.quota ?? 0, unit: '个' },
  { label: '建议拟录取', value: stats.value?.intended ?? 0, unit: '人' },
  { label: '建议递补', value: list.value.filter((r) => r.recommendation === 'ALTERNATE').length, unit: '人' },
  { label: '已确认', value: stats.value?.confirmed ?? 0, unit: '人' },
  { label: '剩余名额', value: stats.value?.remaining ?? 0, unit: '个' }
])

function recommendationTag(value: string): TagType {
  if (value === 'INTENDED') return 'success'
  if (value === 'ALTERNATE') return 'warning'
  if (value === 'REJECTED') return 'danger'
  return 'info'
}

async function load() {
  const id = labId.value
  if (!id) return
  loading.value = true
  try {
    const [c, s] = await Promise.all([labApi.candidates(id), labApi.stats(id)])
    list.value = c
    stats.value = s
  } catch (e) {
    console.error(e)
    ElMessage.error('选拔汇总加载失败')
  } finally {
    loading.value = false
  }
}

function exportList() {
  exportExcel(
    `本室选拔汇总-${new Date().toISOString().slice(0, 10)}.xlsx`,
    ['学号', '姓名', '面试状态', '态度', '逻辑', '编程', '时间投入', '综合分', '推荐结论', '拟录取/递补', '确认状态'],
    list.value.map((r) => [
      r.studentNumber,
      r.studentName,
      r.interviewStatus ? INTERVIEW_STATUS_LABELS[r.interviewStatus] || r.interviewStatus : '未安排',
      r.attitudeScore ?? '',
      r.logicScore ?? '',
      r.programmingScore ?? '',
      r.timeCommitmentScore ?? '',
      r.comprehensiveScore ?? '',
      r.recommendation ? RECOMMENDATION_LABELS[r.recommendation] || r.recommendation : '未评分',
      r.admissionType ? ADMISSION_TYPE_LABELS[r.admissionType] || r.admissionType : '未产生',
      r.admissionStatus ? ADMISSION_STATUS_LABELS[r.admissionStatus] || r.admissionStatus : ''
    ])
  )
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.tools { display: flex; gap: 10px; }
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
.stat-value { font-size: 24px; font-weight: 600; margin-top: 6px; color: #1f2937; }
.stat-unit { font-size: 12px; font-weight: 400; color: var(--lm-text-secondary); margin-left: 3px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
.tag-gap { margin-left: 6px; }
</style>
