<template>
  <div class="nomination-page">
    <div class="page-header">
      <div>
        <h2>拟录取勾选</h2>
        <p class="subtitle">在个人名额上限内勾选拟录取学生，提交后需等待本室负责人统一汇总</p>
      </div>
      <el-tag v-if="overview?.submitted" type="success" size="large">已提交</el-tag>
    </div>

    <el-alert v-if="visible === 0" type="info" :closable="false" show-icon
      title="填报进行中，结束后可查看报名学生" />

    <el-alert v-loading="loading" type="info" :closable="false" show-icon>
      <template #title>
        我的名额 {{ overview?.quota ?? 0 }} 人 · 已勾选 {{ selectedIds.length }} 人 · 剩余
        {{ Math.max((overview?.quota ?? 0) - selectedIds.length, 0) }} 人
      </template>
    </el-alert>

    <el-card shadow="never">
      <div class="filters">
        <el-input v-model="keyword" placeholder="学号 / 姓名" clearable class="keyword" />
        <el-input-number v-model="minScore" :min="0" :max="100" :step="1" controls-position="right" class="score" />
        <span class="range-sep">至</span>
        <el-input-number v-model="maxScore" :min="0" :max="100" :step="1" controls-position="right" class="score" />
        <el-checkbox v-model="onlyNominated">仅看已勾选</el-checkbox>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="filteredCandidates"
        row-key="studentId"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="52" :selectable="isSelectable" />
        <el-table-column prop="studentNo" label="学号" width="130" />
        <el-table-column prop="studentName" label="姓名" width="110" />
        <el-table-column label="总分" width="100">
          <template #default="{ row }">{{ row.totalScore.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="rankNo" label="排名" width="90" />
        <el-table-column label="当前状态" min-width="120">
          <template #default="{ row }">
            <el-tag :type="row.nominated ? 'success' : 'info'">
              {{ row.nominated ? '已拟录取' : '待定' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <div class="footer-actions">
      <el-button :loading="saving" :disabled="overview?.submitted" @click="handleSave(0)">保存草稿</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="overview?.submitted"
        @click="handleSave(1)"
      >
        提交拟录取名单
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox, type TableInstance } from 'element-plus'
import { getTeacherDashboard } from '@/api/dashboard'
import { getCurrentRound } from '@/api/public'
import { listApplicants } from '@/api/teacherApplicant'
import { listMyNominations, saveNomination } from '@/api/teacherNomination'
import type { NominationCandidate, NominationOverview } from '@/types/nomination'

const loading = ref(false)
const saving = ref(false)
const visible = ref(1)
const overview = ref<NominationOverview | null>(null)
const selectedIds = ref<number[]>([])
const keyword = ref('')
const minScore = ref(0)
const maxScore = ref(100)
const onlyNominated = ref(false)
const tableRef = ref<TableInstance>()
let syncing = false

const filteredCandidates = computed<NominationCandidate[]>(() => {
  const text = keyword.value.trim()
  return (overview.value?.candidates ?? []).filter((item) => {
    const matchKeyword = !text || item.studentNo.includes(text) || item.studentName.includes(text)
    const matchScore = item.totalScore >= minScore.value && item.totalScore <= maxScore.value
    const matchNominated = !onlyNominated.value || item.nominated
    return matchKeyword && matchScore && matchNominated
  })
})

function isSelectable(): boolean {
  return !overview.value?.submitted
}

async function loadOverview() {
  loading.value = true
  try {
    const [roundData, dashboard, applicantPage, nominations] = await Promise.all([
      getCurrentRound(),
      getTeacherDashboard(),
      listApplicants({ pageNum: 1, pageSize: 100 }),
      listMyNominations()
    ])
    visible.value = applicantPage.visible
    const nominatedIds = new Set(
      nominations.filter((item) => item.status !== 3).map((item) => item.studentId)
    )
    const candidates: NominationCandidate[] = applicantPage.list
      .filter((item) => visible.value === 1)
      .map((item) => ({
        studentId: item.studentId,
        studentNo: item.studentNo,
        studentName: item.studentName,
        totalScore: item.totalScore ?? 0,
        rankNo: 0,
        nominated: nominatedIds.has(item.studentId)
      }))
      .sort((first, second) => second.totalScore - first.totalScore)
      .map((item, index) => ({ ...item, rankNo: index + 1 }))
    overview.value = {
      roundId: roundData?.id ?? 0,
      quota: dashboard.quota,
      quotaUsed: dashboard.quotaUsed,
      remainQuota: dashboard.remainQuota,
      submitted: nominations.some((item) => item.status === 2),
      candidates
    }
    selectedIds.value = candidates.filter((item) => item.nominated).map((item) => item.studentId)
    await nextTick()
    await syncSelection(selectedIds.value)
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

async function syncSelection(ids: number[]) {
  const table = tableRef.value
  if (!table) {
    return
  }
  syncing = true
  table.clearSelection()
  filteredCandidates.value
    .filter((item) => ids.includes(item.studentId))
    .forEach((item) => table.toggleRowSelection(item, true))
  await nextTick()
  syncing = false
}

function handleSelectionChange(selection: NominationCandidate[]) {
  if (syncing) {
    return
  }
  const limit = overview.value?.quota ?? 0
  if (selection.length > limit) {
    ElMessage.warning(`超出个人名额上限（${limit} 人）`)
    const allowedIds = selectedIds.value.slice(0, limit)
    selectedIds.value = allowedIds
    void syncSelection(allowedIds)
    return
  }
  selectedIds.value = selection.map((item) => item.studentId)
}

async function handleSave(submit: number) {
  if (submit === 1 && selectedIds.value.length === 0) {
    ElMessage.warning('请至少勾选 1 名学生')
    return
  }
  if (submit === 1) {
    try {
      await ElMessageBox.confirm('提交后名单将进入本室汇总，不可再修改，确认提交？', '提交拟录取', {
        type: 'warning'
      })
    } catch {
      return
    }
  }
  saving.value = true
  try {
    const result = await saveNomination({
      roundId: overview.value?.roundId ?? 0,
      studentIds: selectedIds.value,
      submit
    })
    ElMessage.success(
      submit === 1 ? `提交成功，剩余名额 ${result.remainQuota} 人` : `草稿已保存，剩余名额 ${result.remainQuota} 人`
    )
    await loadOverview()
  } catch {
    // 错误提示已由请求层统一处理
    await loadOverview()
  } finally {
    saving.value = false
  }
}

onMounted(loadOverview)
</script>

<style scoped>
.nomination-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.keyword {
  width: 200px;
}

.score {
  width: 120px;
}

.range-sep {
  color: #909399;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
