<template>
  <section class="profile-page">
    <header class="page-header"><h1>个人信息</h1></header>
    <el-card shadow="never" class="profile-card">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="姓名">{{ auth.user?.realName }}</el-descriptions-item>
        <el-descriptions-item label="账号">{{ auth.user?.username }}</el-descriptions-item>
        <el-descriptions-item label="学号/工号">{{ auth.user?.studentNumber || '—' }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ auth.roleName }}</el-descriptions-item>
        <el-descriptions-item label="所属实训室">{{ laboratoryName }}</el-descriptions-item>
        <el-descriptions-item label="登录密码">••••••</el-descriptions-item>
      </el-descriptions>

      <el-form :model="form" label-width="90px" class="profile-form">
        <el-form-item label="手机号">
          <el-input v-model="form.phone" maxlength="20" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" maxlength="128" placeholder="用于接收通知" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">保存修改</el-button>
          <el-button @click="passwordVisible = true">修改密码</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-dialog v-model="passwordVisible" title="修改密码" width="420px">
      <el-form :model="passwordForm" label-width="90px">
        <el-form-item label="原密码">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="passwordForm.confirm" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordVisible = false">取消</el-button>
        <el-button type="primary" :loading="changing" @click="changePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { http } from '@/api/request'
import { labApi } from '@/api/lab'

const auth = useAuthStore()
const saving = ref(false)
const changing = ref(false)
const passwordVisible = ref(false)
const laboratoryName = ref('—')

const form = reactive({ phone: '', email: '' })
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirm: '' })

function resetForm() {
  form.phone = auth.user?.phone || ''
  form.email = auth.user?.email || ''
}

const labId = computed(() => auth.user?.laboratoryId ?? null)

async function loadLab() {
  if (!labId.value) return
  try {
    const detail = await labApi.detail(labId.value)
    laboratoryName.value = detail?.name || '—'
  } catch {
    laboratoryName.value = '—'
  }
}

async function save() {
  saving.value = true
  try {
    await http.put('/auth/profile', { phone: form.phone || null, email: form.email || null })
    await auth.refresh()
    ElMessage.success('个人信息已更新')
  } finally {
    saving.value = false
  }
}

async function changePassword() {
  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    ElMessage.warning('请填写原密码与新密码')
    return
  }
  if (passwordForm.newPassword.length < 6) {
    ElMessage.warning('新密码至少 6 位')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirm) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  changing.value = true
  try {
    await auth.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    ElMessage.success('密码已修改，请牢记新密码')
    passwordVisible.value = false
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirm = ''
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '密码修改失败')
  } finally {
    changing.value = false
  }
}

onMounted(() => {
  resetForm()
  loadLab()
})
</script>

<style scoped>
.profile-page { display: flex; flex-direction: column; gap: 16px; max-width: 900px; }
.profile-card { border-radius: 10px; }
.card-title { font-weight: 600; font-size: 15px; }
.profile-form { margin-top: 20px; max-width: 460px; }
@media (max-width: 768px) {
  .profile-form { max-width: 100%; }
}
</style>
