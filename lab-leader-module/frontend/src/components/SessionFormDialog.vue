<template>
  <el-dialog v-model="visible" :title="session ? '编辑面试场次' : '新增面试场次'" width="620px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <div class="form-grid">
        <el-form-item label="场次名称" prop="sessionName">
          <el-input v-model="form.sessionName" placeholder="如 第一场" />
        </el-form-item>
        <el-form-item label="面试日期" prop="interviewDate">
          <el-date-picker v-model="form.interviewDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="开始时间" prop="startTime">
          <el-time-picker v-model="form.startTime" value-format="HH:mm" placeholder="开始" />
        </el-form-item>
        <el-form-item label="结束时间" prop="endTime">
          <el-time-picker v-model="form.endTime" value-format="HH:mm" placeholder="结束" />
        </el-form-item>
        <el-form-item label="面试地点" prop="location">
          <el-input v-model="form.location" placeholder="如 实验楼 A301" />
        </el-form-item>
        <el-form-item label="容量" prop="capacity">
          <el-input-number v-model="form.capacity" :min="1" :max="999" />
        </el-form-item>
      </div>
      <el-form-item label="面试官" prop="interviewerIds">
        <el-select v-model="form.interviewerIds" multiple placeholder="选择本室导师" class="full-width">
          <el-option
            v-for="mentor in mentors"
            :key="mentor.id"
            :label="`${mentor.realName}（${mentor.title || '导师'}）`"
            :value="mentor.userId"
          />
        </el-select>
      </el-form-item>
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
import { createInterviewSession, updateInterviewSession } from '@/api/leaderInterview'
import { listLeaderMentors } from '@/api/leaderMentor'
import type { InterviewSession, InterviewSessionSaveReq } from '@/types/interview'
import type { MentorListItem } from '@/types/basic'

interface Props {
  modelValue: boolean
  roundId: number | null
  session?: InterviewSession | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)
const mentors = ref<MentorListItem[]>([])

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

function emptyForm(): InterviewSessionSaveReq {
  return {
    roundId: props.roundId ?? 0,
    sessionName: '',
    interviewDate: '',
    startTime: '',
    endTime: '',
    location: '',
    capacity: 30,
    interviewerIds: []
  }
}

const form = reactive<InterviewSessionSaveReq>(emptyForm())

const rules: FormRules<InterviewSessionSaveReq> = {
  sessionName: [{ required: true, message: '请输入场次名称', trigger: 'blur' }],
  interviewDate: [{ required: true, message: '请选择面试日期', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  location: [{ required: true, message: '请输入面试地点', trigger: 'blur' }],
  capacity: [{ required: true, message: '请输入容量', trigger: 'change' }],
  interviewerIds: [{ required: true, message: '请选择面试官', trigger: 'change' }]
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      return
    }
    if (props.session) {
      Object.assign(form, {
        roundId: props.session.roundId,
        sessionName: props.session.sessionName,
        interviewDate: props.session.interviewDate,
        startTime: props.session.startTime,
        endTime: props.session.endTime,
        location: props.session.location,
        capacity: props.session.capacity,
        interviewerIds: [...props.session.interviewerIds]
      })
    } else {
      Object.assign(form, emptyForm())
    }
    try {
      mentors.value = await listLeaderMentors()
    } catch {
      // 错误提示已由请求层统一处理
    }
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
  if (form.startTime >= form.endTime) {
    ElMessage.error('结束时间必须晚于开始时间')
    return
  }
  saving.value = true
  try {
    if (props.session) {
      await updateInterviewSession(props.session.id, { ...form })
    } else {
      await createInterviewSession({ ...form })
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
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.full-width {
  width: 100%;
}
</style>
