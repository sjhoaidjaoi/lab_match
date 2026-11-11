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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getLeaderNominationSummary,
  submitLeaderNominations
} from '@/api/leaderNomination'
import { getCurrentRound } from '@/api/public'
import type { LeaderNominationMentor, LeaderNominationSummary } from '@/types/nomination'

const loading = ref(false)
const submitting = ref(false)
const roundId = ref<number | null>(null)
const summary = ref<LeaderNominationSummary | null>(null)

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
</style>
