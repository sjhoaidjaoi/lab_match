<template>
  <div class="leader-nomination-page">
    <div class="page-header">
      <div>
        <h2>本室录取汇总</h2>
        <p class="subtitle">汇总本室导师拟录取、剩余名额与冲突检测，确认后提交至学院统筹池</p>
      </div>
      <el-button type="primary" :loading="submitting" :disabled="submitted" @click="handleSubmit">
        {{ submitted ? '已提交至学院' : '提交至学院' }}
      </el-button>
    </div>

    <el-row :gutter="16">
      <el-col :span="6">
        <el-card shadow="never"><div class="stat-label">本室总名额</div><div class="stat-value">{{ summary?.labQuota ?? 0 }}</div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never"><div class="stat-label">已占用名额</div><div class="stat-value">{{ summary?.quotaUsed ?? 0 }}</div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never"><div class="stat-label">剩余名额</div><div class="stat-value">{{ summary?.remainQuota ?? 0 }}</div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never"><div class="stat-label">冲突数</div><div class="stat-value warn">{{ summary?.conflictCount ?? 0 }}</div></el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header><span class="section-title">本室导师拟录取</span></template>
      <el-table
        v-loading="loading"
        :data="summary?.mentors ?? []"
        :row-class-name="mentorRowClass"
        stripe
      >
        <el-table-column prop="mentorName" label="导师" width="140" />
        <el-table-column prop="quota" label="个人名额" width="110" />
        <el-table-column prop="nominatedCount" label="已勾选" width="110" />
        <el-table-column label="剩余" width="100">
          <template #default="{ row }">{{ Math.max(row.quota - row.nominatedCount, 0) }}</template>
        </el-table-column>
        <el-table-column label="提交状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.submitStatus === 2 ? 'success' : 'warning'">
              {{ row.submitStatusText }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openAdjust(row)">调整名单</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="(summary?.conflicts?.length ?? 0) > 0" shadow="never" class="conflict-card">
      <template #header><span class="section-title">冲突检测</span></template>
      <el-alert
        v-for="conflict in summary?.conflicts"
        :key="conflict.studentId"
        type="warning"
        :closable="false"
        show-icon
        class="conflict-item"
      >
        <template #title>
          {{ conflict.studentName }} · {{ conflict.mentorNames.join('、') }} · {{ conflict.reason }}
        </template>
      </el-alert>
      <p class="conflict-tip">冲突仅提示，不阻断提交；需学生自主确认或负责人协调。</p>
    </el-card>

    <el-dialog v-model="adjustVisible" title="调整导师拟录取名单" width="640px">
      <div class="adjust-header">
        <span class="adjust-mentor">{{ detail?.mentorName || adjustingMentor?.mentorName }}</span>
        <span class="adjust-quota">名额 {{ detail?.quota ?? 0 }} 人 · 已选 {{ selectedIds.length }} 人</span>
      </div>
      <el-alert
        v-if="selectedIds.length > (detail?.quota ?? 0)"
        type="warning"
        :closable="false"
        show-icon
        title="已超出个人名额上限，无法保存"
        class="quota-alert"
      />
      <div class="candidate-list">
        <el-checkbox-group v-model="selectedIds">
          <div v-for="candidate in detail?.candidates ?? []" :key="candidate.studentId" class="candidate-row">
            <el-checkbox :value="candidate.studentId">
              {{ candidate.studentNo }} {{ candidate.studentName }}
              · 总分 {{ formatScore(candidate.totalScore) }}
              <el-tag v-if="candidate.nominated" size="small" type="success" class="current-tag">当前</el-tag>
            </el-checkbox>
          </div>
        </el-checkbox-group>
        <el-empty v-if="(detail?.candidates.length ?? 0) === 0" description="暂无可选学生" :image-size="60" />
      </div>
      <el-form label-width="80px" class="reason-form">
        <el-form-item label="调整理由" required>
          <el-input
            v-model="reason"
            type="textarea"
            :rows="2"
            maxlength="200"
            show-word-limit
            placeholder="必填，将写入操作日志"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" :loading="adjustSaving" @click="handleAdjust">保存名单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  adjustLeaderMentorNominations,
  getLeaderMentorNominations,
  getLeaderNominationSummary,
  submitLeaderNominations
} from '@/api/leaderNomination'
import { getCurrentRound } from '@/api/public'
import type {
  LeaderNominationDetail,
  LeaderNominationMentor,
  LeaderNominationSummary
} from '@/types/nomination'

