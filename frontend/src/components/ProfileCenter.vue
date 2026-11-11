<template>
  <div v-loading="loading" class="profile-center">
    <div class="page-header">
      <div>
        <h2>个人中心</h2>
        <p class="subtitle">查看账号信息并维护联系方式</p>
      </div>
    </div>

    <el-card shadow="never" class="section">
      <template #header><span class="section-title">账号信息</span></template>
      <el-descriptions :column="3" border>
        <el-descriptions-item :label="role === 'student' ? '学号' : '工号'">
          {{ profile?.userNo || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="姓名">{{ profile?.realName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ genderText }}</el-descriptions-item>
        <template v-if="role === 'student'">
          <el-descriptions-item label="学院">{{ profile?.college || '-' }}</el-descriptions-item>
          <el-descriptions-item label="专业">{{ profile?.major || '-' }}</el-descriptions-item>
          <el-descriptions-item label="年级">{{ profile?.grade || '-' }}</el-descriptions-item>
        </template>
        <template v-else>
          <el-descriptions-item label="职称">{{ profile?.title || '-' }}</el-descriptions-item>
        </template>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="section">
      <template #header><span class="section-title">联系方式</span></template>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" class="contact-form">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" maxlength="20" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" maxlength="100" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存修改</el-button>
          <el-button :disabled="saving" @click="fillForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  getStudentProfile,
  getTeacherProfile,
  updateStudentProfile,
  updateTeacherProfile
} from '@/api/profile'
import type { ProfileInfo, ProfileUpdateReq } from '@/types/profile'

const props = defineProps<{
  role: 'student' | 'teacher'
}>()

const loading = ref(false)
const saving = ref(false)
const profile = ref<ProfileInfo | null>(null)
const formRef = ref<FormInstance>()

const form = reactive<ProfileUpdateReq>({
  phone: '',
  email: ''
})

const rules: FormRules<ProfileUpdateReq> = {
  phone: [{ pattern: /^$|^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  email: [
    {
      pattern: /^$|^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
      message: '邮箱格式不正确',
      trigger: 'blur'
    }
  ]
}

const genderText = computed(() => {
  if (profile.value?.gender === 1) {
    return '男'
  }
  if (profile.value?.gender === 2) {
    return '女'
  }
  return '未知'
})

function fillForm() {
  form.phone = profile.value?.phone ?? ''
  form.email = profile.value?.email ?? ''
}

async function loadProfile() {
  loading.value = true
  try {
    profile.value =
      props.role === 'student' ? await getStudentProfile() : await getTeacherProfile()
    fillForm()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!formRef.value) {
    return
  }
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }
  saving.value = true
  try {
    const payload: ProfileUpdateReq = { phone: form.phone.trim(), email: form.email.trim() }
    if (props.role === 'student') {
      await updateStudentProfile(payload)
    } else {
      await updateTeacherProfile(payload)
    }
    if (profile.value) {
      profile.value.phone = payload.phone
      profile.value.email = payload.email
    }
    ElMessage.success('个人信息已更新')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)
</script>

<style scoped>
.profile-center {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
}

.contact-form {
  max-width: 480px;
}
</style>
