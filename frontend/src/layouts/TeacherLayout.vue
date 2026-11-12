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
    { label: '我的录取名单', to: '/teacher/admissions' },
    { label: '题库管理', to: '/teacher/questions' },
    { label: '在线试卷', to: '/teacher/exam-papers' },
    { label: '全院调剂池', to: '/teacher/reallocation-pool' },
    { label: '递补顺位', to: '/teacher/waitlist' }
  ]
  if (!userStore.isLeader) {
    return [...list, { label: '个人中心', to: '/teacher/profile' }]
  }
  return [
    { label: '工作台', to: '/teacher' },
    { label: '本室工作台', to: '/leader' },
    { label: '本室导师与名额', to: '/leader/mentors' },
    { label: '本室报名学生', to: '/leader/applicants' },
    { label: '面试排期', to: '/leader/interview-schedule' },
    { label: '本室评分', to: '/leader/scoring' },
    { label: '拟录取勾选', to: '/teacher/nominations' },
    { label: '报名学生', to: '/teacher/applicants' },
    { label: '我的录取名单', to: '/teacher/admissions' },
    { label: '题库管理', to: '/teacher/questions' },
    { label: '在线试卷', to: '/teacher/exam-papers' },
    { label: '全院调剂池', to: '/teacher/reallocation-pool' },
    { label: '递补顺位', to: '/teacher/waitlist' },
    { label: '本室录取汇总', to: '/leader/nominations' },
    { label: '录取确认汇总', to: '/leader/admissions' },
    { label: '本室最终名单', to: '/leader/final-list' },
    { label: '本室递补名单', to: '/leader/waitlist' },
    { label: '本室调剂', to: '/leader/reallocation' },
    { label: '个人中心', to: '/teacher/profile' }
  ]
})
</script>
