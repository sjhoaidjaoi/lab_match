<template>
  <el-container class="layout">
    <el-aside width="236px" class="aside">
      <div class="brand">
        <div class="brand-mark">LM</div>
        <div>
          <div class="brand-name">实训室进组选拔</div>
          <div class="brand-sub">Lab Match Platform</div>
        </div>
      </div>
      <el-scrollbar class="menu-scroll">
        <el-menu :default-active="route.path" router class="menu">
          <el-menu-item v-for="item in currentMenus" :key="item.path" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
      <div class="aside-footer">v0.1.0 · 框架版本</div>
    </el-aside>

    <el-container>
      <el-header class="header" height="66px">
        <StageBanner />
        <div class="header-right">
          <el-select
            v-if="auth.hasMultipleRoles"
            :model-value="auth.currentRole"
            size="small"
            class="role-select"
            @change="onRoleChange"
          >
            <el-option
              v-for="role in auth.roles"
              :key="role.roleCode"
              :label="role.roleName"
              :value="role.roleCode"
            />
          </el-select>
          <el-dropdown trigger="click" @command="onCommand">
            <span class="user">
              <el-icon><UserFilled /></el-icon>
              <span class="user-name">{{ auth.user?.name || '未登录' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>{{ auth.roleName }}</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import StageBanner from '@/components/StageBanner.vue'
import { menus } from '@/router/menus'
import { ROLE_HOME } from '@/config/stages'
import { useAuthStore } from '@/stores/auth'
import { useCycleStore } from '@/stores/cycle'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cycleStore = useCycleStore()

const currentMenus = computed(() => menus[auth.currentRole] ?? [])

function onCommand(command: string) {
  if (command === 'logout') {
    auth.logout()
    router.replace('/login')
    ElMessage.success('已退出登录')
  }
}

async function onRoleChange(value: string | number | boolean | undefined) {
  const roleCode = String(value ?? '')
  if (!roleCode || roleCode === auth.currentRole) return
  await auth.switchRole(roleCode)
  await cycleStore.load(true)
  router.replace(ROLE_HOME[roleCode] || '/')
}

onMounted(() => {
  auth.refresh().catch(() => undefined)
  cycleStore.load()
})
</script>

<style scoped>
.layout {
  height: 100%;
}

.aside {
  background: #fff;
  border-right: 1px solid var(--lm-border);
  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--lm-border);
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2f6fed, #6f9bff);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 1px;
}

.brand-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--lm-text);
}

.brand-sub {
  font-size: 11px;
  color: var(--lm-text-secondary);
}

.menu-scroll {
  flex: 1;
}

.menu {
  border-right: none;
  padding: 8px;
}

.menu :deep(.el-menu-item) {
  border-radius: 8px;
  margin-bottom: 4px;
  height: 42px;
}

.menu :deep(.el-menu-item.is-active) {
  background: #eef3ff;
  color: var(--lm-primary);
  font-weight: 600;
}

.aside-footer {
  padding: 12px 18px;
  font-size: 11px;
  color: #9aa3b2;
  border-top: 1px solid var(--lm-border);
}

.header {
  background: #fff;
  border-bottom: 1px solid var(--lm-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.role-select {
  width: 130px;
}

.user {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--lm-text);
}

.user-name {
  font-size: 14px;
}

.main {
  padding: 0;
  background: var(--lm-bg);
  overflow-y: auto;
}
</style>
