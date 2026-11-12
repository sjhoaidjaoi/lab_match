<template>
  <div class="page">
    <PageHeader title="操作日志" desc="本室关键操作留痕；本地演示版，后端接入后写入 operation_logs 表，不具审计效力。">
      <template #actions>
        <el-button @click="onExport">导出 CSV</el-button>
        <el-button :disabled="!logs.total" :title="logs.total ? '' : '暂无日志可清空'" @click="onClear">清空日志</el-button>
      </template>
    </PageHeader>

    <div class="card">
      <div class="toolbar">
        <el-tag v-if="logs.clearedAt && !scopedEntries.length" type="info" effect="plain">{{ isAdmin ? '日志' : '本室日志' }}已于 {{ logs.clearedAt }} 清空</el-tag>
        <el-tag v-else :type="logs.integrity.ok ? 'success' : logs.integrity.legacy ? 'info' : 'danger'" effect="plain">
          {{ logs.integrity.ok ? '完整性：通过' : logs.integrity.legacy ? '完整性：历史数据' : '完整性：异常' }}
        </el-tag>
        <el-input v-model="keyword" placeholder="搜索说明 / 操作人 / 对象" clearable style="width: 240px" />
        <el-select v-model="type" placeholder="按类型筛选" clearable style="width: 180px">
          <el-option v-for="t in logs.types" :key="t" :label="typeLabel(t)" :value="t" />
        </el-select>
        <el-switch v-if="isAdmin" v-model="onlyMineLab" active-text="仅本室" />
        <el-tag v-else type="info" effect="plain">仅本室</el-tag>
        <span class="muted">共 {{ filtered.length }} 条 / 上限 200 条</span>
      </div>

      <el-table v-if="filtered.length" :data="filtered" size="small" max-height="560">
        <el-table-column prop="time" label="时间" width="180" />
        <el-table-column prop="operator" label="操作人" width="140" />
        <el-table-column label="类型" width="150">
          <template #default="{ row }">
            <el-tag size="small" :type="typeTag(row.type)" effect="plain">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="操作说明" min-width="300" />
        <el-table-column prop="target" label="对象" width="150" />
      </el-table>
      <el-empty v-else :description="logs.total ? '该类型下暂无记录' : '暂无操作记录，去拟录取、确认或调剂页操作试试'" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { useLogsStore } from '@/stores/logs'
import { useAuthStore } from '@/stores/auth'
import { exportCsv } from '@/utils/exportCsv'

const logs = useLogsStore()
const auth = useAuthStore()
const type = ref('')
const keyword = ref('')
const isAdmin = computed(() => auth.role === 'COLLEGE_ADMIN')
const onlyMineLab = ref(!isAdmin.value)

const LABELS = {
  ADMISSION_ADD: '名单增补',
  ADMISSION_REMOVE: '名单移出',
  CONFIRM: '学生确认',
  ABANDON: '超时放弃',
  ADJUSTMENT_SUBMIT: '调剂提交',
  ADJUSTMENT_CONFIRM: '调剂确认',
  SUBMIT: '提交审核',
  REVIEW_APPROVE: '审核通过',
  REVIEW_REJECT: '审核退回',
  REVIEW: '面试复评',
  LAB_INFO: '本室信息',
  EXPORT: '导出',
  RESUME_VIEW: '查看简历',
  SCHEDULE: '面试排期',
  STAGE_CHANGE: '阶段切换',
  STAGE_CHANGE_REQUEST: '时间变更申请',
  RULE_CHANGE: '规则变更',
  WEIGHT_CHANGE: '权重调整',
  EXPORT_FAILED: '导出受限'
}

const TAGS = {
  ADMISSION_ADD: 'success',
  ADMISSION_REMOVE: 'warning',
  CONFIRM: 'success',
  ABANDON: 'danger',
  ADJUSTMENT_SUBMIT: 'warning',
  ADJUSTMENT_CONFIRM: 'success',
  SUBMIT: 'primary',
  REVIEW_APPROVE: 'success',
  REVIEW_REJECT: 'danger',
  REVIEW: 'info',
  LAB_INFO: 'info',
  EXPORT: 'warning',
  RESUME_VIEW: 'info',
  SCHEDULE: 'primary',
  STAGE_CHANGE: 'warning',
  STAGE_CHANGE_REQUEST: 'info',
  RULE_CHANGE: 'warning',
  WEIGHT_CHANGE: 'warning',
  EXPORT_FAILED: 'danger'
}

const scopedEntries = computed(() => {
  if (!isAdmin.value) {
    // 普通教师/组长严格按本室过滤，避免开关或历史无 labId 数据串室
    return logs.entries.filter((e) => Number(e.labId) === Number(auth.laboratoryId))
  }
  return onlyMineLab.value
    ? logs.entries.filter((e) => Number(e.labId) === Number(auth.laboratoryId))
    : logs.entries
})

const filtered = computed(() =>
  scopedEntries.value.filter((e) => {
    if (type.value && e.type !== type.value) return false
    const kw = keyword.value.trim()
    if (kw) {
      const text = `${e.message} ${e.operator} ${e.target}`
      if (!text.includes(kw)) return false
    }
    return true
  })
)

function typeLabel(t) {
  return LABELS[t] || t
}

function typeTag(t) {
  return TAGS[t] || 'info'
}

function onExport() {
  if (!filtered.value.length) {
    ElMessage.warning('当前筛选下没有可导出的日志')
    return
  }
  exportCsv(
    '本室操作日志.csv',
    ['时间', '操作人', '类型', '说明', '对象'],
    filtered.value.map((e) => [e.time, e.operator, typeLabel(e.type), e.message, e.target || ''])
  )
  logs.record('EXPORT', `导出操作日志 ${filtered.value.length} 条`, 'LOG')
  ElMessage.success(`已导出 ${filtered.value.length} 条日志`)
}

async function onClear() {
  const all = isAdmin.value && !onlyMineLab.value
  await ElMessageBox.confirm(
    `将清空${all ? '全部实训室' : '本室'}操作日志，仅影响本地演示数据。`,
    '清空日志',
    { type: 'warning' }
  )
  logs.clear(all ? null : auth.laboratoryId)
  ElMessage.success('操作日志已清空')
}
</script>
