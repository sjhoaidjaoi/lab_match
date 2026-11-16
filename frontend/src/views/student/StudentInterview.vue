<template>
  <section v-loading="loading" class="student-page">
    <h1>我的面试</h1>
    <el-alert v-if="failed" title="面试安排加载失败" type="error" :closable="false"><el-button text @click="load">重试</el-button></el-alert>
    <el-empty v-if="!loading && !interviews.length" description="暂无面试安排" />
    <div v-else class="student-page">
      <el-card v-for="item in interviews" :key="item.id" shadow="never">
        <h2>{{ item.laboratoryName || '实训室#' + item.laboratoryId }}</h2>
        <p>时间 · {{ formatDateTime(item.interviewTime) }}<span v-if="item.durationMinutes"> · {{ item.durationMinutes }} 分钟</span></p>
        <p v-if="!item.online">地点 · {{ item.location || '—' }}</p>
        <p>形式 · {{ item.interviewForm || '—' }}</p>
        <p>指导教师 · {{ item.labTeacherName || '—' }} · 面试官 {{ item.interviewerName || '—' }}</p>
        <p v-if="item.instructions">{{ item.instructions }}</p>
        <div class="interview-actions">
          <el-tag :type="tagType(item.interviewStatus)">{{ item.online ? meetingStatusLabels[item.online.status] : statusLabel(item.interviewStatus) }}</el-tag>
          <el-button v-if="item.online" type="primary" tag="router-link" :to="`/meeting/${item.id}`">
            {{ ['ENDED', 'CANCELLED', 'CLOSED'].includes(item.online.status) ? '查看详情' : '进入会议 / 测试设备' }}
          </el-button>
        </div>
      </el-card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { formatDateTime, studentApi, type StudentInterview } from '@/api/student'
import { meetingStatusLabels } from '@/api/interviewVideo'

const statusLabels: Record<string, string> = {
  SCHEDULED: '已安排', IN_PROGRESS: '进行中', COMPLETED: '已完成', CANCELLED: '已取消'
}

const loading = ref(false)
const failed = ref(false)
const interviews = ref<StudentInterview[]>([])

function statusLabel(status?: string) {
  return status ? statusLabels[status] ?? status : '—'
}
function tagType(status?: string) {
  if (status === 'COMPLETED') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CANCELLED') return 'info'
  return 'primary'
}

async function load() {
  loading.value = true
  try {
    const items = await studentApi.myInterviews()
    interviews.value = items.filter(item => item.interviewTime || item.interviewStatus === 'CANCELLED')
      .sort((a, b) => (a.interviewTime || '').localeCompare(b.interviewTime || ''))
    failed.value = false
  } catch (error) {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.interview-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
</style>
