<template>
  <div class="page">
    <PageHeader title="录取确认" desc="确认结果由学生端写入；单意向自动确认，多意向未选视为放弃。">
      <template #actions>
        <el-button :disabled="!expired || alreadySettled || readOnly" type="primary" @click="onSettle">
          {{ settleLabel }}
        </el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="submission.isLocked"
      type="error"
      :closable="false"
      show-icon
      title="本室已提交学院审核，确认与结算为只读"
      style="margin-bottom: 12px"
    />
    <el-alert
      v-else
      type="warning"
      :closable="false"
      show-icon
      title="演示：学生端尚未接入，确认 / 超时放弃为本地模拟操作；到期结算按钮用于演示自动确认规则"
      style="margin-bottom: 12px"
    />

    <el-alert
      :type="expired ? 'error' : 'info'"
      :closable="false"
      show-icon
      :title="`确认截止：${confirmDeadline}（${expired ? '已截止' : `剩余 ${remaining}`}）`"
      :description="expired
        ? '已过截止时间：单意向应由系统自动确认，多意向未选择视为放弃。'
        : '截止前学生可确认；只有一个意向时，系统会自动确认，学生不能拒绝。'"
      style="margin-bottom: 16px"
    />

    <el-alert
      v-if="!stage.completion[4]?.ok"
      type="info"
      :closable="false"
      show-icon
      :title="`阶段 4 还有 ${stage.completion[4]?.total - stage.completion[4]?.done} 人未评价；严格模式下阶段 5 不应开始`"
      description="本页的到期结算仅用于演示“本室视角”；真实系统由学院端统一结算，跨室结果以学院端为准。"
      style="margin-bottom: 16px"
    />

    <div class="stat-grid">
      <StatCard label="已确认" :value="room.confirmedCount" suffix="人" />
      <StatCard label="待确认" :value="room.pendingCount" suffix="人" />
      <StatCard label="已放弃" :value="room.abandonedCount" suffix="人" tone="#f56c6c" />
      <StatCard label="空缺名额" :value="room.vacancies" suffix="人" hint="= 名额 - 已确认" />
    </div>

    <div v-if="room.settlement" class="card">
      <h3 class="block-title">结算快照（不可重复结算）</h3>
      <el-descriptions :column="4" border size="small">
        <el-descriptions-item label="截止时间">{{ room.settlement.deadline }}</el-descriptions-item>
        <el-descriptions-item label="结算时间">{{ room.settlement.doneAt.slice(0, 16).replace('T', ' ') }}</el-descriptions-item>
        <el-descriptions-item label="自动确认">{{ room.settlement.result.confirmed }} 人</el-descriptions-item>
        <el-descriptions-item label="未选放弃">{{ room.settlement.result.abandoned }} 人</el-descriptions-item>
      </el-descriptions>
      <p class="muted">快照保留结算前的名单与人数，出现问题可据此追溯。</p>
    </div>

    <div class="card">
      <h3 class="block-title">招生进度</h3>
      <QuotaBar :quota="room.quota" :admitted="room.confirmedCount" />
    </div>

    <div class="card">
      <div class="toolbar">
        <h3 class="block-title" style="margin: 0">学生确认明细</h3>
        <el-tag v-if="room.alternatesClosedAt" type="info" effect="plain">
          递补已于 {{ room.alternatesClosedAt }} 截止（未使用 {{ room.alternates.length }} 人）
        </el-tag>
        <el-tag v-else type="info" effect="plain">递补剩余 {{ room.alternates.length }} 人</el-tag>
      </div>
      <el-table :data="room.intended" size="small" row-key="studentId">
        <el-table-column prop="studentNumber" label="学号" width="130" />
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column prop="total" label="综合分" width="90" />
        <el-table-column label="确认状态" width="120">
          <template #default="{ row }"><StatusTag :status="row.confirmed" :label="row.confirmed === 'PENDING' ? '待确认' : ''" /></template>
        </el-table-column>
        <el-table-column label="说明" min-width="220">
          <template #default="{ row }">
            <span class="muted">{{ note(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="演示操作" width="240">
          <template #default="{ row }">
            <template v-if="row.confirmed === 'PENDING'">
              <el-button link type="success" :disabled="expired || readOnly" @click="onConfirm(row)">模拟确认</el-button>
              <el-button
                v-if="offerCount(row.studentId) > 1"
                link
                type="danger"
                :disabled="expired || readOnly"
                @click="onAbandon(row)"
              >放弃本室</el-button>
              <span v-else class="muted">单意向不可拒绝</span>
            </template>
            <el-button
              v-else-if="row.confirmed === 'CONFIRMED'"
              link
              type="danger"
              :disabled="readOnly"
              @click="onWithdraw(row)"
            >模拟退出（演示）</el-button>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
      </el-table>
      <p class="muted">
        放弃后按递补顺位自动补 1 人（补位学生仍需确认）；递补为空时空缺进入内部调剂。
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import QuotaBar from '@/components/QuotaBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useRoomStore } from '@/stores/room'
import { useStageStore } from '@/stores/stage'
import { useClockStore } from '@/stores/clock'
import { useSubmissionStore } from '@/stores/submission'
import { isPast, remainingText } from '@/utils/time'

const room = useRoomStore()
const stage = useStageStore()
const clock = useClockStore()
const submission = useSubmissionStore()

const stageClosed = computed(() => !stage.canWrite(5))
const confirmDeadline = computed(() => stage.stages.find((s) => s.no === 5)?.end || '2026-11-04 12:00')
const expired = computed(() => isPast(confirmDeadline.value, clock.now))
const remaining = computed(() => remainingText(confirmDeadline.value, clock.now))
const alreadySettled = computed(
  () => room.settlement?.deadline === confirmDeadline.value && room.pendingCount === 0
)
const readOnly = computed(() => submission.isLocked)
const settleLabel = computed(() => {
  if (room.settlement && room.pendingCount > 0) return '补结算（演示）'
  return alreadySettled.value ? '已结算' : '按规则结算（演示）'
})

function offerCount(studentId) {
  return room.intended.filter((x) => x.studentId === studentId).length
}

function note(row) {
  const deadline = row.confirmationDeadline ? `（确认截止 ${row.confirmationDeadline}）` : ''
  if (row.confirmed === 'CONFIRMED') {
    return row.source === 'ALTERNATE' ? `递补补位后已确认${deadline}` : '已确认加入本室'
  }
  if (row.confirmed === 'PENDING') {
    return row.source === 'ALTERNATE' ? `递补补位，待学生确认${deadline}` : '等待学生确认'
  }
  return '超时未确认，名额已释放'
}

function onConfirm(row) {
  if (expired.value || stageClosed.value) {
    ElMessage.warning('已过确认截止，不能再手动确认')
    return
  }
  if (room.confirmIntention(row.studentId)) ElMessage.success(`${row.realName} 已确认录取`)
}

async function onAbandon(row) {
  if (expired.value || stageClosed.value) {
    ElMessage.warning('已过确认截止，请使用「按规则结算」')
    return
  }
  try {
    await ElMessageBox.confirm(
      `模拟 ${row.realName} 超时未确认：释放名额，并按递补顺位补录 1 人。`,
      '模拟超时放弃',
      { type: 'warning' }
    )
  } catch {
    return
  }
  const result = room.abandonIntention(row.studentId, {
    canPromote: !expired.value,
    deadline: confirmDeadline.value
  })
  if (!result) return
  if (result.promoted) {
    ElMessage.success(`已释放名额，递补第 1 位 ${result.promoted.realName} 自动补入（待确认）`)
  } else {
    ElMessage.warning('已释放名额，但递补名单为空，空缺转入内部调剂')
  }
}

async function onWithdraw(row) {
  try {
    await ElMessageBox.confirm(
      `模拟已确认学生 ${row.realName} 退出：释放名额；${expired.value ? '已过确认期，名额转入内部调剂' : '默认补递补第 1 位（可在拟录取页撤销）'}。`,
      '模拟已确认学生退出',
      { type: 'warning' }
    )
  } catch {
    return
  }
  const result = room.withdrawConfirmed(row.studentId, {
    canPromote: !expired.value,
    deadline: confirmDeadline.value
  })
  if (!result) return
  if (result.promoted) ElMessage.success(`已释放名额，${result.promoted.realName} 默认补入（待确认）`)
  else ElMessage.warning('已释放名额，转入内部调剂')
}

function onSettle() {
  if (readOnly.value) {
    ElMessage.warning('本室已提交审核，不能结算')
    return
  }
  if (!expired.value) {
    ElMessage.warning('尚未到确认截止时间')
    return
  }
  room.expireStalePromotions(clock.now)
  const result = room.settleExpired(confirmDeadline.value)
  ElMessage.success(`结算完成：自动确认 ${result.confirmed} 人，放弃 ${result.abandoned} 人`)
}
</script>

<style scoped>
.block-title { margin: 0 0 12px; font-size: 15px; }
</style>
