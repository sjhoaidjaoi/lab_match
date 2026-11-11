<template>
  <div class="notice-page">
    <div class="page-header">
      <div>
        <h2>消息通知</h2>
        <p class="subtitle">填报截止、面试排期、确认提醒、公示与异议回复</p>
      </div>
      <div class="header-actions">
        <el-tag type="danger" effect="plain">未读 {{ unreadCount }} 条</el-tag>
        <el-button :disabled="unreadCount === 0" :loading="marking" @click="handleReadAll">
          全部标记已读
        </el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-tabs v-model="tab" @tab-change="loadNotices">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="未读" name="unread" />
        <el-tab-pane label="系统通知" name="system" />
      </el-tabs>

      <div v-loading="loading" class="notice-list">
        <div
          v-for="item in notices"
          :key="item.id"
          class="notice-item"
          :class="{ unread: item.isRead === 0 }"
          @click="handleOpen(item)"
        >
          <span class="dot" />
          <div class="notice-main">
            <div class="notice-title">
              <span>{{ item.title }}</span>
              <el-tag size="small" effect="plain">{{ item.noticeTypeText }}</el-tag>
            </div>
            <p class="notice-content">{{ item.content }}</p>
          </div>
          <span class="notice-time">{{ formatTime(item.gmtCreate) }}</span>
        </div>
        <el-empty v-if="!loading && notices.length === 0" description="暂无通知" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getUnreadCount, listMyNotices, markNoticesRead } from '@/api/notice'
import type { NoticeItem } from '@/types/notice'

const loading = ref(false)
const marking = ref(false)
const tab = ref<'all' | 'unread' | 'system'>('all')
const notices = ref<NoticeItem[]>([])
const unreadCount = ref(0)

function formatTime(value: string): string {
  return value.replace('T', ' ').slice(0, 19)
}

async function loadNotices() {
  loading.value = true
  try {
    const query = tab.value === 'unread'
      ? { isRead: 0 }
      : tab.value === 'system'
        ? { noticeType: 1 }
        : {}
    const [page, unread] = await Promise.all([
      listMyNotices({ ...query, pageNum: 1, pageSize: 100 }),
      getUnreadCount()
    ])
    notices.value = page.list
    unreadCount.value = unread.count
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

async function handleOpen(item: NoticeItem) {
  if (item.isRead === 0) {
    await markNoticesRead([item.id]).catch(() => undefined)
    await loadNotices()
  }
  ElMessage.info(item.content)
}

async function handleReadAll() {
  marking.value = true
  try {
    await markNoticesRead()
    await loadNotices()
    ElMessage.success('已全部标记为已读')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    marking.value = false
  }
}

onMounted(loadNotices)
</script>

<style scoped>
.notice-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notice-list {
  min-height: 200px;
}

.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 4px;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
}

.notice-item:last-child {
  border-bottom: none;
}

.dot {
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 50%;
  background: transparent;
}

.notice-item.unread .dot {
  background: #f56c6c;
}

.notice-main {
  flex: 1;
}

.notice-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.notice-content {
  margin: 6px 0 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}

.notice-time {
  font-size: 12px;
  color: #c0c4cc;
  white-space: nowrap;
}
</style>
