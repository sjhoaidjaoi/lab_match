<template>
  <el-dialog v-model="visible" :title="round ? '编辑轮次' : '新建轮次'" width="820px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <div class="section-title">基本信息</div>
      <div class="config-grid">
        <el-form-item label="轮次序号" prop="roundNo">
          <el-input-number v-model="form.roundNo" :min="1" :max="3" :disabled="Boolean(round)" />
        </el-form-item>
        <el-form-item label="轮次名称" prop="roundName">
          <el-input v-model="form.roundName" placeholder="如 第一轮双选" />
        </el-form-item>
      </div>

      <div class="section-title">时间窗</div>
      <div class="config-grid">
        <el-form-item label="填报开始" prop="applyStart">
          <el-date-picker v-model="form.applyStart" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="填报结束" prop="applyEnd">
          <el-date-picker v-model="form.applyEnd" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="面试开始" prop="interviewStart">
          <el-date-picker v-model="form.interviewStart" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="面试结束" prop="interviewEnd">
          <el-date-picker v-model="form.interviewEnd" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="名单提交开始" prop="nominationStart">
          <el-date-picker v-model="form.nominationStart" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="名单提交截止" prop="nominationSubmitEnd">
          <el-date-picker v-model="form.nominationSubmitEnd" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="学生确认开始" prop="confirmStart">
          <el-date-picker v-model="form.confirmStart" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="确认截止" prop="nominationEnd">
          <el-date-picker v-model="form.nominationEnd" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="内部调剂开始" prop="innerAdjustStart">
          <el-date-picker
            v-model="form.innerAdjustStart"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="可空，阶段6"
          />
        </el-form-item>
        <el-form-item label="内部调剂结束" prop="innerAdjustEnd">
          <el-date-picker
            v-model="form.innerAdjustEnd"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="可空，需同时填写"
          />
        </el-form-item>
        <el-form-item label="调剂开始" prop="adjustStart">
          <el-date-picker v-model="form.adjustStart" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="调剂结束" prop="adjustEnd">
          <el-date-picker v-model="form.adjustEnd" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
      </div>

      <div class="section-title">
        评分权重
        <el-tag :type="weightSum === 100 ? 'success' : 'danger'" size="small">
          合计 {{ weightSum }}%
        </el-tag>
      </div>
      <div class="config-grid">
        <el-form-item label="学习态度" prop="weightAttitude">
          <el-input-number v-model="form.weightAttitude" :min="0" :max="100" :precision="2" :step="5" />
        </el-form-item>
        <el-form-item label="逻辑思维" prop="weightLogic">
          <el-input-number v-model="form.weightLogic" :min="0" :max="100" :precision="2" :step="5" />
        </el-form-item>
        <el-form-item label="编程基础" prop="weightProgramming">
          <el-input-number v-model="form.weightProgramming" :min="0" :max="100" :precision="2" :step="5" />
        </el-form-item>
        <el-form-item label="时间投入" prop="weightTime">
          <el-input-number v-model="form.weightTime" :min="0" :max="100" :precision="2" :step="5" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { createRound, updateRound } from '@/api/adminRound'
import type { RoundListItem, RoundSaveReq } from '@/types/basic'

interface Props {
  modelValue: boolean
  round?: RoundListItem | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

function emptyForm(): RoundSaveReq {
  return {
    roundNo: 1,
    roundName: '',
    applyStart: '',
    applyEnd: '',
    interviewStart: '',
    interviewEnd: '',
    nominationStart: '',
    nominationSubmitEnd: '',
    confirmStart: '',
    nominationEnd: '',
    innerAdjustStart: null,
    innerAdjustEnd: null,
    adjustStart: '',
    adjustEnd: '',
    weightAttitude: 25,
    weightLogic: 25,
    weightProgramming: 25,
    weightTime: 25
  }
}

const form = reactive<RoundSaveReq>(emptyForm())

const requiredRule = { required: true, message: '该项不能为空', trigger: 'change' as const }

const rules: FormRules<RoundSaveReq> = {
  roundNo: [{ required: true, message: '请输入轮次序号', trigger: 'change' }],
  roundName: [{ required: true, message: '请输入轮次名称', trigger: 'blur' }],
  applyStart: [requiredRule],
  applyEnd: [requiredRule],
  interviewStart: [requiredRule],
  interviewEnd: [requiredRule],
  nominationStart: [requiredRule],
  nominationSubmitEnd: [requiredRule],
  confirmStart: [requiredRule],
  nominationEnd: [requiredRule],
  adjustStart: [requiredRule],
  adjustEnd: [requiredRule],
  weightAttitude: [requiredRule],
  weightLogic: [requiredRule],
  weightProgramming: [requiredRule],
  weightTime: [requiredRule]
}

const weightSum = computed(() =>
  Number(
    (
      form.weightAttitude +
      form.weightLogic +
      form.weightProgramming +
      form.weightTime
    ).toFixed(2)
  )
)

function fromRound(round: RoundListItem): RoundSaveReq {
  return {
    roundNo: round.roundNo,
    roundName: round.roundName,
    applyStart: round.applyStart,
    applyEnd: round.applyEnd,
    interviewStart: round.interviewStart,
    interviewEnd: round.interviewEnd,
    nominationStart: round.nominationStart,
    nominationSubmitEnd: round.nominationSubmitEnd,
    confirmStart: round.confirmStart,
    nominationEnd: round.nominationEnd,
    innerAdjustStart: round.innerAdjustStart ?? null,
    innerAdjustEnd: round.innerAdjustEnd ?? null,
    adjustStart: round.adjustStart,
    adjustEnd: round.adjustEnd,
    weightAttitude: round.weightAttitude,
    weightLogic: round.weightLogic,
    weightProgramming: round.weightProgramming,
    weightTime: round.weightTime
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      return
    }
    Object.assign(form, props.round ? fromRound(props.round) : emptyForm())
  }
)

async function handleSave() {
  if (!formRef.value) {
    return
  }
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }
  if (weightSum.value !== 100) {
    ElMessage.error('四维权重合计必须为 100')
    return
  }
  if (Boolean(form.innerAdjustStart) !== Boolean(form.innerAdjustEnd)) {
    ElMessage.error('内部调剂开始与结束时间需同时填写')
    return
  }
  saving.value = true
  try {
    const payload = {
      ...form,
      innerAdjustStart: form.innerAdjustStart || null,
      innerAdjustEnd: form.innerAdjustEnd || null
    }
    if (props.round) {
      const { roundNo: _roundNo, ...rest } = payload
      await updateRound(props.round.id, rest)
    } else {
      await createRound(payload)
    }
    ElMessage.success('保存成功')
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
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 12px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
  font-size: 14px;
  font-weight: 600;
  color: #1f2d3d;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
</style>
