<template>
  <div class="change-password-page">
    <el-card class="card" shadow="never">
      <h2 class="title">修改密码</h2>
      <p class="tip">首次登录必须修改初始密码，修改成功后才能进入业务页面。</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="form.oldPassword" type="password" show-password placeholder="请输入原密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="form.newPassword" type="password" show-password placeholder="8-20 位且包含字母与数字" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
        <el-button type="primary" class="submit" :loading="loading" @click="handleSubmit">
          确认修改
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/store/user'
import { changePassword } from '@/api/auth'
import type { ChangePasswordReq } from '@/types/auth'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive<ChangePasswordReq>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const rules: FormRules<ChangePasswordReq> = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/,
      message: '新密码需为 8-20 位且包含字母与数字',
      trigger: 'blur'
    }
  ],
  confirmPassword: [{ required: true, message: '请再次输入新密码', trigger: 'blur' }]
}

function homeFor(userType: number | undefined): string {
  if (userType === 2) {
    return '/teacher'
  }
  if (userType === 3) {
    return '/admin'
  }
  return '/student'
}

async function handleSubmit() {
  if (!formRef.value) {
    return
  }
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }
  loading.value = true
  try {
    await changePassword(form)
    userStore.setNeedChangePwd(0)
    ElMessage.success('密码修改成功')
    await router.push(homeFor(userStore.user?.userType))
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.change-password-page {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.card {
  width: 440px;
  padding: 8px 12px 20px;
  border-radius: 10px;
}

.title {
  margin: 8px 0 8px;
  font-size: 22px;
  text-align: center;
}

.tip {
  margin: 0 0 24px;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
  text-align: center;
}

.submit {
  width: 100%;
  margin-top: 4px;
}
</style>
