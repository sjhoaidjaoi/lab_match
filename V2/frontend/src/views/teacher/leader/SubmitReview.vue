<template>
  <div class="page">
    <PageHeader title="提交学院审核" desc="组长将本室拟录取、递补与内部调剂结果打包提交；提交后本室数据锁定。">
      <template #actions>
        <el-button :disabled="!canSubmitNow" :title="expired ? '提交已截止' : completionBlock ? '请先完成录取确认结算' : '请先完成提交前检查'" type="primary" @click="onSubmit">{{ buttonText }}</el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="expired"
      :title="`提交截止 ${submitDeadline} 已过，不能再提交（剩余 ${remaining}）`"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />
    <el-alert
      v-else-if="stageClosed"
      :title="completionBlock
        ? `上一阶段未完成：还有 ${room.pendingCount} 人待确认`
        : `当前处于第 ${stage.current.no} 阶段（${stage.current.name}），提交入口已按阶段关闭`"
      :description="completionBlock ? '请先到「录取确认」完成到期结算，再提交本室名单。' : ''"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    >
      <template v-if="completionBlock" #default>
        <router-link to="/teacher/confirmations">去录取确认结算 →</router-link>
      </template>
    </el-alert>

    <el-alert
      v-if="submission.status !== 'DRAFT'"
      :type="alertType"
      :title="alertTitle"
      :description="alertDesc"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />

    <div class="card">
      <div class="toolbar">
        <span>当前状态：</span>
        <StatusTag :status="submission.status" />
        <span v-if="submission.submittedAt" class="muted">提交时间：{{ submission.submittedAt }}</span>
        <span v-if="submission.reviewedAt" class="muted">审核时间：{{ submission.reviewedAt }}</span>
        <span class="muted">审核方：{{ submission.reviewer }}</span>
      </div>

      <AuditTimeline :items="submission.timeline" />
    </div>

    <div class="card">
      <h3 class="block-title">提交前检查</h3>
      <el-checkbox-group v-model="checked" :disabled="submission.isLocked">
        <el-checkbox value="allEvaluated">本室报名学生均已完成面试评价</el-checkbox>
        <el-checkbox value="quotaOk">拟录取人数未超过招生名额（{{ room.intendedCount }} / {{ room.quota }}）</el-checkbox>
        <el-checkbox value="alternateOrdered">递补名单已排定顺位（{{ room.alternates.length }} 人）</el-checkbox>
        <el-checkbox value="adjustmentReason">内部调剂均填写理由并经学生确认（{{ room.selectedCount }} 人）</el-checkbox>
      </el-checkbox-group>
      <p class="muted">前端校验仅为提示，后端在提交接口中必须再次校验；提交成功后本室拟录取、调剂、名单统一进入只读。</p>
    </div>

    <div v-if="submission.payload" class="card">
      <h3 class="block-title">本次提交数据快照</h3>
      <p class="muted">后端接入后可直接作为请求体，字段见 docs/API.md。</p>
      <el-collapse>
        <el-collapse-item title="展开 JSON" name="payload">
          <pre class="payload">{{ JSON.stringify(submission.payload, null, 2) }}</pre>
        </el-collapse-item>
      </el-collapse>
    </div>

    <div class="card">
      <h3 class="block-title">
        学院审核
        <el-tag size="small" type="warning" effect="plain" style="margin-left: 6px">演示</el-tag>
      </h3>
      <p class="muted">
        真实环境由学院总负责人审核；这里打开审核演示台，用同一份提交快照验证「通过 / 退回 / 重新提交」闭环。
      </p>
      <div class="toolbar" style="margin-top: 12px">
        <el-button type="primary" plain @click="router.push('/demo/review')">打开学院审核演示台</el-button>
        <el-button :disabled="room.vacancies <= 0" @click="onExportHandover">导出移交名额 CSV</el-button>
        <el-button @click="onReset">重置为草稿</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import AuditTimeline from '@/components/AuditTimeline.vue'
