<template>
  <div v-loading="loading" class="intention-page">
    <div class="page-header">
      <div>
        <h2>意向填报</h2>
        <p class="subtitle">首轮最多选择 3 个平行意向，不分先后顺序</p>
      </div>
      <div class="status-area">
        <el-tag :type="status === 2 ? 'success' : 'info'">{{ statusText }}</el-tag>
        <span v-if="submitTime" class="submit-time">提交于 {{ submitTime }}</span>
      </div>
    </div>

    <el-card v-if="round" shadow="never" class="round-card">
      <div class="round-info">
        <span class="round-name">第 {{ round.roundNo }} 轮 · {{ round.roundName }}</span>
        <el-tag type="primary">{{ round.statusText }}</el-tag>
        <span class="deadline">填报截止：{{ round.applyEnd }}</span>
      </div>
    </el-card>

    <el-alert
      v-if="missingFields.length > 0"
      type="warning"
      :closable="false"
      show-icon
      title="档案必填项未完成，补全后才能提交填报"
    >
      <template #default>
        <div class="alert-body">
          缺少：{{ missingFields.map((key) => missingFieldLabels[key]).join('、') }}
          <router-link to="/student/archive" class="alert-link">去完善档案</router-link>
        </div>
      </template>
    </el-alert>

    <el-alert
      v-if="editable === 0"
      type="info"
      :closable="false"
      show-icon
      title="填报已截止，当前表单只读"
    />

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="section-title">我的意向</span>
          <span class="selected-count">已选 {{ items.length }} / {{ maxCount }}</span>
        </div>
      </template>
      <div class="intention-grid">
        <div v-for="(item, index) in items" :key="item.mentorId" class="intention-card">
          <div class="mentor-name">{{ item.mentorName }}</div>
          <div class="mentor-lab">{{ item.labName }}</div>
          <div class="mentor-direction">{{ item.researchDirection || '研究方向待补充' }}</div>
          <div class="mentor-quota">剩余名额 {{ item.remainQuota }}</div>
          <el-button
            v-if="editable === 1"
            link
            type="danger"
            size="small"
            class="remove-btn"
            @click="removeItem(index)"
          >
            移除
          </el-button>
        </div>
        <div
          v-if="items.length < maxCount"
          class="intention-card add-card"
          :class="{ disabled: editable === 0 }"
          @click="openMentorDialog"
        >
          <span class="add-icon">+</span>
          <span>添加意向</span>
        </div>
      </div>
    </el-card>

    <el-card shadow="never">
      <template #header><span class="section-title">调剂意愿</span></template>
      <div class="switch-row">
        <div>
          <div class="switch-label">服从实训室内部调剂</div>
          <div class="switch-hint">未被本室导师录取时，接受在本实训室内调剂到其他导师</div>
        </div>
        <el-switch
          v-model="adjust.acceptInnerAdjust"
          :active-value="1"
          :inactive-value="0"
          :disabled="editable === 0"
        />
      </div>
      <div class="switch-row">
        <div>
          <div class="switch-label">服从全院跨实训室调剂</div>
          <div class="switch-hint">未被任何导师录取时，接受被调剂到其他实训室</div>
        </div>
        <el-switch
          v-model="adjust.acceptCrossAdjust"
          :active-value="1"
          :inactive-value="0"
          :disabled="editable === 0"
        />
      </div>
      <div class="switch-row">
        <div>
          <div class="switch-label">同意全院导师查看完整档案</div>
          <div class="switch-hint">仅在勾选跨室调剂后可用，用于调剂池展示完整档案</div>
        </div>
        <el-switch
          v-model="adjust.poolConsent"
          :active-value="1"
          :inactive-value="0"
          :disabled="editable === 0 || adjust.acceptCrossAdjust === 0"
        />
      </div>
    </el-card>

    <div class="footer-actions">
      <el-button :loading="saving" :disabled="editable === 0" @click="handleSaveDraft">
        {{ status === 2 ? '保存修改' : '保存草稿' }}
      </el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="!canSubmit"
        @click="handleSubmit"
      >
        {{ status === 2 ? '重新提交' : '提交填报' }}
      </el-button>
    </div>

    <MentorSelectDialog
      v-model="dialogVisible"
      :selected-ids="selectedMentorIds"
      :max-count="maxCount"
      @confirm="handleMentorConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MentorSelectDialog from '@/components/MentorSelectDialog.vue'
import { getMyIntention, saveMyIntention } from '@/api/intention'
import { getCurrentRound } from '@/api/public'
import { getMyArchive } from '@/api/studentArchive'
import type { CurrentRound, IntentionItem } from '@/types/student'

const missingFieldLabels: Record<string, string> = {
  programmingLanguages: '编程语言',
  projectExperience: '项目经历',
  weeklyHours: '每周可投入小时',
  availableSlots: '可投入时段',
  statement: '个人陈述'
}

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const round = ref<CurrentRound | null>(null)
const items = ref<IntentionItem[]>([])
const status = ref(1)
const statusText = ref('草稿')
const submitTime = ref<string | null>(null)
const editable = ref(1)
const missingFields = ref<string[]>([])
const dialogVisible = ref(false)
const maxCount = 3

