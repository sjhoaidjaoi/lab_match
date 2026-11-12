<template>
  <el-dialog
    v-model="visible"
    :title="editing ? '编辑教师账号' : '新增教师账号'"
    width="520px"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="工号" prop="userNo">
        <el-input v-model="form.userNo" :disabled="editing" placeholder="请输入工号" />
      </el-form-item>
      <el-form-item label="姓名" prop="realName">
        <el-input v-model="form.realName" placeholder="请输入姓名" />
      </el-form-item>
      <el-form-item label="所属实训室" prop="labId">
        <el-select v-model="form.labId" placeholder="请选择实训室" class="full-width">
          <el-option v-for="lab in labs" :key="lab.id" :label="lab.labName" :value="lab.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="职称" prop="title">
        <el-input v-model="form.title" placeholder="如 教授 / 副教授" />
      </el-form-item>
      <el-form-item label="研究方向" prop="researchDirection">
        <el-input v-model="form.researchDirection" placeholder="请输入研究方向" />
      </el-form-item>
      <el-form-item label="在研项目" prop="researchProjects">
        <el-input
          v-model="form.researchProjects"
          type="textarea"
          :rows="2"
          maxlength="1000"
          placeholder="用于公共端导师详情展示，可选"
        />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" placeholder="请输入邮箱" />
      </el-form-item>
      <el-form-item label="个人名额" prop="quota">
        <el-input-number v-model="form.quota" :min="0" :max="999" />
      </el-form-item>
      <el-form-item label="账号状态">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">禁用</el-radio>
        </el-radio-group>
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
import { createMentor, updateMentor } from '@/api/adminMentor'
import type { LabListItem, MentorListItem, MentorSaveReq } from '@/types/basic'

interface MentorForm {
  userNo: string
  realName: string
  labId: number | null
  title: string
  researchDirection: string
  researchProjects: string
  phone: string
  email: string
  quota: number
  status: number
}

const props = defineProps<{
  modelValue: boolean
  mentor: MentorListItem | null
  labs: LabListItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const editing = computed(() => props.mentor !== null)
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<MentorForm>({
  userNo: '',
  realName: '',
  labId: null,
  title: '',
  researchDirection: '',
  researchProjects: '',
  phone: '',
  email: '',
  quota: 0,
  status: 1
})

const rules: FormRules<MentorForm> = {
  userNo: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  labId: [{ required: true, message: '请选择所属实训室', trigger: 'change' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  quota: [
    { required: true, message: '请输入个人名额', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: number, callback: (error?: Error) => void) => {
        const used = props.mentor?.quotaUsed ?? 0
        if (value < used) {
          callback(new Error(`个人名额不得小于已占用名额（${used} 人）`))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
}

function resetForm() {
  const mentor = props.mentor
  Object.assign(form, {
    userNo: mentor?.userNo ?? '',
    realName: mentor?.realName ?? '',
    labId: mentor?.labId ?? null,
    title: mentor?.title ?? '',
    researchDirection: mentor?.researchDirection ?? '',
    researchProjects: mentor?.researchProjects ?? '',
    phone: mentor?.phone ?? '',
    email: mentor?.email ?? '',
    quota: mentor?.quota ?? 0,
    status: mentor?.status ?? 1
  })
  formRef.value?.clearValidate()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
    }
  }
)

async function handleSave() {
  if (!formRef.value) {
    return
  }
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid || form.labId === null) {
    return
  }
  const payload: MentorSaveReq = {
    realName: form.realName.trim(),
    labId: form.labId,
    title: form.title.trim(),
    researchDirection: form.researchDirection.trim(),
    researchProjects: form.researchProjects.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    quota: form.quota,
    status: form.status
  }
  saving.value = true
  try {
    if (props.mentor) {
      await updateMentor(props.mentor.id, payload)
      ElMessage.success('教师账号已更新')
    } else {
      await createMentor({ ...payload, userNo: form.userNo.trim() })
      ElMessage.success('教师账号已创建')
    }
    emit('saved')
    visible.value = false
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.full-width {
  width: 100%;
}
</style>
