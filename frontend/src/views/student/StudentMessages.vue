<template>
  <section v-loading="loading" class="student-page" aria-label="学院通知">
    <el-alert v-if="failed" type="error" title="通知读取失败" :closable="false">
      <el-button text @click="load">重试</el-button>
    </el-alert>
    <div v-if="unreadIds.length" class="student-actions">
      <el-button :disabled="markingId !== null" :loading="markingAll" @click="markAllRead">全部标为已读</el-button>
    </div>
    <el-empty v-if="!loading && !failed && !notices.length" :image-size="88" description="暂无通知" />
    <el-card v-for="notice in notices" :key="notice.id" shadow="never" class="student-notice-card"
      :class="{ 'student-notice-unread': !notice.read }">
      <h2>{{ notice.title }}</h2>
      <p>{{ notice.content }}</p>
      <p class="notice-time">发布时间 · {{ formatDateTime(notice.createdAt) }}</p>
      <div class="student-actions">
        <el-tag :type="notice.read ? 'info' : 'warning'">{{ notice.read ? '已读' : '未读' }}</el-tag>
        <router-link v-if="notice.destination === 'STUDENT_INTERVIEW'" :to="{ path: '/student/interview', query: { interviewId: notice.interviewId } }">查看面试安排 →</router-link>
        <router-link v-if="notice.destination === 'STUDENT_RESULT'" to="/student/result">查看最终结果 →</router-link>
        <el-button v-if="!notice.read" text :disabled="markingAll || (markingId !== null && markingId !== notice.id)" :loading="markingId === notice.id" @click="markRead(notice)">标为已读</el-button>
      </div>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { NoticeItem } from '@/types'
import { formatDateTime } from '@/api/student'
import { storeToRefs } from 'pinia'
import { useStudentNoticesStore } from '@/stores/studentNotices'

const loading = ref(false)
const markingAll = ref(false)
const markingId = ref<number | null>(null)
const failed = ref(false)
const noticeStore = useStudentNoticesStore()
const { notices } = storeToRefs(noticeStore)

const unreadIds = computed(() => notices.value.filter((item) => !item.read).map((item) => item.id))

async function load() {
  loading.value = true
  try {
    await noticeStore.load()
    failed.value = false
  } catch (error) {
    failed.value = true
    console.error('通知读取失败', error)
  } finally {
    loading.value = false
  }
}

async function markRead(notice: NoticeItem) {
  if (notice.read || markingAll.value || markingId.value !== null) return
  markingId.value = notice.id
  try {
    await noticeStore.markRead(notice.id)
  } catch (error) {
    console.error('标记已读失败', error)
  } finally {
    markingId.value = null
  }
}

async function markAllRead() {
  if (markingAll.value || markingId.value !== null || !unreadIds.value.length) return
  markingAll.value = true
  try {
    await Promise.allSettled(unreadIds.value.map(id => noticeStore.markRead(id)))
  } finally {
    markingAll.value = false
  }
}

onMounted(load)
</script>
