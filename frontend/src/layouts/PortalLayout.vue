<template>
  <div class="portal-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">实训室选拔平台</div>
      <nav class="menu">
        <router-link v-for="item in menus" :key="item.to" :to="item.to" class="menu-item">
          {{ item.label }}
        </router-link>
      </nav>
    </aside>
    <section class="content">
      <header class="topbar">
        <span class="title">{{ title }}</span>
        <div class="user-area">
          <span class="user-name">{{ userStore.displayName }}</span>
          <el-button link type="primary" @click="handleLogout">退出登录</el-button>
        </div>
      </header>
      <main class="main">
        <router-view />
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { logout } from '@/api/auth'

interface MenuItem {
  label: string
  to: string
}

defineProps<{
  title: string
  menus: MenuItem[]
}>()

const router = useRouter()
const userStore = useUserStore()

async function handleLogout() {
  await logout().catch(() => undefined)
  userStore.logout()
  ElMessage.success('已退出登录')
  await router.push('/')
}
</script>

<style scoped>
.portal-layout {
  min-height: 100%;
  display: flex;
  background: #f5f7fa;
}

.sidebar {
  width: 220px;
  background: #1f2d3d;
  color: #ffffff;
  display: flex;
  flex-direction: column;
}

.sidebar-brand {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.menu {
  padding: 12px 0;
  display: flex;
  flex-direction: column;
}

.menu-item {
  padding: 12px 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.78);
}

.menu-item.router-link-exact-active {
  color: #ffffff;
  background: rgba(64, 158, 255, 0.28);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.topbar {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
}

.title {
  font-size: 16px;
  font-weight: 600;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  font-size: 14px;
  color: #606266;
}

.main {
  flex: 1;
  padding: 24px;
}
</style>
