<template>
  <section v-loading="loading" class="student-page">
    <h1>学院通知</h1>
    <div class="student-actions">
      <el-button :disabled="!unreadIds.length" :loading="markingAll" @click="markAllRead">全部标为已读</el-button>
      <span>{{ unreadIds.length }} 条未读</span>
    </div>
    <el-empty v-if="!loading && !notices.length" description="暂无通知" />
    <el-card v-for="notice in notices" :key="notice.id" shadow="never">
      <h2>{{ notice.title }}</h2>
      <p>{{ notice.content }}</p>
      <p>发布时间 · {{ formatDateTime(notice.createdAt) }}</p>
      <div class="student-actions">
        <el-tag :type="notice.read ? 'info' : 'warning'">{{ notice.read ? '已读' : '未读' }}</el-tag>
        <router-link v-if="notice.destination === 'STUDENT_INTERVIEW'" :to="{ path: '/student/interview', query: { interviewId: notice.interviewId } }">查看面试安排 →</router-link>
        <router-link v-if="notice.destination === 'STUDENT_RESULT'" to="/student/result">查看最终结果 →</router-link>
        <el-button v-if="!notice.read" text :loading="markingId === notice.id" @click="markRead(notice)">标为已读</el-button>
      </div>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { NoticeItem } from '@/types'
import { formatDateTime, studentApi } from '@/api/student'

const loading = ref(false)
const markingAll = ref(false)
const markingId = ref<number | null>(null)
const notices = ref<NoticeItem[]>([])

const unreadIds = computed(() => notices.value.filter((item) => !item.read).map((item) => item.id))

async function load() {
  loading.value = true
  try {
    notices.value = await studentApi.myNotices()
  } catch (error) {
    console.error('通知读取失败', error)
  } finally {
    loading.value = false
  }
}

async function markRead(notice: NoticeItem) {
  if (notice.read || markingId.value !== null) return
  markingId.value = notice.id
  try {
    await studentApi.readNotice(notice.id)
    notice.read = true
  } catch (error) {
    console.error('标记已读失败', error)
  } finally {
    markingId.value = null
  }
}

async function markAllRead() {
  if (markingAll.value || !unreadIds.value.length) return
  markingAll.value = true
  try {
    await Promise.all(unreadIds.value.map((id) => studentApi.readNotice(id)))
    await load()
  } catch (error) {
    console.error('批量标记已读失败', error)
  } finally {
    markingAll.value = false
  }
}

onMounted(load)
</script>
