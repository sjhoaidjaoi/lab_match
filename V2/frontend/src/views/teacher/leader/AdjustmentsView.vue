<template>
  <div class="page">
    <PageHeader title="内部调剂" desc="第六阶段：优先填补本室空缺名额；不超名额、必须填写理由、学生需二次确认。">
      <template #actions>
        <el-button :disabled="readOnly" :title="lockReason" @click="onSave">保存草稿</el-button>
        <el-button :disabled="readOnly" :title="lockReason" type="primary" @click="onSubmit">提交调剂结果</el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="submission.isLocked"
      :title="`本室已提交审核（${submission.statusLabel}），调剂结果只读`"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />
    <el-alert
      v-else-if="expired"
      :title="`内部调剂截止时间 ${adjustDeadline} 已过，本页写操作关闭`"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />
    <el-alert
      v-else-if="stageClosed"
      :title="completionBlock
        ? `上一阶段未完成：还有 ${room.pendingCount} 人待确认`
        : `当前处于第 ${stage.current.no} 阶段（${stage.current.name}），本页写操作已按阶段关闭`"
      :description="completionBlock ? '请先到「录取确认」完成到期结算，之后本页才会开放。' : ''"
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
      v-if="noVacancy"
      type="success"
      :closable="false"
      show-icon
      :title="`本室名额已满（${room.confirmedCount}/${room.quota}），当前没有空缺，无需内部调剂`"
      description="如需演示调剂，请先在「录取确认」模拟一名已确认学生退出，产生空缺后再回来。"
      style="margin-bottom: 16px"
    />

    <div class="card">
      <el-steps :active="step" finish-status="success" align-center>
        <el-step title="空缺名额" />
        <el-step title="候选池" />
        <el-step title="调剂方案" />
        <el-step title="学生确认" />
        <el-step title="调剂结果" />
      </el-steps>
    </div>

    <!-- 1. 空缺 -->
    <div v-if="step === 0" class="card">
      <h3 class="block-title">本室空缺名额</h3>
      <QuotaBar :quota="room.quota" :admitted="room.confirmedCount" />
      <el-alert
        style="margin-top: 14px"
        type="info"
        :closable="false"
        show-icon
        title="空缺 = 招生名额 - 已确认人数。未填满的名额最终进入学院统筹调剂池。"
      />
      <div class="step-actions">
        <el-button type="primary" :disabled="noVacancy" @click="step = 1">下一步：查看候选池</el-button>
      </div>
    </div>

    <!-- 2. 候选池 -->
    <div v-if="step === 1" class="card">
      <div class="toolbar">
        <el-tag :type="expired ? 'danger' : 'info'" effect="plain">
          截止 {{ adjustDeadline }}（{{ expired ? '已截止' : `剩余 ${remaining}` }}）
        </el-tag>
        <el-tag type="warning" effect="plain">空缺 {{ vacancy }} 人</el-tag>
        <el-tag type="success" effect="plain">已选 {{ room.selectedCount }} 人</el-tag>
        <span class="muted">候选条件：面试过 + 未被正式录取 + 服从内部调剂</span>
      </div>
      <p v-if="readOnly" class="muted">当前只读：{{ lockReason }}</p>
      <p v-else-if="noVacancy" class="muted">当前空缺 0，无法选择调剂学生。</p>
      <el-alert
        v-if="!onlyOwn"
        type="warning"
        :closable="false"
        show-icon
        title="当前规则允许跨室候选（Q6 关闭）：列表包含其他实训室未占用且服从内部调剂的学生"
        style="margin-bottom: 12px"
      />
      <el-input v-model="candidateKeyword" placeholder="搜索姓名 / 学号" clearable style="width: 240px; margin-bottom: 12px" />
      <el-table
        ref="tableRef"
        :data="filteredCandidates"
        :class="{ 'locked-table': readOnly }"
        size="small"
        row-key="studentId"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="52" :selectable="canSelect" reserve-selection />
        <el-table-column prop="studentNumber" label="学号" width="140" />
        <el-table-column label="姓名" width="130">
          <template #default="{ row }">
            {{ row.realName }}
            <el-tag v-if="row.crossLab" size="small" type="warning" effect="plain">跨室</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="综合分" width="100">
          <template #default="{ row }">{{ row.total ?? '未评价' }}</template>
        </el-table-column>
        <el-table-column prop="evaluation" label="面试评价" min-width="240" />
        <el-table-column label="跨室调剂" width="110">
          <template #default="{ row }">{{ row.obeyCollege ? '服从' : '不服从' }}</template>
        </el-table-column>
      </el-table>
      <p class="muted">勾选上限由 store 兜底：超过空缺名额会自动回滚并提示。</p>
      <div class="step-actions">
        <el-button @click="step = 0">上一步</el-button>
        <el-button type="primary" :disabled="readOnly" @click="step = 2">下一步：填写调剂方案</el-button>
      </div>
    </div>

    <!-- 3. 方案 -->
    <div v-if="step === 2" class="card">
      <h3 class="block-title">调剂方案（已选 {{ room.selectedCount }} / 空缺 {{ vacancy }}）</h3>
      <el-empty v-if="!room.selectedCandidates.length" description="尚未选择学生" />
      <div v-for="(row, index) in room.selectedCandidates" :key="row.studentId" class="plan-row">
        <div class="plan-head">
          <strong>{{ row.realName }}</strong>
          <span class="muted">{{ row.studentNumber }} · 综合分 {{ row.total ?? '未评价' }}</span>
        </div>
        <el-input
          :model-value="row.reason"
          type="textarea"
          :rows="2"
          :disabled="readOnly"
          placeholder="必填：说明调剂理由（面试表现、方向匹配、学生意愿等）"
          @update:model-value="(v) => room.setReason(row.studentId, v)"
        />
        <el-button link type="danger" :disabled="readOnly" @click="removeSelected(index)">移除</el-button>
      </div>
      <p v-if="room.selectedCount > vacancy" class="warn">已超空缺名额，无法提交。</p>
      <div class="step-actions">
        <el-button @click="step = 1">上一步</el-button>
        <el-button type="primary" @click="toConfirmStep">下一步：等待学生确认</el-button>
      </div>
    </div>

    <!-- 4. 学生确认 -->
    <div v-if="step === 3" class="card">
      <h3 class="block-title">学生二次确认</h3>
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="该环节是否需要学生再次确认尚未由学院最终确定（需求文档第十一节问题 7），此处按「需要确认」建模，可配置。"
      />
      <el-table :data="room.selectedCandidates" size="small" style="margin-top: 14px">
        <el-table-column prop="realName" label="姓名" width="110" />
        <el-table-column prop="studentNumber" label="学号" width="140" />
        <el-table-column label="确认状态" width="130">
          <template #default><StatusTag :status="adjustmentTag.status" :label="adjustmentTag.label" :tone="adjustmentTag.tone" /></template>
        </el-table-column>
        <el-table-column prop="reason" label="调剂理由" min-width="240" />
      </el-table>
      <div class="step-actions">
        <el-button @click="step = 2">上一步</el-button>
        <el-button
          v-if="needConfirm && room.adjustmentStatus !== 'CONFIRMED'"
          type="primary"
          :disabled="readOnly"
          @click="onConfirm"
        >模拟：学生已确认</el-button>
        <el-tag v-else-if="room.adjustmentStatus === 'CONFIRMED'" type="success" effect="plain">已生效</el-tag>
      </div>
    </div>

    <!-- 5. 结果 -->
    <div v-if="step === 4" class="card">
      <el-result
        icon="success"
        title="调剂方案已生成"
        :sub-title="`补录 ${room.selectedCount} 人，剩余 ${room.adjustmentRemaining} 个名额进入学院统筹调剂池`"
      >
        <template #extra>
          <el-button type="primary" :disabled="readOnly" @click="onSubmit">提交学院审核</el-button>
        </template>
      </el-result>
      <el-table :data="room.selectedCandidates" size="small">
        <el-table-column prop="realName" label="姓名" width="110" />
        <el-table-column prop="studentNumber" label="学号" width="140" />
        <el-table-column label="调剂后状态" width="130">
          <template #default><StatusTag status="CONFIRMED" /></template>
        </el-table-column>
        <el-table-column prop="reason" label="理由" min-width="240" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import QuotaBar from '@/components/QuotaBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useRoomStore } from '@/stores/room'
