<template>
  <section v-loading="loading" class="student-page">
    <header class="page-header">
      <h1>个人信息与志愿情况</h1>
    </header>
    <el-card shadow="never">
      <h2>账号资料</h2>
      <dl class="student-fields">
        <dt>登录账号</dt><dd>{{ auth.user?.username || '—' }}</dd>
        <dt>姓名</dt><dd>{{ auth.user?.realName || '—' }}</dd>
        <dt>学号</dt><dd>{{ auth.user?.studentNumber || '—' }}</dd>
        <dt>角色</dt><dd>学生</dd>
      </dl>
      <el-form :model="form" label-width="82px" class="profile-form">
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" maxlength="20" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" maxlength="128" placeholder="用于接收面试与调剂通知" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">保存修改</el-button>
          <el-button @click="passwordVisible = true">修改密码</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never">
      <h2>我的志愿</h2>
      <template v-if="preferences.length">
        <ul class="student-list">
          <li v-for="item in preferences" :key="item.id">{{ item.laboratoryName || '实训室#' + item.laboratoryId }}</li>
        </ul>
        <p>内部调剂 · {{ preferences[0].obeyInternalAdjustment ? '服从' : '不服从' }}</p>
        <p>跨实训室调剂 · {{ preferences[0].obeyCollegeAdjustment ? '服从' : '不服从' }}</p>
        <p>提交时间 · {{ formatDateTime(preferences[0].submittedAt) }}</p>
      </template>
      <el-empty v-else description="暂无志愿记录" />
      <div class="student-actions">
        <RouterLink to="/student/application/record">查看我的填报回执</RouterLink>
        <RouterLink to="/student/application">前往意向填报</RouterLink>
      </div>
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
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { PreferenceItem } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime, studentApi } from '@/api/student'
import { http } from '@/api/request'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const changing = ref(false)
const passwordVisible = ref(false)
const preferences = ref<PreferenceItem[]>([])
const form = reactive({ phone: '', email: '' })
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirm: '' })

function resetForm() {
  form.phone = auth.user?.phone || ''
  form.email = auth.user?.email || ''
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

async function load() {
  loading.value = true
  try {
    preferences.value = await studentApi.myPreferences()
  } catch (error) {
    console.error('志愿信息读取失败', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  resetForm()
  load()
})
</script>

<style scoped>
.profile-form { max-width: 420px; margin-top: 12px; }
@media (max-width: 768px) {
  .profile-form { max-width: 100%; }
}
</style>
