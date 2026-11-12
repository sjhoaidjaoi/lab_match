<template>
  <div class="page">
    <PageHeader title="面试汇总" desc="组长查看本室全部教师的面试评价：可按学生汇总多位面试官，也可查看单条记录。">
      <template #actions>
        <el-button @click="onExport">导出 CSV</el-button>
      </template>
    </PageHeader>

    <div class="stat-grid" style="margin-bottom: 16px">
      <StatCard label="应面试学生" :value="interviews.studentCount" suffix="人" />
      <StatCard label="已评价学生" :value="interviews.evaluatedStudentCount" suffix="人" />
      <StatCard label="面试记录" :value="interviews.records.length" suffix="条" hint="含多教师复评" />
      <StatCard label="建议拟录取" :value="interviews.recommendationCounts.ADMIT" suffix="条" tone="#67c23a" />
    </div>

    <div class="card">
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索姓名 / 学号" clearable style="width: 220px" />
        <el-select v-model="interviewer" placeholder="按面试官" clearable style="width: 160px">
          <el-option v-for="name in interviewerOptions" :key="name" :label="name" :value="name" />
        </el-select>
        <el-select v-model="recommendation" placeholder="按录取建议" clearable style="width: 170px">
          <el-option label="建议拟录取" value="ADMIT" />
          <el-option label="建议递补" value="ALTERNATE" />
          <el-option label="不建议" value="REJECT" />
          <el-option label="未评价" value="NONE" />
        </el-select>
        <span class="muted">
          {{ viewMode === 'student' ? `学生 ${filteredGroups.length} 人` : `记录 ${filteredRecords.length} 条` }}
        </span>
      </div>

      <el-tabs v-model="viewMode">
        <el-tab-pane label="按学生汇总" name="student">
          <el-table :data="filteredGroups" size="small" row-key="studentId">
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="expand">
                  <el-table :data="row.records" size="small">
                    <el-table-column prop="interviewer" label="面试官" width="110" />
                    <el-table-column prop="time" label="面试时间" width="150" />
                    <el-table-column label="综合分" width="90">
                      <template #default="{ row: r }">{{ r.total ?? '-' }}</template>
                    </el-table-column>
                    <el-table-column label="录取建议" width="120">
                      <template #default="{ row: r }">
                        <el-tag size="small" :type="recType(r.recommendation)">{{ recLabel(r.recommendation) }}</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="状态" width="100">
                      <template #default="{ row: r }"><StatusTag :status="r.status" :label="r.status === 'PENDING' ? '待评价' : r.status === 'ABSENT' ? '缺勤' : ''" /></template>
                    </el-table-column>
                    <el-table-column prop="evaluation" label="评价" min-width="240" show-overflow-tooltip />
                  </el-table>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="studentNumber" label="学号" width="140" />
            <el-table-column prop="realName" label="姓名" width="110" />
            <el-table-column label="面试官" width="110">
              <template #default="{ row }">
                {{ row.interviewerCount }} 位
                <el-tag v-if="row.interviewerCount > 1" size="small" type="success" effect="plain">复评</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="平均分" width="100">
              <template #default="{ row }">{{ row.avgTotal ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="建议分布" min-width="200">
              <template #default="{ row }">
                <el-tag v-if="row.recommendations.ADMIT" size="small" type="success" effect="plain">
                  拟录取 {{ row.recommendations.ADMIT }}
                </el-tag>
                <el-tag v-if="row.recommendations.ALTERNATE" size="small" type="warning" effect="plain" style="margin-left: 6px">
                  递补 {{ row.recommendations.ALTERNATE }}
                </el-tag>
                <el-tag v-if="row.recommendations.REJECT" size="small" type="danger" effect="plain" style="margin-left: 6px">
                  不建议 {{ row.recommendations.REJECT }}
                </el-tag>
                <span v-if="!row.evaluatedCount" class="muted">未评价</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }"><StatusTag :status="row.status" :label="row.status === 'PENDING' ? '待评价' : row.status === 'ABSENT' ? '缺勤' : ''" /></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="按记录明细" name="record">
          <el-table :data="filteredRecords" size="small" row-key="id">
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="expand">
                  <el-descriptions :column="3" border size="small">
                    <el-descriptions-item v-for="item in dimensions" :key="item.key" :label="item.label">
                      {{ row.scores?.[item.key] ?? '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="文字评价" :span="3">{{ row.evaluation || '尚未评价' }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="studentNumber" label="学号" width="140" />
            <el-table-column prop="realName" label="姓名" width="110" />
            <el-table-column prop="interviewer" label="面试官" width="110" />
            <el-table-column prop="time" label="面试时间" width="150" />
            <el-table-column label="综合分" width="90">
              <template #default="{ row }">{{ row.total ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="录取建议" width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="recType(row.recommendation)">{{ recLabel(row.recommendation) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }"><StatusTag :status="row.status" :label="row.status === 'PENDING' ? '待评价' : row.status === 'ABSENT' ? '缺勤' : ''" /></template>
            </el-table-column>
            <el-table-column prop="evaluation" label="评价摘要" min-width="220" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useInterviewsStore } from '@/stores/interviews'
import { exportCsv } from '@/utils/exportCsv'
import { useLogsStore } from '@/stores/logs'

const interviews = useInterviewsStore()
const logs = useLogsStore()
const keyword = ref('')
const interviewer = ref('')
const recommendation = ref('')
const viewMode = ref('student')

const dimensions = [
  { key: 'attitude', label: '学习态度' },
  { key: 'logic', label: '逻辑思维' },
  { key: 'programming', label: '编程基础' },
  { key: 'timeCommitment', label: '时间投入' },
  { key: 'comprehensive', label: '综合表现' }
]

const interviewerOptions = computed(() => [...new Set(interviews.records.map((r) => r.interviewer))])

function matchKeyword(row) {
  const kw = keyword.value.trim()
  return !kw || row.realName.includes(kw) || row.studentNumber.includes(kw)
}

const filteredGroups = computed(() =>
  interviews.aggregated.filter((g) => {
    if (!matchKeyword(g)) return false
    if (interviewer.value && !g.records.some((r) => r.interviewer === interviewer.value)) return false
    if (recommendation.value === 'NONE') {
      if (g.records.some((r) => r.recommendation)) return false
    } else if (recommendation.value && !g.records.some((r) => r.recommendation === recommendation.value)) {
      return false
    }
    return true
  })
)

const filteredRecords = computed(() =>
  interviews.records.filter((r) => {
    if (!matchKeyword(r)) return false
    if (interviewer.value && r.interviewer !== interviewer.value) return false
    if (recommendation.value === 'NONE') return !r.recommendation
    if (recommendation.value && r.recommendation !== recommendation.value) return false
    return true
  })
)

function recLabel(rec) {
  return { ADMIT: '建议拟录取', ALTERNATE: '建议递补', REJECT: '不建议' }[rec] || '未评价'
}

function recType(rec) {
  return { ADMIT: 'success', ALTERNATE: 'warning', REJECT: 'danger' }[rec] || 'info'
}

function statusLabel(status) {
  return { PENDING: '待评价', EVALUATED: '已评价', ABSENT: '缺勤', PARTIAL: '部分评价' }[status] || status
}

function onExport() {
  if (viewMode.value === 'student') {
    if (!filteredGroups.value.length) {
      ElMessage.warning('当前筛选下没有可导出的学生')
      return
    }
    exportCsv(
      '本室面试汇总_按学生.csv',
      ['学号', '姓名', '面试官数', '平均分', '建议拟录取', '建议递补', '不建议', '状态'],
      filteredGroups.value.map((g) => [
        g.studentNumber,
        g.realName,
        g.interviewerCount,
        g.avgTotal ?? '',
        g.recommendations.ADMIT,
        g.recommendations.ALTERNATE,
        g.recommendations.REJECT,
        statusLabel(g.status)
      ])
    )
    logs.record('EXPORT', `导出面试汇总（按学生）${filteredGroups.value.length} 条`, 'LEADER')
    ElMessage.success(`已导出 ${filteredGroups.value.length} 名学生`)
    return
  }

  if (!filteredRecords.value.length) {
    ElMessage.warning('当前筛选下没有可导出的面试记录')
    return
  }
  exportCsv(
    '本室面试汇总_按记录.csv',
    ['学号', '姓名', '面试官', '面试时间', '学习态度', '逻辑思维', '编程基础', '时间投入', '综合表现', '综合分', '录取建议', '评价'],
    filteredRecords.value.map((r) => [
      r.studentNumber,
      r.realName,
      r.interviewer,
      r.time,
      r.scores?.attitude ?? '',
      r.scores?.logic ?? '',
      r.scores?.programming ?? '',
      r.scores?.timeCommitment ?? '',
      r.scores?.comprehensive ?? '',
      r.total ?? '',
      recLabel(r.recommendation),
      r.evaluation
    ])
  )
  logs.record('EXPORT', `导出面试汇总（按记录）${filteredRecords.value.length} 条`, 'LEADER')
  ElMessage.success(`已导出 ${filteredRecords.value.length} 条记录`)
}
</script>

<style scoped>
.expand { padding: 8px 24px 12px; }
</style>
