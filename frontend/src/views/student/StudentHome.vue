<template>
  <section class="student-page">
    <h1>学生工作台</h1>
    <el-card shadow="never">
      <h2>实训室双向选拔演示批次</h2>
      <p v-if="student.current">当前阶段为{{ student.current.name }}，于 {{ formatTime(student.current.end) }} 截止。</p>
      <p v-else>本批次已结束。</p>
      <div class="student-actions">
        <label for="student-preview-stage">切换演示阶段</label>
        <el-select id="student-preview-stage" aria-label="切换演示阶段" style="width: 240px"
          :model-value="student.currentNumber" @change="student.previewStage">
          <el-option v-for="stage in student.timeline" :key="stage.no" :label="stage.name" :value="stage.no" />
          <el-option label="公示结束后" :value="9" />
        </el-select>
      </div>
      <ol class="student-timeline">
        <li v-for="stage in student.timeline" :key="stage.no" :class="{ active: student.current?.no === stage.no }">
          <RouterLink :to="studentLinks[stage.no - 1]">{{ stage.no }}. {{ stage.name }}</RouterLink>
          <p>{{ stage.no < student.currentNumber ? '已结束' : stage.no === student.currentNumber ? '进行中' : '未开始' }}</p>
        </li>
      </ol>
    </el-card>
    <div class="student-grid">
      <el-card shadow="never">
        <h2>学院最新通知</h2>
        <p v-for="notice in student.notices.slice(0, 3)" :key="notice.id">{{ notice.title }}</p>
        <RouterLink to="/student/messages">查看全部通知（{{ unread }} 条未读）</RouterLink>
      </el-card>
      <el-card shadow="never">
        <h2>我的选拔进度</h2>
        <p><RouterLink to="/student/application/record">志愿填报</RouterLink> · {{ student.receipt ? '已提交' : '未提交' }}</p>
        <p><RouterLink to="/student/interview">面试安排</RouterLink> · {{ student.currentNumber >= 4 && student.receipt ? '已发布' : '暂无通知' }}</p>
        <p><RouterLink to="/student/admission-confirmation">拟录取</RouterLink> · {{ student.confirmed ? labName(student.confirmed.labId) : student.offerIds.length ? '请查看通知' : '暂无通知' }}</p>
      </el-card>
      <el-card shadow="never">
        <h2>实训室项目</h2>
        <p v-for="lab in labs.slice(0, 3)" :key="lab.id"><RouterLink :to="'/student/labs/' + lab.id">{{ lab.name }}</RouterLink></p>
        <RouterLink to="/student/labs">浏览全部实训室</RouterLink>
      </el-card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStudentStore } from '@/stores/student'
import { formatTime, labName, labs, studentLinks } from './studentDemo'

const student = useStudentStore()
const unread = computed(() => student.notices.filter(notice => !student.data.read.includes(notice.id)).length)
</script>
