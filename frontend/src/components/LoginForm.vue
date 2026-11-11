<template>
  <div class="login-page">
    <el-card class="login-card" shadow="never">
      <h2 class="title">{{ title }}</h2>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleSubmit"
      >
        <el-form-item :label="accountLabel" prop="userNo">
          <el-input
            v-model="form.userNo"
            :placeholder="accountPlaceholder || `请输入${accountLabel}`"
            clearable
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-button type="primary" class="submit" :loading="loading" @click="handleSubmit">
          登录
        </el-button>
        <el-button link type="primary" class="forgot" @click="handleForgot">忘记密码</el-button>
      </el-form>
      <p class="tip">账号由学校统一创建，如无账号请联系学院管理员</p>
      <router-link class="back" to="/">返回首页</router-link>
      <div class="role-links">
        <span>其他角色入口：</span>
        <router-link v-for="item in otherRoleLinks" :key="item.label" :to="item.to">
          {{ item.label }}
        </router-link>
      </div>
      <QuickLoginPanel class="quick-login-panel" :login-types="[props.loginType]" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/store/user'
import { login } from '@/api/auth'
import QuickLoginPanel from '@/components/QuickLoginPanel.vue'
import type { LoginReq } from '@/types/auth'

interface Props {
  loginType: 1 | 2 | 3
  title: string
  accountLabel: string
  accountPlaceholder?: string
  redirect: string
}

const props = withDefaults(defineProps<Props>(), {
  accountPlaceholder: ''
})

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive<LoginReq>({
  loginType: props.loginType,
  userNo: '',
  password: ''
})

const ROLE_LINKS = [
  { label: '学生入口', to: '/student/login', loginType: 1 },
  { label: '教师入口', to: '/teacher/login', loginType: 2 },
  { label: '管理员入口', to: '/admin/login', loginType: 3 }
]

const otherRoleLinks = computed(() => ROLE_LINKS.filter((item) => item.loginType !== props.loginType))

const rules: FormRules<LoginReq> = {
  userNo: [{ required: true, message: `请输入${props.accountLabel}`, trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
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
    const resp = await login({ ...form, loginType: props.loginType })
    userStore.setLogin(resp)
    if (resp.needChangePwd === 1) {
      ElMessage.success('首次登录，请先修改密码')
      await router.push('/change-password')
      return
    }
    ElMessage.success(`欢迎，${resp.user.realName}`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : props.redirect
    await router.push(redirect)
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function handleForgot() {
  ElMessage.info('请联系学院管理员重置密码')
}
</script>

<style scoped>
.login-page {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 420px;
  padding: 8px 12px 16px;
  border-radius: 10px;
}

.title {
  margin: 8px 0 24px;
  font-size: 22px;
  text-align: center;
}

.submit {
  width: 100%;
  margin-top: 4px;
}

.forgot {
  margin-top: 8px;
  padding-left: 0;
}

.tip {
  margin: 20px 0 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.back {
  font-size: 12px;
  color: #409eff;
}

.role-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
}

.role-links a {
  color: #409eff;
}

.quick-login-panel {
  margin-top: 16px;
}
</style>
