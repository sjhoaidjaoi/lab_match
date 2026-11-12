<template>
  <section v-if="DEMO_LOGIN_ENABLED && accounts.length > 0" class="quick-login">
    <div class="quick-head">{{ title }}</div>
    <p class="quick-tip">点击直接进入对应端，无需输入账号密码</p>
    <div class="quick-grid">
      <el-button
        v-for="item in accounts"
        :key="item.key"
        class="quick-btn"
        :loading="loadingKey === item.key"
        @click="handleLogin(item)"
      >
        <span class="quick-label">{{ item.label }}</span>
        <span class="quick-desc">{{ item.description }}</span>
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '@/api/auth'
import { useUserStore } from '@/store/user'
import { DEMO_ACCOUNTS, DEMO_LOGIN_ENABLED, type DemoAccount } from '@/config/demoAccounts'

const props = withDefaults(defineProps<{ loginTypes?: number[]; title?: string }>(), {
  loginTypes: () => [],
  title: '演示账号快捷登录'
})

const router = useRouter()
const userStore = useUserStore()
const loadingKey = ref('')

const accounts = computed(() =>
  props.loginTypes.length === 0
    ? DEMO_ACCOUNTS
    : DEMO_ACCOUNTS.filter((item) => props.loginTypes.includes(item.loginType))
)

async function handleLogin(account: DemoAccount) {
  loadingKey.value = account.key
  try {
    const resp = await login({
      loginType: account.loginType,
      userNo: account.userNo,
      password: account.password
    })
    userStore.setLogin(resp)
    if (resp.needChangePwd === 1) {
      ElMessage.warning('该演示账号需先修改密码')
      await router.push('/change-password')
      return
    }
    ElMessage.success(`已进入${account.label.replace('快捷登录', '')}`)
    await router.push(account.redirect)
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loadingKey.value = ''
  }
}
</script>

<style scoped>
.quick-login {
  padding: 18px 20px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  background: #f7f9fc;
}

.quick-head {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
}

.quick-tip {
  margin: 6px 0 14px;
  font-size: 12px;
  color: #909399;
}

.quick-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.quick-btn {
  height: auto;
  padding: 10px 16px;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.quick-label {
  font-size: 14px;
  font-weight: 600;
}

.quick-desc {
  font-size: 12px;
  color: #909399;
}
</style>
