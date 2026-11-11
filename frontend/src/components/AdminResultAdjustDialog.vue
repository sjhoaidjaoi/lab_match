<template>
  <el-dialog v-model="visible" title="阶段内调整录取" width="540px" destroy-on-close>
    <el-descriptions v-if="record" :column="2" border size="small" class="summary">
      <el-descriptions-item label="学生">
        {{ record.studentName }}（{{ record.studentNo }}）
      </el-descriptions-item>
      <el-descriptions-item label="当前状态">{{ record.statusText }}</el-descriptions-item>
      <el-descriptions-item label="实训室">{{ record.labName }}</el-descriptions-item>
      <el-descriptions-item label="当前导师">{{ record.mentorName }}</el-descriptions-item>
    </el-descriptions>

    <el-form label-width="90px" class="form">
      <el-form-item label="调整动作" required>
        <el-radio-group v-model="action">
          <el-radio value="CONFIRM">确认</el-radio>
          <el-radio value="CANCEL">取消</el-radio>
          <el-radio value="REASSIGN">改派</el-radio>
          <el-radio value="ABANDON">置放弃</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="action === 'REASSIGN'" label="目标导师" required>
        <el-select
          v-model="targetMentorId"
          placeholder="请选择目标导师"
          class="full-width"
          :loading="loadingMentors"
        >
          <el-option
            v-for="mentor in mentors"
            :key="mentor.id"
            :label="`${mentor.realName} · ${mentor.labName}（剩余 ${mentor.remainQuota}）`"
            :value="mentor.id"
            :disabled="mentor.id === record?.mentorId || mentor.status !== 1 || mentor.remainQuota <= 0"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="调整原因" required>
        <el-input
          v-model="reason"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          placeholder="请填写调整原因，将写入操作日志"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确认提交</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adjustAdmission } from '@/api/adminArchive'
import { listMentors } from '@/api/adminMentor'
import type { AdmissionAdjustAction, ResultRow } from '@/types/archive'
import type { MentorListItem } from '@/types/basic'

const props = defineProps<{
  modelValue: boolean
  record: ResultRow | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  done: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const action = ref<AdmissionAdjustAction | ''>('')
const reason = ref('')
const targetMentorId = ref<number | null>(null)
const mentors = ref<MentorListItem[]>([])
const loadingMentors = ref(false)
const submitting = ref(false)

async function loadMentors() {
  loadingMentors.value = true
  try {
    const page = await listMentors({ pageNum: 1, pageSize: 100 })
    mentors.value = page.list
  } catch {
    mentors.value = []
  } finally {
    loadingMentors.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      return
    }
    action.value = ''
    reason.value = ''
    targetMentorId.value = null
    loadMentors()
  }
)

async function handleSubmit() {
  if (!props.record) {
    return
  }
  if (!action.value) {
    ElMessage.warning('请选择调整动作')
    return
  }
  if (!reason.value.trim()) {
    ElMessage.warning('请填写调整原因')
    return
  }
  if (action.value === 'REASSIGN' && !targetMentorId.value) {
    ElMessage.warning('改派必须选择目标导师')
    return
  }
  try {
    await ElMessageBox.confirm('调整立即生效并写入操作日志，确认提交？', '阶段内调整', {
      type: 'warning'
    })
  } catch {
    return
  }
  submitting.value = true
  try {
    await adjustAdmission(props.record.admissionId, {
      action: action.value,
      targetMentorId: action.value === 'REASSIGN' ? targetMentorId.value ?? undefined : undefined,
      reason: reason.value.trim()
    })
    ElMessage.success('录取记录已调整')
    emit('done')
    visible.value = false
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.summary {
  margin-bottom: 16px;
}

.form {
  margin-top: 4px;
}

.full-width {
  width: 100%;
}
</style>
