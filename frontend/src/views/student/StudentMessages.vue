<template>
  <section class="student-page">
    <h1>学院通知</h1>
    <div class="student-actions">
      <el-button :disabled="unread.length === 0" @click="student.markRead(unread)">全部标为已读</el-button>
      <span>{{ unread.length }} 条未读</span>
    </div>
    <el-card v-for="notice in student.notices" :key="notice.id" shadow="never">
      <h2>{{ notice.title }}</h2>
      <p>{{ notice.content }}</p>
      <div class="student-actions">
        <RouterLink :to="studentLinks[notice.stage - 1]">查看相关页面</RouterLink>
        <el-button v-if="unread.includes(notice.id)" text @click="student.markRead([notice.id])">标为已读</el-button>
      </div>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStudentStore } from '@/stores/student'
import { studentLinks } from './studentDemo'

const student = useStudentStore()
const unread = computed(() => student.notices.filter(notice => !student.data.read.includes(notice.id)).map(notice => notice.id))
</script>
