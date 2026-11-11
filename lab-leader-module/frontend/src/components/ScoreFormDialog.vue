<template>
  <el-dialog v-model="visible" :title="`录分 · ${row?.studentName ?? ''}`" width="640px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <div class="student-bar">
        <span>{{ row?.studentNo }}</span>
        <span>{{ row?.studentName }}</span>
        <span>{{ row?.sessionName }}</span>
        <span class="tip">导师独立面试评分，仅用于本人拟录取</span>
      </div>

      <div class="score-grid">
        <el-form-item label="学习态度" prop="attitudeScore">
          <el-input-number v-model="form.attitudeScore" :min="0" :max="100" :step="1" />
        </el-form-item>
        <el-form-item label="逻辑思维" prop="logicScore">
          <el-input-number v-model="form.logicScore" :min="0" :max="100" :step="1" />
        </el-form-item>
        <el-form-item label="编程基础" prop="programmingScore">
          <el-input-number v-model="form.programmingScore" :min="0" :max="100" :step="1" />
        </el-form-item>
        <el-form-item label="时间投入" prop="timeScore">
          <el-input-number v-model="form.timeScore" :min="0" :max="100" :step="1" />
        </el-form-item>
      </div>

      <div class="total-bar">
        <span>系统总分</span>
        <strong>{{ systemTotal.toFixed(2) }}</strong>
        <span class="final">最终总分</span>
        <strong class="final-value">{{ finalTotal.toFixed(2) }}</strong>
      </div>

      <el-form-item label="面试评语">
        <el-input v-model="form.comment" type="textarea" :rows="3" maxlength="1000" show-word-limit placeholder="选填" />
      </el-form-item>

      <el-form-item label="手动覆写">
        <el-switch v-model="manualOverride" />
        <span class="switch-hint">开启后将覆盖系统计算值</span>
      </el-form-item>

      <template v-if="manualOverride">
        <el-form-item label="覆写总分" prop="manualTotal">
          <el-input-number v-model="form.manualTotal" :min="0" :max="100" :precision="2" :step="1" />
        </el-form-item>
        <el-form-item label="调整理由" prop="adjustReason">
          <el-input v-model="form.adjustReason" type="textarea" :rows="2" placeholder="必填，将写入操作日志" />
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <el-button :loading="saving" @click="handleSave(0)">保存草稿</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave(1)">提交评分</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { saveTeacherScore } from '@/api/teacherScore'
import type { InterviewScoreRow, InterviewScoreSaveReq } from '@/types/interview'

interface Props {
  modelValue: boolean
  roundId: number | null
  row?: InterviewScoreRow | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)
const manualOverride = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const form = reactive<InterviewScoreSaveReq>({
  roundId: 1,
  studentId: 0,
  attitudeScore: 0,
  logicScore: 0,
  programmingScore: 0,
  timeScore: 0,
  manualTotal: null,
  adjustReason: '',
  comment: '',
  submit: 0
})

const systemTotal = computed(
  () =>
    Math.round(
      ((form.attitudeScore + form.logicScore + form.programmingScore + form.timeScore) / 4) * 100
    ) / 100
)

const finalTotal = computed(() =>
  manualOverride.value && form.manualTotal !== null ? form.manualTotal : systemTotal.value
)

const rules: FormRules<InterviewScoreSaveReq> = {
  attitudeScore: [{ required: true, message: '请输入学习态度分数', trigger: 'change' }],
  logicScore: [{ required: true, message: '请输入逻辑思维分数', trigger: 'change' }],
  programmingScore: [{ required: true, message: '请输入编程基础分数', trigger: 'change' }],
  timeScore: [{ required: true, message: '请输入时间投入分数', trigger: 'change' }],
  adjustReason: [{ required: true, message: '手动调整总分时必须填写理由', trigger: 'blur' }]
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open || !props.row) {
      return
    }
    form.roundId = props.roundId ?? 0
    form.studentId = props.row.studentId
    form.attitudeScore = props.row.attitudeScore ?? 0
    form.logicScore = props.row.logicScore ?? 0
    form.programmingScore = props.row.programmingScore ?? 0
    form.timeScore = props.row.timeScore ?? 0
    form.manualTotal = props.row.manualTotal
    form.adjustReason = ''
    form.comment = ''
    manualOverride.value = props.row.manualTotal !== null
  }
)

watch(manualOverride, (value) => {
  if (!value) {
    form.manualTotal = null
    form.adjustReason = ''
  }
})

async function handleSave(submit: number) {
  if (!formRef.value) {
    return
  }
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }
  if (submit === 1 && manualOverride.value && form.manualTotal === null) {
    ElMessage.error('请输入覆写总分')
    return
  }
  saving.value = true
  try {
    await saveTeacherScore({
      ...form,
      manualTotal: manualOverride.value ? form.manualTotal : null,
      adjustReason: manualOverride.value ? form.adjustReason : '',
      submit
    })
    ElMessage.success(submit === 1 ? '评分已提交' : '草稿已保存')
    visible.value = false
    emit('saved')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.student-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
  color: #1f2d3d;
}

.tip {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.total-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 14px;
}

.final {
  margin-left: auto;
}

.final-value {
  color: #409eff;
}

.switch-hint {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}
</style>
