<template>
  <div class="student-shell workspace-theme" data-role="STUDENT">
    <WorkspaceNav role="STUDENT">
      <RouterLink class="student-brand" to="/student/dashboard">
        <SchoolBrand class="workspace-logo" />
      </RouterLink>
      <div class="student-account">
        <span class="student-user">{{ auth.user?.username }}</span>
        <RouterLink v-if="!studentMvp" class="workspace-account" to="/student/messages">消息通知</RouterLink>
        <RouterLink class="workspace-account" to="/student/profile">个人信息</RouterLink>
        <RouterLink class="workspace-account" to="/student/help">帮助</RouterLink>
        <el-button text @click="logout">退出登录</el-button>
      </div>
    </WorkspaceNav>
    <div class="student-body">
      <main class="student-main" id="student-content">
        <RouterView class="portal-sheet" />
      </main>
    </div>
    <AssistantDock />
  </div>
</template>
<script setup lang="ts">
import SchoolBrand from '@/components/SchoolBrand.vue'
import { useRouter } from 'vue-router'
import WorkspaceNav from '@/components/WorkspaceNav.vue'
import { useAuthStore } from '@/stores/auth'
import { studentMvp } from '@/api/studentMvp'
import AssistantDock from '@/components/AssistantDock.vue'
import '@/styles/student.css'
import '@/styles/workspace.css'
/* 质感层必须排在最后：与 workspace.css 有同特异性选择器，靠顺序决胜 */
import '@/styles/premium.css'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout(true)
  router.replace('/login')
}
</script>

<style scoped>
@media (max-width: 640px) {
  .student-account { width: 100%; justify-content: space-between; gap: 2px 4px; }
  .student-account .workspace-account, .student-account .el-button { padding-inline: 4px; }
  .student-user { padding: 0; }
}
</style>
