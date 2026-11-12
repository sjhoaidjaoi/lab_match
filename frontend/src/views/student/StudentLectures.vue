<template>
  <section class="student-page">
    <h1>集中宣讲</h1>
    <el-card shadow="never">
      <h2>{{ announcements[0].title }}</h2>
      <p>{{ announcements[0].content }}</p>
      <p>宣讲时间 · {{ formatTime(student.timeline[0].start) }} 至 {{ formatTime(student.timeline[0].end) }}</p>
    </el-card>
    <div class="student-grid">
      <el-card v-for="lab in labs" :key="lab.id" shadow="never">
        <h2>{{ lab.name }}</h2>
        <p>{{ lab.direction }} · {{ lab.leader }}</p>
        <div class="student-actions">
          <RouterLink :to="'/student/labs/' + lab.id">项目介绍</RouterLink>
          <RouterLink :to="{ path: '/student/announcement', query: { lab: lab.id } }">查看视频</RouterLink>
        </div>
      </el-card>
    </div>
    <el-card v-if="selected" shadow="never">
      <h2>{{ selected.name }}宣讲视频</h2>
      <VideoPlayer v-if="video" :item="video" />
      <el-empty v-else description="该实训室暂未配置宣讲视频" />
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import VideoPlayer from '@/components/media/VideoPlayer.vue'
import { useStudentStore } from '@/stores/student'
import { announcements, formatTime, labs, videos } from './studentDemo'

const route = useRoute()
const student = useStudentStore()
const selected = computed(() => labs.find(lab => String(lab.id) === route.query.lab))
const video = computed(() => videos.find(item => item.laboratoryId === selected.value?.id))
</script>
