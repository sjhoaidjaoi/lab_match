<template>
  <section class="student-page">
    <h1>{{ lab?.name ?? (route.params.labId ? '实训室详情' : '实训室开放日') }}</h1>
    <template v-if="route.params.labId">
      <RouterLink to="/student/labs">返回实训室列表</RouterLink>
      <el-empty v-if="!lab" description="未找到该实训室" />
      <el-card v-else shadow="never">
        <h2>项目与开放日安排</h2>
        <dl class="student-fields">
          <dt>负责人</dt><dd>{{ lab.leader }}</dd>
          <dt>项目方向</dt><dd>{{ lab.direction }}</dd>
          <dt>技术栈</dt><dd>{{ lab.tools }}</dd>
          <dt>预期成果</dt><dd>{{ lab.project }}</dd>
          <dt>招生名额</dt><dd>{{ lab.quota }} 人</dd>
          <dt>招新要求</dt><dd>{{ lab.requirement }}</dd>
          <dt>培养计划</dt><dd>{{ lab.training }}</dd>
          <dt>考核方式</dt><dd>{{ lab.assessment }}</dd>
          <dt>开放时间</dt><dd>{{ formatTime(openDayTime) }} 起，开放两小时</dd>
          <dt>场地与设备</dt><dd>{{ lab.room }} · {{ lab.equipment }}</dd>
        </dl>
        <div class="student-actions">
          <RouterLink :to="'/student/labs/' + lab.id + '/tour'">全景云游</RouterLink>
          <RouterLink :to="{ path: '/student/announcement', query: { lab: lab.id } }">宣讲视频</RouterLink>
        </div>
      </el-card>
    </template>
    <template v-else>
      <p>现场参观于 {{ formatTime(openDayTime) }} 开始，开放两小时。请到对应实训室门口集合。</p>
      <div class="student-grid">
        <el-card v-for="item in labs" :key="item.id" shadow="never">
          <h2>{{ item.name }}</h2>
          <p>{{ item.direction }}</p>
          <p>{{ item.room }} · 招生 {{ item.quota }} 人</p>
          <RouterLink :to="'/student/labs/' + item.id">项目与设备详情</RouterLink>
        </el-card>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStudentStore } from '@/stores/student'
import { formatTime, labs } from './studentDemo'

const route = useRoute()
const student = useStudentStore()
const lab = computed(() => labs.find(item => String(item.id) === route.params.labId))
const openDayTime = computed(() => student.timeline[1].start + 6 * 3_600_000)
</script>
