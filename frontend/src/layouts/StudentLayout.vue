<template>
  <div class="student-shell workspace-theme" data-role="STUDENT">
    <GlassAmbient />
    <header class="student-top">
      <span class="lg-lens" aria-hidden="true"></span>
      <RouterLink class="student-brand" to="/student/dashboard">
        <img class="workspace-logo" :src="schoolLogo" alt="河北师范大学软件学院" />
      </RouterLink>
      <div class="student-account">
        <span class="student-user">{{ auth.user?.username }}</span>
        <RouterLink v-if="!studentMvp" class="workspace-account" to="/student/messages">消息通知</RouterLink>
        <RouterLink class="workspace-account" to="/student/profile">个人信息</RouterLink>
        <el-button text @click="logout">退出登录</el-button>
      </div>
    </header>
    <div class="student-frame">
      <nav class="student-nav" aria-label="学生端导航">
        <section v-for="group in groups" v-show="group.items.length" :key="group.name">
          <p>{{ group.name }}</p>
          <RouterLink v-for="item in group.items" :key="item.path" :to="item.path"
            :class="{ 'student-nav-active': route.path === item.path || route.path.startsWith(item.path + '/') }">
            <el-icon><component :is="item.icon" /></el-icon>{{ item.title }}
          </RouterLink>
        </section>
      </nav>
      <main class="student-main" id="student-content">
        <RouterView />
      </main>
      <WorkspaceBackdrop />
    </div>
    <AssistantDock />
  </div>
</template>
<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { menus } from '@/router/menus'
import { useAuthStore } from '@/stores/auth'
import { studentMvp } from '@/api/studentMvp'
import WorkspaceBackdrop from '@/components/WorkspaceBackdrop.vue'
import AssistantDock from '@/components/AssistantDock.vue'
import GlassAmbient from '@/components/GlassAmbient.vue'
import '@/styles/student.css'
import '@/styles/workspace.css'

const auth = useAuthStore()
const schoolLogo = `${import.meta.env.BASE_URL}brand/hebei-normal-software.png`
const mvpMenuPaths = new Set([
  '/student/dashboard', '/student/labs', '/student/application', '/student/application/record',
  '/student/interview', '/student/admission-confirmation', '/student/result', '/student/profile',
  '/student/help'
])
const studentMenus = studentMvp ? menus.STUDENT.filter(item => mvpMenuPaths.has(item.path)) : menus.STUDENT
const groups = [
  { name: '概览', paths: ['dashboard', 'announcement', 'labs'] },
  { name: '选拔', paths: ['application', 'interview', 'admission-confirmation', 'supplement', 'allocation', 'result'] },
  { name: '支持', paths: ['help'] }
].map(({ name, paths }) => ({ name, items: studentMenus.filter(item => paths.includes(item.path.replace('/student/', ''))) }))
const route = useRoute()
const router = useRouter()

function logout() {
  auth.logout(true)
  router.replace('/login')
}
</script>
