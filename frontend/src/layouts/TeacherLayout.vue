<template>
  <PortalLayout title="教师端" :menus="menus" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/store/user'
import PortalLayout from './PortalLayout.vue'

const userStore = useUserStore()

const menus = computed(() => {
  const list = [
    { label: '工作台', to: '/teacher' },
    { label: '拟录取勾选', to: '/teacher/nominations' },
    { label: '报名学生', to: '/teacher/applicants' },
    { label: '全院调剂池', to: '/teacher/reallocation-pool' },
    { label: '递补顺位', to: '/teacher/waitlist' }
  ]
  if (!userStore.isLeader) {
    return list
  }
  return [
    { label: '工作台', to: '/teacher' },
    { label: '本室工作台', to: '/leader' },
    { label: '本室导师与名额', to: '/leader/mentors' },
    { label: '面试排期', to: '/leader/interview-schedule' },
    { label: '本室评分', to: '/leader/scoring' },
    ...list.slice(1),
    { label: '本室录取汇总', to: '/leader/nominations' },
    { label: '本室调剂', to: '/leader/reallocation' }
  ]
})
</script>