const adjust = reactive({
  acceptInnerAdjust: 1,
  acceptCrossAdjust: 0,
  poolConsent: 0
})

const selectedMentorIds = computed(() => items.value.map((item) => item.mentorId))
const canSubmit = computed(
  () => items.value.length > 0 && missingFields.value.length === 0 && editable.value === 1
)

function formatLocalDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

watch(
  () => adjust.acceptCrossAdjust,
  (value) => {
    if (value === 0) {
      adjust.poolConsent = 0
    }
  }
)

async function loadData() {
  loading.value = true
  try {
    const [roundData, intentionData, archiveData] = await Promise.all([
      getCurrentRound(),
      getMyIntention(),
      getMyArchive()
    ])
    round.value = roundData
    missingFields.value = archiveData
      ? archiveData.missingFields
      : Object.keys(missingFieldLabels)
    if (intentionData) {
      items.value = intentionData.items
      status.value = intentionData.status
      statusText.value = intentionData.statusText
      submitTime.value = intentionData.submitTime
      editable.value = intentionData.editable
      adjust.acceptInnerAdjust = intentionData.acceptInnerAdjust
      adjust.acceptCrossAdjust = intentionData.acceptCrossAdjust
      adjust.poolConsent = intentionData.poolConsent
    }
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openMentorDialog() {
  if (editable.value === 0) {
    ElMessage.warning('填报已截止，无法修改')
    return
  }
  if (items.value.length >= maxCount) {
    ElMessage.warning(`最多选择 ${maxCount} 个意向`)
    return
  }
  dialogVisible.value = true
}

function handleMentorConfirm(selected: IntentionItem[]) {
  items.value = selected
  ElMessage.success(`已选择 ${selected.length} 个意向`)
}

function removeItem(index: number) {
  if (editable.value === 0) {
    return
  }
  items.value.splice(index, 1)
}

async function saveIntention(submit: number, needConfirm: boolean) {
  if (editable.value === 0) {
    ElMessage.warning('填报已截止，无法修改')
    return
  }
  if (submit === 1 && items.value.length === 0) {
    ElMessage.warning('至少选择 1 个意向')
    return
  }
  if (submit === 1 && missingFields.value.length > 0) {
    ElMessage.warning(
      `档案必填项未完成：${missingFields.value.map((key) => missingFieldLabels[key]).join('、')}`
    )
    return
  }
  if (submit === 1 && needConfirm) {
    try {
      await ElMessageBox.confirm('提交后仍可在截止前修改，确认提交？', '提交填报', {
        type: 'warning'
      })
    } catch {
      return
    }
  }
  saving.value = true
  try {
    const result = await saveMyIntention({
      roundId: round.value?.id ?? 0,
      items: items.value.map((item) => ({ mentorId: item.mentorId })),
      acceptInnerAdjust: adjust.acceptInnerAdjust,
      acceptCrossAdjust: adjust.acceptCrossAdjust,
      poolConsent: adjust.poolConsent,
      submit
    })
    status.value = result.status
    statusText.value = result.status === 2 ? '已提交' : '草稿'
    if (result.status === 2 && !submitTime.value) {
      submitTime.value = formatLocalDateTime(new Date())
    }
    ElMessage.success(submit === 1 ? '提交成功' : '草稿已保存')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}

async function handleSaveDraft() {
  await saveIntention(status.value === 2 ? 1 : 0, false)
}

async function handleSubmit() {
  if (missingFields.value.length > 0) {
    ElMessage.warning('请先完善档案必填项')
    await router.push('/student/archive')
    return
  }
  await saveIntention(1, true)
}

onMounted(loadData)
</script>

<style scoped>
.intention-page {
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

.status-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.submit-time {
  font-size: 12px;
  color: #909399;
}

.round-card {
  border-left: 4px solid #409eff;
}

.round-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.round-name {
  font-size: 16px;
  font-weight: 600;
}

.deadline {
  margin-left: auto;
  font-size: 13px;
  color: #606266;
}

.alert-body {
  margin-top: 4px;
  font-size: 13px;
}

.alert-link {
  margin-left: 8px;
  color: #409eff;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
}

.selected-count {
  font-size: 13px;
  color: #909399;
}

.intention-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.intention-card {
  position: relative;
  min-height: 150px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #ffffff;
}

.mentor-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2d3d;
}

.mentor-lab {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
}

.mentor-direction {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

.mentor-quota {
  margin-top: 10px;
  font-size: 13px;
  color: #409eff;
}

.remove-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
}

.add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-style: dashed;
  color: #606266;
  cursor: pointer;
}

.add-card:hover {
  border-color: #409eff;
  color: #409eff;
}

.add-card.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.add-icon {
  font-size: 28px;
  line-height: 1;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f2f3f5;
}

.switch-row:last-child {
  border-bottom: none;
}

.switch-label {
  font-size: 14px;
  color: #1f2d3d;
}

.switch-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-bottom: 24px;
}
</style>
