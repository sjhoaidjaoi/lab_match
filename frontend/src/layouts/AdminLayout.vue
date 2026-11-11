<template>
  <PortalLayout title="管理端" :menus="menus" />
</template>

<script setup lang="ts">
import PortalLayout from './PortalLayout.vue'

const menus = [
  { label: '工作台', to: '/admin' },
  { label: '实训室管理', to: '/admin/labs' },
  { label: '导师与名额', to: '/admin/mentors' },
  { label: '学生账号', to: '/admin/students' },
  { label: '轮次配置', to: '/admin/rounds' },
  { label: '公告管理', to: '/admin/notices' },
  { label: '统筹调剂', to: '/admin/reallocation' },
  { label: '公示管理', to: '/admin/publicity' },
  { label: '异议处理', to: '/admin/disputes' },
  { label: '录取总览', to: '/admin/results' }
]
</script>
