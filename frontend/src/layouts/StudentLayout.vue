<template>
  <div class="student-shell">
    <header class="student-top">
      <RouterLink class="student-brand" to="/student/dashboard">软件学院 · 实训室进组选拔</RouterLink>
      <span class="student-user">{{ auth.user?.username }}</span>
      <el-button text @click="logout">退出登录</el-button>
    </header>
    <nav class="student-nav" aria-label="学生端导航">
      <RouterLink v-for="item in studentMenus" :key="item.path" :to="item.path">{{ item.title }}</RouterLink>
    </nav>
    <main class="student-main">
      <p class="student-demo-note">{{ studentMvp ? "学生端联调 · 页面时间为北京时间" : "学生端演示 · 数据仅保存在本浏览器 · 页面时间为北京时间" }}</p>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { menus } from '@/router/menus'
import { useAuthStore } from '@/stores/auth'
import { useStudentStore } from '@/stores/student'
import { studentMvp } from '@/api/studentMvp'
import '@/styles/student.css'

const auth = useAuthStore()
const student = studentMvp ? null : useStudentStore()
const mvpMenuPaths = new Set([
  '/student/dashboard', '/student/labs', '/student/application', '/student/application/record',
  '/student/interview', '/student/admission-confirmation', '/student/result', '/student/profile'
])
const studentMenus = studentMvp ? menus.STUDENT.filter(item => mvpMenuPaths.has(item.path)) : menus.STUDENT
const router = useRouter()
let clock: number | undefined

function tick() {
  student?.updateClock()
  student?.settleSingleOffer()
}

onMounted(() => {
  if (!student) return
  student.save()
  tick()
  clock = window.setInterval(tick, 1000)
})
onUnmounted(() => window.clearInterval(clock))

function logout() {
  auth.logout()
  router.replace('/login')
}
</script>
