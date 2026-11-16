<template>
  <div>
    <div class="page-header">
      <div class="header-row">
        <div>
          <p class="page-desc">查看已发布的拟录取、递补与学生确认结果。</p>
        </div>
        <div class="actions">
          <el-button :loading="loading" :disabled="expiring || !labId" @click="load">刷新</el-button>
          <el-button type="warning" plain :loading="expiring" :disabled="loading || !hasPendingOffers" @click="expire">
            处理本室逾期邀请
          </el-button>
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
      <el-row :gutter="14" class="summary" v-loading="loading">
        <el-col v-for="card in summary" :key="card.label" :xs="12" :lg="6">
          <div class="stat-card">
            <div class="stat-label">{{ card.label }}</div>
            <div class="stat-value" :class="card.className">{{ card.value }}<span class="stat-unit">人</span></div>
          </div>
        </el-col>
      </el-row>

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
          <el-table-column prop="labTeacherName" label="导师" min-width="110" />
          <el-table-column prop="studentNumber" label="学号" width="130" />
          <el-table-column prop="studentName" label="姓名" width="100" />
          <el-table-column label="类型" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="row.admissionType === 'INTENDED' ? 'primary' : 'warning'" effect="light" size="small">
                {{ ADMISSION_TYPE_LABELS[row.admissionType] || row.admissionType }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="确认状态" width="130" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" effect="light" size="small">
                {{ ADMISSION_STATUS_LABELS[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="确认截止时间" min-width="170">
            <template #default="{ row }">{{ formatTime(row.confirmationDeadline) }}</template>
          </el-table-column>
          <el-table-column label="确认时间" min-width="170">
            <template #default="{ row }">
              {{ formatTime(row.confirmedAt) }}
              <el-tag v-if="row.autoConfirmed" type="info" effect="plain" size="small" class="tag-gap">自动确认</el-tag>
            </template>
          </el-table-column>
          <template #empty><span class="muted">暂无录取确认记录</span></template>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { labApi, type AdmissionRow } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'
import { ADMISSION_STATUS_LABELS, ADMISSION_TYPE_LABELS, formatTime, statusTag } from '../college/shared'

interface AdmissionView extends AdmissionRow {
  confirmedAt?: string | null
}

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const list = ref<AdmissionView[]>([])
const loading = ref(false)
const expiring = ref(false)
const statusFilter = ref('')
const hasPendingOffers = computed(() => list.value.some(row => row.admissionType === 'INTENDED' && ['PENDING', 'EXPIRED'].includes(row.status)))

const surnameOrder = new Intl.Collator('zh-Hans-CN-u-co-pinyin')
const filtered = computed(() => list.value.filter(row => !statusFilter.value || row.status === statusFilter.value)
  .sort((a, b) => surnameOrder.compare(a.labTeacherName ?? '', b.labTeacherName ?? '') || a.studentNumber.localeCompare(b.studentNumber)))

const summary = computed(() => {
  const count = (status: string) => list.value.filter((r) => r.status === status).length
  return [
    { label: '待确认', value: count('PENDING'), className: 'warning' },
    { label: '已确认', value: count('CONFIRMED'), className: 'success' },
    { label: '已放弃', value: count('REJECTED'), className: 'danger' },
    { label: '已逾期', value: count('EXPIRED'), className: 'danger' }
  ]
})

async function load() {
  const id = labId.value
  if (!id) return
  loading.value = true
  try {
    list.value = await labApi.admissions(id)
  } catch (e) {
    console.error(e)
    ElMessage.error('确认进度加载失败')
  } finally {
    loading.value = false
  }
}

async function expire() {
  if (expiring.value || !hasPendingOffers.value) return
  expiring.value = true
  try {
    const { expired } = await labApi.expireAdmissions()
    ElMessage.success(expired ? `已处理 ${expired} 条逾期邀请` : '暂无逾期邀请')
    await load()
  } catch { /* 请求层显示错误。 */ }
  finally { expiring.value = false }
}

onMounted(load)
</script>

<style scoped>
.header-row, .block-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.actions .el-button { margin: 0; }
.summary { margin-bottom: 14px; }
.stat-card { background: #fff; border: 1px solid var(--lm-border); border-radius: var(--lm-radius); padding: 14px 16px; margin-bottom: 12px; }
.stat-label { color: var(--lm-text-secondary); font-size: 12.5px; }
.stat-value { font-size: 24px; font-weight: 600; margin-top: 6px; color: #1f2937; }
.stat-value.warning { color: #d97706; }
.stat-value.success { color: #16a34a; }
.stat-value.danger { color: #dc2626; }
.stat-unit { font-size: 12px; font-weight: 400; color: var(--lm-text-secondary); margin-left: 3px; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
.tag-gap { margin-left: 6px; }
</style>