import { useSubmissionStore } from '@/stores/submission'
import { useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'
import { useStageStore } from '@/stores/stage'
import { exportCsv } from '@/utils/exportCsv'
import { useLogsStore } from '@/stores/logs'
import { useClockStore } from '@/stores/clock'
import { isPast, remainingText } from '@/utils/time'

const submission = useSubmissionStore()
const router = useRouter()

onMounted(() => submission.refresh())
const room = useRoomStore()
const auth = useAuthStore()
const stage = useStageStore()
const logs = useLogsStore()
const clock = useClockStore()
const checked = ref([])

const allChecked = computed(() => checked.value.length === 4)
const stageClosed = computed(() => !stage.canWrite(6))
const submitDeadline = computed(() => stage.stages.find((s) => s.no === 6)?.end || '2026-11-05 17:00')
const expired = computed(() => isPast(submitDeadline.value, clock.now))
const remaining = computed(() => remainingText(submitDeadline.value, clock.now))
const completionBlock = computed(
  () => stage.strict && stage.current.no === 6 && !stage.completion[5]?.ok
)
const canSubmitNow = computed(() => submission.canSubmit && allChecked.value && !stageClosed.value && !expired.value)

const buttonText = computed(() => {
  if (submission.status === 'REVIEWING') return '审核中'
  if (submission.status === 'APPROVED') return '已通过'
  return submission.status === 'REJECTED' ? '重新提交' : '提交审核'
})

const alertType = computed(() => {
  if (submission.status === 'APPROVED') return 'success'
  if (submission.status === 'REJECTED') return 'error'
  return 'warning'
})

const alertTitle = computed(() => {
  if (submission.status === 'REVIEWING') return '已提交，等待学院审核'
  if (submission.status === 'APPROVED') return '学院审核通过'
  return '已被学院退回，修改后可重新提交'
})

const alertDesc = computed(() => {
  if (submission.status === 'REVIEWING') return '审核期间本室名单锁定，如需修改请联系学院退回。'
  if (submission.status === 'APPROVED') return '本室结果已进入公示流程。'
  return submission.rejectReason ? `退回原因：${submission.rejectReason}` : ''
})

async function onSubmit() {
  if (!allChecked.value) {
    ElMessage.warning('请先完成全部提交前检查')
    return
  }
  if (!room.canSubmitAdmissions) {
    ElMessage.error('拟录取人数超过招生名额，请先修正')
    return
  }
  if (room.selectedCount > 0 && !room.reasonsComplete) {
    ElMessage.error('内部调剂存在未填写理由的学生')
    return
  }
  if (room.selectedCount > 0 && room.adjustmentStatus !== 'CONFIRMED') {
    ElMessage.error('内部调剂尚未完成学生确认，请先在「内部调剂」页完成确认')
    return
  }
  await ElMessageBox.confirm(
    `本室将提交：拟录取 ${room.intendedCount} 人、递补 ${room.alternates.length} 人、内部调剂 ${room.selectedCount} 人。提交后锁定，确认？`,
    submission.status === 'REJECTED' ? '重新提交' : '提交学院审核',
    { type: 'warning' }
  )
  if (submission.submit(room)) {
    ElMessage.success('已提交学院审核')
  }
}

function onExportHandover() {
  exportCsv(
    `移交学院名额_${auth.laboratoryName}.csv`,
    ['实训室', '招生名额', '已确认', '空缺名额', '说明'],
    [[auth.laboratoryName, room.quota, room.confirmedCount, Math.max(room.vacancies, 0), '本室无法填满，移交学院统筹']],
    ''
  )
  logs.record('EXPORT', `导出移交名额 ${Math.max(room.vacancies, 0)} 人`, 'HANDOVER')
  ElMessage.success('已导出移交名额 CSV')
}

async function onReset() {
  await ElMessageBox.confirm('将清空提交记录并恢复为草稿，仅用于演示。', '重置演示状态', { type: 'info' })
  submission.reset()
  room.resetAll()
  checked.value = []
  ElMessage.info('已重置为草稿')
}
</script>

<style scoped>
.block-title { margin: 0 0 12px; font-size: 15px; }
.payload { margin: 0; padding: 12px; background: #f7f8fa; border-radius: 6px; font-size: 12px; line-height: 1.6; max-height: 360px; overflow: auto; }
</style>
