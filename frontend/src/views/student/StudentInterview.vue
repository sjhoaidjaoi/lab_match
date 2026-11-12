<template>
  <section class="student-page">
    <h1>面试安排</h1>
    <el-empty v-if="!interviews.length" description="暂无面试通知" />
    <div v-else class="student-grid">
      <el-card v-for="lab in interviews" :key="lab.id" shadow="never">
        <h2>{{ lab.name }}</h2>
        <p>时间 · {{ formatTime(student.timeline[3].start + (lab.id + 1) * 3_600_000) }}</p>
        <p>地点 · {{ lab.room }}</p>
        <p>形式 · 线下面试，请准备自我介绍及项目经历。</p>
        <el-tag :type="student.currentNumber === 4 ? 'success' : 'info'">
          {{ student.currentNumber === 4 ? '已安排' : '面试阶段已结束' }}
        </el-tag>
      </el-card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStudentStore } from '@/stores/student'
import { formatTime, labs } from './studentDemo'

const student = useStudentStore()
const interviews = computed(() => student.currentNumber >= 4
  ? labs.filter(lab => student.receipt?.labIds.includes(lab.id)) : [])
</script>
