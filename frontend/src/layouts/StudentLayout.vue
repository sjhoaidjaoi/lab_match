<template>
  <PortalLayout title="学生端" :menus="menus" />
</template>

<script setup lang="ts">
import PortalLayout from './PortalLayout.vue'

const menus = [
  { label: '工作台', to: '/student' },
  { label: '我的档案', to: '/student/archive' },
  { label: '意向填报', to: '/student/intention' },
  { label: '补录填报', to: '/student/supplement' },
  { label: '面试安排', to: '/student/interview' },
  { label: '待确认中心', to: '/student/confirm-center' },
  { label: '名单公示', to: '/student/publicity' },
  { label: '我的异议', to: '/student/disputes' },
  { label: '消息通知', to: '/student/notices' }
]
</script>