import { useSubmissionStore } from '@/stores/submission'
import { useStageStore } from '@/stores/stage'
import { useConfigStore } from '@/stores/config'
import { useClockStore } from '@/stores/clock'
import { isPast, remainingText } from '@/utils/time'

const room = useRoomStore()
const submission = useSubmissionStore()
const stage = useStageStore()
const config = useConfigStore()
const clock = useClockStore()
const step = ref(room.adjustmentStatus === 'CONFIRMED' ? 4 : 0)
const tableRef = ref()
const vacancy = computed(() => Math.max(room.vacancies, 0))
const candidateKeyword = ref('')
const filteredCandidates = computed(() => {
  const kw = candidateKeyword.value.trim()
  if (!kw) return room.candidateRows
  return room.candidateRows.filter((c) => c.realName.includes(kw) || c.studentNumber.includes(kw))
})
const onlyOwn = computed(() => config.rules.internalAdjustmentOnlyOwnApplicants)
const adjustmentTag = computed(() => {
  if (room.adjustmentStatus === 'CONFIRMED') return { status: 'CONFIRMED', label: '已确认', tone: 'success' }
  if (room.adjustmentStatus === 'PENDING_CONFIRM') return { status: 'PENDING', label: '待确认', tone: 'warning' }
  return { status: 'PENDING', label: '草稿', tone: 'info' }
})
const needConfirm = computed(() => config.rules.requireStudentConfirmForAdjustment)

