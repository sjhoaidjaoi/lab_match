<template>
  <div class="student-shell workspace-theme" data-role="STUDENT">
    <GlassAmbient />
    <header class="student-top">
      <RouterLink class="student-brand" to="/student/dashboard">
        <img class="workspace-logo" :src="schoolLogo" alt="河北师范大学软件学院" />
      </RouterLink>
      <div class="student-account">
        <span class="student-user">{{ auth.user?.username }}</span>
        <RouterLink v-if="!studentMvp" class="workspace-account student-notifications" to="/student/messages"
          :aria-label="notices.unreadCount ? '消息通知，有未读消息' : '消息通知'" title="消息通知">
          <el-icon aria-hidden="true"><Bell /></el-icon>
          <span v-if="notices.unreadCount" class="student-notification-dot" aria-hidden="true"></span>
        </RouterLink>
        <RouterLink class="workspace-account" to="/student/profile">个人信息</RouterLink>
        <el-button text @click="logout">退出登录</el-button>
      </div>
    </header>
    <div class="student-frame">
      <main class="student-main" id="student-content">
        <el-button v-if="route.path !== studentHome" class="student-back" :icon="ArrowLeft" @click="goBack">
          返回
        </el-button>
        <RouterView />
      </main>
      <WorkspaceBackdrop />
    </div>
    <AssistantDock />
    <RouterLink class="workspace-action student-help" to="/student/help" aria-label="帮助说明">
      <el-icon aria-hidden="true"><QuestionFilled /></el-icon>
      <span class="student-help-label" aria-hidden="true">帮助</span>
    </RouterLink>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { ArrowLeft, Bell, QuestionFilled } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { ROLE_HOME } from '@/config/stages'
import { useAuthStore } from '@/stores/auth'
import { useStudentNoticesStore } from '@/stores/studentNotices'
import { studentMvp } from '@/api/studentMvp'
import WorkspaceBackdrop from '@/components/WorkspaceBackdrop.vue'
import AssistantDock from '@/components/AssistantDock.vue'
import GlassAmbient from '@/components/GlassAmbient.vue'
import '@/styles/student.css'
import '@/styles/workspace.css'

const auth = useAuthStore()
const schoolLogo = `${import.meta.env.BASE_URL}brand/hebei-normal-software.png`
const studentHome = ROLE_HOME.STUDENT
const route = useRoute()
const router = useRouter()
const notices = useStudentNoticesStore()
let noticeTimer: number | undefined

function refreshNotices() {
  void notices.load().catch(error => console.error('通知读取失败', error))
}

onMounted(() => {
  if (!studentMvp) {
    refreshNotices()
    noticeTimer = window.setInterval(refreshNotices, 30_000)
    window.addEventListener('focus', refreshNotices)
  }
})

onUnmounted(() => {
  window.removeEventListener('focus', refreshNotices)
  window.clearInterval(noticeTimer)
  notices.reset()
})

function goBack() {
  const previous = router.options.history.state.back
  if (typeof previous === 'string' && previous.startsWith('/student/') &&
      router.resolve(previous).path !== route.path) {
    router.back()
    return
  }

  if (route.params.labId) {
    router.replace(route.path.startsWith('/student/announcement/') ? '/student/announcement' : '/student/labs')
  } else if (route.path === '/student/application/record') {
    router.replace('/student/application')
  } else {
    router.replace(studentHome)
  }
}

function logout() {
  auth.logout(true)
  router.replace('/login')
}
</script>
