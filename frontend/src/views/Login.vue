<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="brand">
        <div class="brand-mark">LM</div>
        <div>
          <div class="brand-name">学生实训室进组选拔平台</div>
          <div class="brand-sub">双向选择 · 分轮录取 · 统筹调剂</div>
        </div>
      </div>

      <h1 class="title">八阶段透明选拔</h1>
      <p class="subtitle">
        学生与导师双向选择，志愿、面试、录取与调剂全程留痕，名额与时间窗由系统统一约束。
      </p>

      <div class="stage-list">
        <div v-for="item in stages" :key="item.no" class="stage-item">
          <div class="stage-no">{{ item.no }}</div>
          <div>
            <div class="stage-name">{{ item.name }}</div>
            <div class="stage-time">{{ item.time }}</div>
          </div>
        </div>
      </div>

      <p class="footnote">© 2026 计算机学院 · 实训室进组选拔项目组</p>
    </div>

    <div class="login-form-wrap">
      <el-card class="login-card" shadow="never">
        <h2 class="form-title">统一登录</h2>
        <p class="form-sub">学生、导师、负责人与学院管理员使用同一入口</p>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @keyup.enter="submit">
          <el-form-item label="学号 / 工号" prop="loginName">
            <el-input v-model="form.loginName" size="large" placeholder="请输入学号或工号" clearable>
              <template #prefix><el-icon><User /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" size="large" type="password" show-password placeholder="请输入密码">
              <template #prefix><el-icon><Lock /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-button type="primary" size="large" class="login-btn" :loading="auth.loading" @click="submit">
            登录
          </el-button>
        </el-form>

        <div class="demo">
          <div class="demo-title">演示账号（密码均为 123456）</div>
          <div class="demo-list">
            <el-tag
              v-for="account in demoAccounts"
              :key="account.loginName"
              class="demo-tag"
              effect="plain"
              @click="fill(account.loginName)"
            >
              {{ account.label }} · {{ account.loginName }}
            </el-tag>
          </div>
        </div>

        <p class="tip">首次登录后请及时修改密码；如账号被禁用请联系学院管理员。</p>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { stages, ROLE_HOME } from '@/config/stages'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const formRef = ref<FormInstance>()

const form = reactive({
  loginName: '2022001',
  password: '123456'
})

const rules: FormRules = {
  loginName: [{ required: true, message: '请输入学号或工号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const demoAccounts = [
  { label: '学生', loginName: '2022001' },
  { label: '导师', loginName: 'T1001' },
  { label: '负责人', loginName: 'T1000' },
  { label: '学院管理员', loginName: 'admin' }
]

function fill(loginName: string) {
  form.loginName = loginName
  form.password = '123456'
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    const data = await auth.login({ loginName: form.loginName, password: form.password })
    ElMessage.success(`欢迎回来，${data.user.name}`)
    router.replace(ROLE_HOME[data.activeRole] || '/')
  } catch {
    // 错误提示由请求拦截器统一处理
  }
}

onMounted(() => {
  if (auth.isLoggedIn) {
    router.replace(ROLE_HOME[auth.currentRole] || '/')
  }
})
</script>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: minmax(420px, 1.1fr) minmax(380px, 0.9fr);
  min-height: 100vh;
  background: #fff;
}

.login-panel {
  background: linear-gradient(150deg, #1d4ed8 0%, #2f6fed 45%, #6f9bff 100%);
  color: #fff;
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
}

.brand-mark {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  letter-spacing: 1px;
}

.brand-name {
  font-size: 17px;
  font-weight: 600;
}

.brand-sub {
  font-size: 12px;
  opacity: 0.8;
}

.title {
  font-size: 34px;
  margin: 0 0 14px;
  letter-spacing: 1px;
}

.subtitle {
  margin: 0 0 30px;
  max-width: 520px;
  line-height: 1.9;
  opacity: 0.88;
  font-size: 14px;
}

.stage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 520px;
}

.stage-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  padding: 10px 14px;
}

.stage-no {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: #1d4ed8;
  font-weight: 700;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stage-name {
  font-size: 14px;
  font-weight: 600;
}

.stage-time {
  font-size: 12px;
  opacity: 0.78;
  margin-top: 2px;
}

.footnote {
  margin-top: auto;
  padding-top: 28px;
  font-size: 12px;
  opacity: 0.65;
}

.login-form-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--lm-bg);
}

.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: 16px;
  padding: 10px 8px;
}

.form-title {
  margin: 6px 0 6px;
  font-size: 24px;
}

.form-sub {
  margin: 0 0 24px;
  color: var(--lm-text-secondary);
  font-size: 13px;
}

.login-btn {
  width: 100%;
  margin-top: 6px;
}

.demo {
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px dashed var(--lm-border);
}

.demo-title {
  font-size: 12px;
  color: var(--lm-text-secondary);
  margin-bottom: 8px;
}

.demo-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.demo-tag {
  cursor: pointer;
}

.tip {
  margin: 18px 0 0;
  font-size: 12px;
  color: #9aa3b2;
  line-height: 1.6;
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-panel {
    display: none;
  }
}
</style>