onMounted(() => room.syncCandidatePool())
watch(onlyOwn, () => room.syncCandidatePool())
const stageClosed = computed(() => !stage.canWrite(6))
const adjustDeadline = computed(() => stage.stages.find((s) => s.no === 6)?.end || '2026-11-05 17:00')
const expired = computed(() => isPast(adjustDeadline.value, clock.now))
const remaining = computed(() => remainingText(adjustDeadline.value, clock.now))
const noVacancy = computed(() => !readOnly.value && vacancy.value <= 0)
const completionBlock = computed(
  () => stage.strict && stage.current.no === 6 && !stage.completion[5]?.ok
)
const lockReason = computed(() => {
  if (submission.isLocked) return '本室已提交审核，名单只读'
  if (expired.value) return '内部调剂已截止'
  if (completionBlock.value) return `上一阶段未完成：还有 ${room.pendingCount} 人待确认`
  if (stageClosed.value) return '当前阶段不可写'
  return ''
})
const readOnly = computed(() => submission.isLocked || stageClosed.value || expired.value)
const canSelect = () => !readOnly.value && vacancy.value > 0

watch(step, async (value) => {
  if (value === 1) {
    await nextTick()
    restoreSelection()
  }
})

function restoreSelection() {
  if (!tableRef.value) return
  tableRef.value.clearSelection()
  room.candidateRows
    .filter((c) => c.selected)
    .forEach((c) => tableRef.value.toggleRowSelection(c, true))
}

async function onSelectionChange(rows) {
  if (readOnly.value) {
    await nextTick()
    restoreSelection()
    return
  }
  const visibleIds = new Set(filteredCandidates.value.map((c) => c.studentId))
  const hiddenSelected = room.selectedCandidates.filter((c) => !visibleIds.has(c.studentId)).length
  if (hiddenSelected + rows.length > vacancy.value) {
    ElMessage.warning(`最多选择 ${vacancy.value} 人（当前空缺名额）`)
    await nextTick()
    restoreSelection()
    return
  }
  const selectedVisible = new Set(rows.map((r) => r.studentId))
  room.candidates.forEach((c) => {
    // 只更新当前筛选可见的学生，隐藏的已选项保持不变
    if (visibleIds.has(c.studentId)) c.selected = selectedVisible.has(c.studentId)
  })
  room.persist()
}

function removeSelected(index) {
  const row = room.selectedCandidates[index]
  if (!row) return
  room.setCandidateSelected(row.studentId, false)
  tableRef.value?.toggleRowSelection(row, false)
}

function toConfirmStep() {
  if (readOnly.value) {
    ElMessage.warning(`当前只读：${lockReason.value}`)
    return
  }
  if (!room.selectedCount) {
    ElMessage.warning('请先选择调剂学生')
    return
  }
  if (!room.reasonsComplete) {
    ElMessage.warning('每位调剂学生都必须填写理由')
    return
  }
  if (!needConfirm.value) {
    if (room.beginAdjustmentConfirm() && room.confirmAdjustments()) {
      step.value = 4
      ElMessage.success('按当前规则，调剂方案提交即生效（Q7 关闭）')
    } else {
      ElMessage.error('调剂方案生效失败，请检查候选与理由')
    }
    return
  }
  if (!room.beginAdjustmentConfirm()) {
    ElMessage.error('提交调剂方案失败，请检查候选与理由')
    return
  }
  step.value = 3
}

function onConfirm() {
  if (readOnly.value) {
    ElMessage.warning(`当前只读：${lockReason.value}`)
    return
  }
  if (room.confirmAdjustments()) {
    step.value = 4
    ElMessage.success('学生确认完成，调剂结果已生效')
  }
}

function onSave() {
  if (readOnly.value) {
    ElMessage.warning(`当前只读：${lockReason.value}`)
    return
  }
  room.persist()
  ElMessage.success('调剂草稿已保存（本地持久化）')
}

async function onSubmit() {
  if (readOnly.value) {
    ElMessage.warning(`当前只读：${lockReason.value}`)
    return
  }
  if (!room.selectedCount) {
    ElMessage.warning('尚未选择调剂学生')
    return
  }
  if (room.selectedCount > vacancy.value) {
    ElMessage.error('调剂人数超过空缺名额')
    return
  }
  if (!room.reasonsComplete) {
    ElMessage.warning('每位调剂学生都必须填写理由')
    return
  }
  if (room.adjustmentStatus !== 'CONFIRMED') {
    ElMessage.warning('请先完成学生二次确认环节')
    return
  }
  await ElMessageBox.alert('内部调剂结果已保存，请在「提交学院审核」中统一提交。', '保存成功', {
    type: 'success'
  })
}
</script>

<style scoped>
.block-title { margin: 0 0 12px; font-size: 15px; }
.step-actions { margin-top: 18px; display: flex; justify-content: flex-end; gap: 8px; }
.plan-row { border: 1px solid var(--trs-border); border-radius: 8px; padding: 12px; margin-bottom: 12px; }
.plan-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
.warn { color: #f56c6c; font-size: 13px; }
.locked-table :deep(.el-table__header .el-checkbox) { pointer-events: none; opacity: 0.45; }
</style>