const loading = ref(false)
const submitting = ref(false)
const roundId = ref<number | null>(null)
const summary = ref<LeaderNominationSummary | null>(null)

const adjustVisible = ref(false)
const adjustSaving = ref(false)
const adjustingMentor = ref<LeaderNominationMentor | null>(null)
const detail = ref<LeaderNominationDetail | null>(null)
const selectedIds = ref<number[]>([])
const reason = ref('')

const submitted = computed(() => {
  const mentors = summary.value?.mentors ?? []
  return mentors.some((item) => item.submitStatus === 2) &&
    !mentors.some((item) => item.submitStatus === 1)
})

const conflictMentorNames = computed(
  () => new Set((summary.value?.conflicts ?? []).flatMap((item) => item.mentorNames))
)

function mentorRowClass({ row }: { row: LeaderNominationMentor }): string {
  return conflictMentorNames.value.has(row.mentorName) ? 'conflict-row' : ''
}

async function loadSummary() {
  loading.value = true
  try {
    const round = await getCurrentRound()
    roundId.value = round?.id ?? null
    summary.value = await getLeaderNominationSummary(roundId.value ?? undefined)
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function formatScore(value: number | null): string {
  return value === null ? '-' : value.toFixed(2)
}

async function openAdjust(row: LeaderNominationMentor) {
  if (!roundId.value) {
    ElMessage.warning('当前无选拔轮次')
    return
  }
  adjustingMentor.value = row
  detail.value = null
  selectedIds.value = []
  reason.value = ''
  adjustVisible.value = true
  try {
    const data = await getLeaderMentorNominations(row.mentorId, roundId.value)
    detail.value = data
    selectedIds.value = [...data.selectedStudentIds]
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function handleAdjust() {
  if (!roundId.value || !adjustingMentor.value) {
    return
  }
  if (!reason.value.trim()) {
    ElMessage.warning('请填写调整理由')
    return
  }
  if (selectedIds.value.length > (detail.value?.quota ?? 0)) {
    ElMessage.warning('已超出个人名额上限')
    return
  }
  adjustSaving.value = true
  try {
    await adjustLeaderMentorNominations(adjustingMentor.value.mentorId, {
      roundId: roundId.value,
      studentIds: selectedIds.value,
      reason: reason.value.trim()
    })
    ElMessage.success('拟录取名单已调整')
    adjustVisible.value = false
    await loadSummary()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    adjustSaving.value = false
  }
}

async function handleSubmit() {
  if (!roundId.value) {
    ElMessage.warning('当前无选拔轮次')
    return
  }
  try {
    await ElMessageBox.confirm('提交后本室名单进入学院统筹池，确认提交？', '提交至学院', {
      type: 'warning'
    })
  } catch {
    return
  }
  submitting.value = true
  try {
    const result = await submitLeaderNominations(roundId.value)
    ElMessage.success(
      `已提交，${result.admissionCount} 条拟录取待学院批次签发，冲突 ${result.conflictCount} 条`
    )
    await loadSummary()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    submitting.value = false
  }
}

onMounted(loadSummary)
</script>

<style scoped>
.leader-nomination-page {
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

.stat-label {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 600;
  color: #1f2d3d;
}

.stat-value.warn {
  color: #e6a23c;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
}

.conflict-item {
  margin-bottom: 8px;
}

.conflict-tip {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

:deep(.el-table .conflict-row > td) {
  background: #fef0f0;
}

.adjust-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.adjust-mentor {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
}

.adjust-quota {
  font-size: 13px;
  color: #909399;
}

.quota-alert {
  margin-bottom: 10px;
}

.candidate-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 4px 8px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.candidate-row {
  padding: 4px 0;
}

.current-tag {
  margin-left: 6px;
}

.reason-form {
  margin-top: 16px;
}
</style>
