<template>
  <div class="page">
    <PageHeader title="教师工作台" :desc="`${auth.laboratoryName} · 招生名额 ${room.quota} 人`">
      <template #actions>
        <el-button @click="router.push('/teacher/applications')">查看报名</el-button>
        <el-button type="primary" @click="router.push('/teacher/interviews')">去面试</el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="nextAction"
      type="warning"
      :closable="false"
      show-icon
      :title="nextAction.text"
      style="margin-bottom: 16px"
    >
      <template #default>
        <el-button v-if="nextAction.to" link type="primary" @click="router.push(nextAction.to)">去处理 →</el-button>
      </template>
    </el-alert>

    <div class="stat-grid">
      <StatCard label="报名人数" :value="room.applicationsTotal" suffix="人" hint="填报本室的学生" />
      <StatCard label="招生名额" :value="room.quota" suffix="人" />
      <StatCard label="待面试" :value="room.applicationsTotal - room.evaluatedCount" suffix="人" hint="报名即面试，不做超额淘汰" />
      <StatCard label="已面试" :value="room.evaluatedCount" suffix="人" />
      <StatCard label="拟录取" :value="room.intendedCount" suffix="人" :tone="room.intendedCount > room.quota ? '#f56c6c' : ''" />
      <StatCard label="已确认" :value="room.confirmedCount" suffix="人" />
      <StatCard label="剩余名额" :value="room.vacancies" suffix="人" hint="确认后自动计算" />
      <StatCard label="当前阶段" :value="`第 ${stage.no} 阶段`" :hint="stage.name" />
      <StatCard
        label="提交审核"
        :value="submission.statusLabel"
        :hint="submission.submittedAt || '尚未提交'"
        :tone="submission.isLocked ? '#e6a23c' : ''"
      />
    </div>

    <div class="card">
      <h3 class="block-title">录取进度</h3>
      <QuotaBar :quota="room.quota" :admitted="room.confirmedCount" />
      <p class="muted">剩余名额将进入第六阶段「内部调剂」，确认状态由学生端写入，教师端只读。</p>
    </div>

    <div class="card">
      <h3 class="block-title">当前待办</h3>
      <el-table :data="todos" size="small">
        <el-table-column prop="title" label="事项" min-width="220" />
        <el-table-column prop="count" label="数量 / 状态" width="110" />
        <el-table-column prop="owner" label="负责" width="120" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(row.to)">处理</el-button>
          </template>
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
import QuotaBar from '@/components/QuotaBar.vue'
import { useAuthStore } from '@/stores/auth'
import { useStageStore } from '@/stores/stage'
import { useRoomStore } from '@/stores/room'
import { useSubmissionStore } from '@/stores/submission'
import { useClockStore } from '@/stores/clock'
import { isPast } from '@/utils/time'

const router = useRouter()
const auth = useAuthStore()
const stageStore = useStageStore()
const stage = computed(() => stageStore.current)
const room = useRoomStore()
const submission = useSubmissionStore()
const clock = useClockStore()

const confirmDeadline = computed(() => stageStore.stages.find((s) => s.no === 5)?.end || '')
const nextAction = computed(() => {
  if (submission.isLocked) {
    return {
      text: `本室名单已提交（${submission.statusLabel}），当前只读`,
      to: auth.isLeader ? '/teacher/room/submit' : ''
    }
  }
  if (room.pendingCount > 0 && confirmDeadline.value && isPast(confirmDeadline.value, clock.now)) {
    return {
      text: `录取确认已截止，还有 ${room.pendingCount} 人未确认：请先完成到期结算`,
      to: '/teacher/confirmations'
    }
  }
  if (stageStore.strict && stage.value.no >= 6 && !stageStore.completion[5]?.ok) {
    return {
      text: '上一阶段确认未完成，内部调剂/提交暂不可写',
      to: '/teacher/confirmations'
    }
  }
  return null
})

const todos = computed(() => [
  { title: '面试待评价', count: room.applicationsTotal - room.evaluatedCount, owner: '本室教师', to: '/teacher/interviews' },
  { title: '拟录取待学生确认', count: room.pendingCount, owner: '本室教师', to: '/teacher/confirmations' },
  { title: '内部调剂待处理', count: room.vacancies, owner: '实训室组长', to: '/teacher/room/adjustments' },
  { title: '提交审核状态', count: submission.statusLabel, owner: '实训室组长', to: '/teacher/room/submit' }
])
</script>

<style scoped>
.block-title { margin: 0 0 12px; font-size: 15px; }
</style>
