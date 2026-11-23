<template>
  <section class="announcement-page">
    <header class="page-header"><h1>系统公告</h1></header>
    <el-card shadow="never">
      <el-empty v-if="!loading && !list.length" description="暂无公告" />
      <el-skeleton v-else-if="loading" :rows="4" animated />
      <div v-else class="notice-list">
        <article v-for="item in list" :key="item.id" class="notice-item">
          <div class="notice-head">
            <h3>{{ item.title }}</h3>
            <time>{{ formatTime(item.createdAt) }}</time>
          </div>
          <p class="notice-content">{{ item.content }}</p>
        </article>
      </div>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { http } from '@/api/request'

interface Announcement {
  id: number
  title: string
  content: string
  createdAt?: string
}

const list = ref<Announcement[]>([])
const loading = ref(false)

function formatTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

async function load() {
  loading.value = true
  try {
    const data = await http.get<Announcement[] | { list: Announcement[] }>('/announcements')
    list.value = Array.isArray(data) ? data : data?.list || []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.announcement-page { max-width: 960px; }
.card-title { font-weight: 600; font-size: 15px; }
.notice-list { display: flex; flex-direction: column; gap: 18px; }
.notice-item { padding-bottom: 16px; border-bottom: 1px dashed #e5e7eb; }
.notice-item:last-child { border-bottom: none; padding-bottom: 0; }
.notice-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.notice-head h3 { margin: 0; font-size: 15px; font-weight: 600; color: #1f2937; }
.notice-head time { font-size: 12px; color: #9ca3af; white-space: nowrap; }
.notice-content { margin: 8px 0 0; font-size: 13px; color: #4b5563; line-height: 1.8; white-space: pre-wrap; }
@media (max-width: 768px) {
  .notice-head { flex-direction: column; gap: 4px; }
}
</style>
