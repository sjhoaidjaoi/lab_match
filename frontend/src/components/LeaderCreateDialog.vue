<template>
  <el-dialog
    :model-value="modelValue"
    title="新增负责人账号"
    width="560px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="初始密码为 123456，首次登录需修改密码；若该实训室已有负责人，将被自动替换。"
      class="tip"
    />
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="工号" prop="userNo">
        <el-input v-model="form.userNo" maxlength="32" placeholder="请输入教师工号" />
      </el-form-item>
      <el-form-item label="姓名" prop="realName">
        <el-input v-model="form.realName" maxlength="50" placeholder="请输入姓名" />
      </el-form-item>
      <el-form-item label="实训室" prop="labId">
        <el-select v-model="form.labId" filterable placeholder="请选择实训室" class="full-width">
          <el-option v-for="lab in labOptions" :key="lab.id" :label="lab.labName" :value="lab.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="职称">
        <el-input v-model="form.title" maxlength="50" placeholder="如：副教授" />
      </el-form-item>
      <el-form-item label="研究方向">
        <el-input v-model="form.researchDirection" maxlength="500" placeholder="选填" />
      </el-form-item>
      <el-form-item label="个人名额" prop="quota">
        <el-input-number v-model="form.quota" :min="0" :max="999" />
      </el-form-item>
      <el-form-item label="手机号">
        <el-input v-model="form.phone" maxlength="20" placeholder="选填" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" maxlength="100" placeholder="选填" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">创建并设为负责人</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { createMentor } from '@/api/adminMentor'
import { listLabs } from '@/api/adminLab'
import type { LabListItem } from '@/types/basic'

interface Props {
  modelValue: boolean
}

interface LeaderCreateForm {
  userNo: string
  realName: string
  labId: number | null
  title: string
  researchDirection: string
  quota: number
  phone: string
  email: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)
const labOptions = ref<LabListItem[]>([])
const form = reactive<LeaderCreateForm>({
  userNo: '',
  realName: '',
  labId: null,
  title: '',
  researchDirection: '',
  quota: 3,
  phone: '',
  email: ''
})

const rules: FormRules<LeaderCreateForm> = {
  userNo: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  labId: [{ required: true, message: '请选择实训室', trigger: 'change' }],
  quota: [{ required: true, message: '请输入个人名额', trigger: 'blur' }],
  email: [{ pattern: /^$|^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: '邮箱格式不正确', trigger: 'blur' }]
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetForm()
      loadLabs()
    }
  }
)

function resetForm() {
  form.userNo = ''
  form.realName = ''
  form.labId = null
  form.title = ''
  form.researchDirection = ''
  form.quota = 3
  form.phone = ''
  form.email = ''
  formRef.value?.clearValidate()
}

async function loadLabs() {
  try {
    const result = await listLabs({ status: 1, pageNum: 1, pageSize: 100 })
    labOptions.value = result.list
  } catch {
    labOptions.value = []
  }
}

async function handleSubmit() {
  if (!formRef.value) {
    return
  }
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid || form.labId === null) {
    return
  }
  saving.value = true
  try {
    await createMentor({
      userNo: form.userNo.trim(),
      realName: form.realName.trim(),
      labId: form.labId,
      title: form.title.trim(),
      researchDirection: form.researchDirection.trim(),
      researchProjects: '',
      phone: form.phone.trim(),
      email: form.email.trim(),
      quota: form.quota,
      status: 1,
      leader: true
    })
    ElMessage.success('负责人账号已创建')
    emit('update:modelValue', false)
    emit('saved')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.tip {
  margin-bottom: 16px;
}

.full-width {
  width: 100%;
}
</style>
