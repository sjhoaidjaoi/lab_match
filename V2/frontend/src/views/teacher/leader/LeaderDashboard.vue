<template>
  <div class="page">
    <PageHeader title="本室综合" desc="组长视角：汇总全室教师面试进度、拟录取与剩余名额。">
      <template #actions>
        <el-button @click="router.push('/teacher/room/adjustments')">去内部调剂</el-button>
        <el-button type="primary" @click="router.push('/teacher/room/submit')">提交学院审核</el-button>
      </template>
    </PageHeader>

    <div class="stat-grid">
      <StatCard label="报名总人数" :value="room.applicationsTotal" suffix="人" />
      <StatCard label="已面试" :value="room.evaluatedCount" suffix="人" :hint="`待评价 ${room.applicationsTotal - room.evaluatedCount} 人`" />
      <StatCard label="拟录取" :value="room.intendedCount" suffix="人" />
      <StatCard label="已确认" :value="room.confirmedCount" suffix="人" />
      <StatCard label="剩余名额" :value="room.vacancies" suffix="人" tone="#e6a23c" />
      <StatCard label="调剂候选" :value="room.candidates.length" suffix="人" hint="服从内部调剂且未录取" />
      <StatCard label="内部调剂" :value="adjustmentLabel" :hint="`已选 ${room.selectedCount} 人`" />
      <StatCard label="提交审核" :value="submission.statusLabel" :tone="submission.isLocked ? '#e6a23c' : ''" />
    </div>

    <div class="card">
      <div class="toolbar">
        <span class="muted">学院审核状态：</span>
        <StatusTag :status="submission.status" />
        <span v-if="submission.submittedAt" class="muted">提交于 {{ submission.submittedAt }}</span>
        <span class="muted">内部调剂：{{ adjustmentLabel }}</span>
      </div>
      <h3 class="block-title">教师面试进度</h3>
      <el-table :data="rows" size="small">
        <el-table-column prop="name" label="教师" width="120">
          <template #default="{ row }">
            {{ row.name }}
            <el-tag v-if="row.isLeader" size="small" type="warning" effect="plain">组长</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="assigned" label="负责学生" width="110" />
        <el-table-column prop="evaluated" label="已评价" width="100" />
        <el-table-column label="进度" min-width="200">
          <template #default="{ row }">
            <el-progress :percentage="percent(row.evaluated, row.assigned)" :stroke-width="8" />
          </template>
        </el-table-column>
        <el-table-column label="平均分" width="100">
          <template #default="{ row }">{{ row.avg ?? '-' }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import { teachersOf } from '@/mock/teachers'
import { useRoomStore } from '@/stores/room'
import { useInterviewsStore } from '@/stores/interviews'
import { useAuthStore } from '@/stores/auth'
import { useSubmissionStore } from '@/stores/submission'
import StatusTag from '@/components/StatusTag.vue'

function percent(done, total) {
  if (!total) return 0
  return Math.min(100, Math.round((done / total) * 100))
}

const router = useRouter()
const room = useRoomStore()
const interviews = useInterviewsStore()
const auth = useAuthStore()
const roomTeachers = computed(() => teachersOf(auth.laboratoryId))
const submission = useSubmissionStore()
const rows = computed(() =>
  interviews.byTeacher.map((t) => ({
    ...t,
    isLeader: roomTeachers.value.find((x) => x.name === t.name)?.isLeader ?? false
  }))
)
const adjustmentLabel = computed(
  () => ({ DRAFT: '草稿', PENDING_CONFIRM: '待学生确认', CONFIRMED: '已确认' }[room.adjustmentStatus] || room.adjustmentStatus)
)
</script>

<style scoped>
.block-title { margin: 0 0 12px; font-size: 15px; }
</style>
