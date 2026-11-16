<template>
  <div class="student-shell workspace-theme" data-role="STUDENT">
    <header class="student-top" :class="{ 'student-top-compact': compactHeader }">
      <RouterLink class="student-brand" to="/student/dashboard">
        <img class="workspace-logo" :src="schoolLogo" alt="河北师范大学软件学院" />
      </RouterLink>
      <nav class="student-nav" aria-label="学生端导航">
        <RouterLink v-for="item in navigationItems" :key="item.path" :to="item.path"
          :class="{ 'student-nav-active': route.path === item.path || route.path.startsWith(item.path + '/') }">
          <el-icon><component :is="item.icon" /></el-icon>{{ item.title }}
        </RouterLink>
      </nav>
      <div class="student-account">
        <span class="student-user">{{ auth.user?.username }}</span>
        <RouterLink v-if="!studentMvp" class="workspace-account student-notifications"
          to="/student/messages" aria-label="消息通知" title="消息通知">
          <el-icon aria-hidden="true"><Bell /></el-icon>
          <span v-if="notices.unreadCount" class="student-notification-dot" aria-label="有未读消息"></span>
        </RouterLink>
        <RouterLink class="workspace-account" to="/student/profile">个人信息</RouterLink>
        <el-button text @click="logout">退出登录</el-button>
      </div>
    </header>
    <div class="student-frame">
      <main class="student-main" id="student-content">
        <RouterView />
      </main>
      <WorkspaceBackdrop />
    </div>
    <RouterLink class="student-help" to="/student/help" aria-label="帮助说明">
      <span class="student-help-icon" aria-hidden="true">?</span>
      <span class="student-help-label">帮助</span>
    </RouterLink>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell } from '@element-plus/icons-vue'
import { menus } from '@/router/menus'
import { useAuthStore } from '@/stores/auth'
import { useStudentNoticesStore } from '@/stores/studentNotices'
import { studentMvp } from '@/api/studentMvp'
import WorkspaceBackdrop from '@/components/WorkspaceBackdrop.vue'
import '@/styles/student.css'
import '@/styles/workspace.css'

const auth = useAuthStore()
const notices = useStudentNoticesStore()
let notificationTimer: number | undefined

function refreshNotices() {
  if (!studentMvp) notices.load().catch(error => console.error('通知读取失败', error))
}
const schoolLogo = `${import.meta.env.BASE_URL}brand/hebei-normal-software.jpg`
const mvpMenuPaths = new Set([
  '/student/dashboard', '/student/labs', '/student/application', '/student/application/record',
  '/student/interview', '/student/admission-confirmation', '/student/result', '/student/profile',
  '/student/help'
])
const studentMenus = studentMvp ? menus.STUDENT.filter(item => mvpMenuPaths.has(item.path)) : menus.STUDENT
const navigationItems = studentMenus.filter(item => item.path !== '/student/help')
const route = useRoute()
const router = useRouter()
const compactHeader = ref(false)

function updateHeaderSize() {
  if (window.scrollY > 96) compactHeader.value = true
  if (window.scrollY <= 24) compactHeader.value = false
}

onMounted(() => {
  updateHeaderSize()
  window.addEventListener('scroll', updateHeaderSize, { passive: true })
  notices.notices = []
  refreshNotices()
  if (!studentMvp) notificationTimer = window.setInterval(refreshNotices, 30000)
  window.addEventListener('focus', refreshNotices)
})
onUnmounted(() => {
  window.removeEventListener('scroll', updateHeaderSize)
  window.removeEventListener('focus', refreshNotices)
  if (notificationTimer) window.clearInterval(notificationTimer)
})
watch(() => route.path, refreshNotices)

function logout() {
  auth.logout(true)
  router.replace('/login')
}
</script>
