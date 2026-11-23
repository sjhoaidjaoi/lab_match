<template>
  <section v-loading="loading" class="student-page">
    <header class="page-header">
      <h1>我的面试</h1>
      <p>按志愿查看面试安排。拟录取通知与最终公示会在对应阶段发布。</p>
      <div class="interview-actions">
        <router-link to="/student/admission-confirmation">拟录取确认 →</router-link>
        <router-link to="/student/result">最终结果 →</router-link>
      </div>
    </header>
    <el-alert v-if="failed" title="面试安排加载失败" type="error" :closable="false"><el-button text @click="load">重试</el-button></el-alert>
    <el-empty v-if="!loading && !interviews.length" description="暂无面试安排" />
    <div v-else class="student-page">
      <el-card v-for="item in interviews" :id="'interview-' + item.id" :key="item.id"
        :class="{ 'linked-interview': String(item.id) === route.query.interviewId }" shadow="never">
        <h2>{{ item.laboratoryName || '实训室#' + item.laboratoryId }}</h2>
        <p v-if="item.interviewTime">时间 · {{ formatDateTime(item.interviewTime) }}<span v-if="item.durationMinutes"> · {{ item.durationMinutes }} 分钟</span></p>
        <p v-if="item.location && !item.online">地点 · {{ item.location }}</p>
        <p v-if="item.interviewForm">形式 · {{ item.interviewForm }}</p>
        <p>指导教师 · {{ item.labTeacherName || '—' }}<span v-if="item.interviewerName"> · 面试官 {{ item.interviewerName }}</span></p>
        <p v-if="item.instructions">{{ item.instructions }}</p>
        <p v-if="item.rescheduledAt">安排已更新，请以当前时间为准。</p>
        <p v-if="item.followUp">若需补面试，请留意新的邀请通知。</p>
        <div class="interview-actions">
          <el-tag :type="tagType(item.appointmentStatus)">{{ appointments[item.appointmentStatus || 'UNSCHEDULED'] }}</el-tag>
          <el-tag v-if="item.acknowledgedAt" type="success" effect="plain">已确认收到</el-tag>
          <el-button v-if="item.canAcknowledge && !item.acknowledgedAt" :loading="confirming === item.id" @click="acknowledge(item)">确认收到邀请</el-button>
          <el-button v-if="item.online" type="primary" tag="router-link" :to="`/meeting/${item.id}`">
            {{ ['ENDED', 'CANCELLED', 'CLOSED'].includes(item.online.status) ? '查看详情' : '进入会议 / 测试设备' }}
          </el-button>
        </div>
      </el-card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { formatDateTime, studentApi, type StudentInterview } from '@/api/student'
import { appointments, interviewSelection } from '@/api/interviewSelection'

const route = useRoute()
const loading = ref(false)
const failed = ref(false)
const interviews = ref<StudentInterview[]>([])
const confirming = ref<number | null>(null)
function tagType(status?: string) {
  if (status === 'COMPLETED') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  if (['CANCELLED', 'UNSCHEDULED', 'MISSED', 'UNHELD'].includes(status || '')) return 'info'
  return 'primary'
}

async function load() {
  loading.value = true
  try {
    const items = await studentApi.myInterviews()
    interviews.value = items.sort((a, b) => (a.interviewTime || '\uffff').localeCompare(b.interviewTime || '\uffff'))
    failed.value = false
  } catch (error) {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function acknowledge(item: StudentInterview) {
  if (confirming.value) return
  confirming.value = item.id
  try { item.acknowledgedAt = (await interviewSelection.acknowledge(item.id)).acknowledgedAt }
  catch { await load() }
  finally { confirming.value = null }
}

watch([() => route.query.interviewId, interviews], async ([id]) => {
  if (!id) return
  await nextTick()
  document.getElementById('interview-' + id)?.scrollIntoView({ block: 'nearest' })
})
onMounted(load)
</script>

<style scoped>
.interview-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
.linked-interview { border-color: var(--el-color-primary); scroll-margin-top: 1rem; }
</style>
