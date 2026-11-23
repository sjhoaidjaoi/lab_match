<template>
  <main class="activation">
    <section class="activation-card" aria-labelledby="activation-title">
      <p class="activation-brand">LAB MATCH · 实训室进组选拔平台</p>
      <h1 id="activation-title">设置你的登录密码</h1>
      <p class="activation-intro">账号 {{ auth.user?.username }} 正在使用初始密码。设置新密码后即可进入工作台。</p>

      <el-form label-position="top" :model="form" @submit.prevent="submit">
        <el-form-item label="初始密码" for="activation-old">
          <el-input id="activation-old" v-model="form.oldPassword" type="password" show-password
            autocomplete="current-password" required :disabled="submitting" />
        </el-form-item>
        <el-form-item label="新密码" for="activation-new">
          <el-input id="activation-new" v-model="form.newPassword" type="password" show-password
            autocomplete="new-password" aria-describedby="activation-hint" required :disabled="submitting" />
          <span id="activation-hint" class="activation-hint">至少 6 位，须与初始密码不同。</span>
        </el-form-item>
        <el-form-item label="确认新密码" for="activation-confirm">
          <el-input id="activation-confirm" v-model="form.confirm" type="password" show-password
            autocomplete="new-password" required :disabled="submitting" />
        </el-form-item>
        <p v-if="error" class="activation-error" role="alert">{{ error }}</p>
        <el-button class="activation-submit" type="primary" native-type="submit" :loading="submitting">
          保存并进入工作台
        </el-button>
        <el-button class="activation-logout" text :disabled="submitting" @click="exit">退出登录</el-button>
      </el-form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ROLE_HOME } from '@/config/stages'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const form = reactive({ oldPassword: '', newPassword: '', confirm: '' })
const error = ref('')
const submitting = ref(false)

async function submit() {
  if (submitting.value) return
  error.value = ''
  if (!form.oldPassword || form.newPassword.length < 6) {
    error.value = '请输入初始密码和至少 6 位的新密码。'
    return
  }
  if (form.oldPassword === form.newPassword) {
    error.value = '新密码须与初始密码不同。'
    return
  }
  if (form.newPassword !== form.confirm) {
    error.value = '两次输入的新密码不一致。'
    return
  }
  submitting.value = true
  try {
    await auth.changePassword(form.oldPassword, form.newPassword)
    await router.replace(ROLE_HOME[auth.currentRole] || '/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '密码修改失败，请重试。'
  } finally {
    submitting.value = false
  }
}

function exit() {
  auth.logout()
  void router.replace('/login')
}
</script>

<style scoped>
.activation {
  --el-color-primary: #c9450b;
  min-height: 100dvh;
  display: grid;
  align-items: safe center;
  justify-items: center;
  padding: clamp(16px, 4vw, 48px);
  background: radial-gradient(ellipse at bottom right, #f5dfe5, transparent 60%), #f1efe9;
  color: #171719;
}
.activation-card {
  width: min(100%, 460px);
  padding: clamp(20px, 5vw, 36px);
  border: 0;
  background-color: var(--workspace-paper, rgba(255, 255, 255, 0.46));
  background-image: linear-gradient(152deg, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0.08) 62%);
  -webkit-backdrop-filter: blur(6px) saturate(175%);
  backdrop-filter: blur(6px) saturate(175%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    inset 0 -1px 0 rgba(255, 255, 255, 0.6),
    var(--lg-shadow);
  border-radius: 26px;
}
.activation-brand {
  margin: 0 0 12px;
  color: #8c3827;
  font-size: .8rem;
  font-weight: 650;
  letter-spacing: .08em;
}
.activation-card h1 { margin: 0; font-size: clamp(1.5rem, 5vw, 2rem); }
.activation-intro { margin: 8px 0 24px; color: #57504c; overflow-wrap: anywhere; }
.activation-hint { margin-top: 4px; color: #57504c; line-height: 1.5; }
/* 玻璃卡上的输入框必须自带边界，否则白底白框糊成一片 */
.activation :deep(.el-input__wrapper) {
  background: #fffefc;
  box-shadow: inset 0 0 0 1px #d8cdbe;
}
.activation :deep(.el-input__wrapper.is-focus),
.activation :deep(.el-input__wrapper:focus-within) {
  box-shadow: inset 0 0 0 2px #c9450b, 0 0 0 3px rgba(201, 69, 11, .12);
}
.activation-error { margin: 0 0 12px; color: #a72318; overflow-wrap: anywhere; }
.activation-submit { width: 100%; min-height: 44px; border-radius: 20px; }
.activation-logout { display: block; margin: 10px auto 0; }
</style>
