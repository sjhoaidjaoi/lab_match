<template>
  <div class="page-container notices-page">
    <div class="page-head">
      <h1>公告栏</h1>
      <p class="subtitle">宣讲、开放日、公示与通知</p>
    </div>

    <el-card v-loading="loading" shadow="never">
      <div v-if="notices.length > 0" class="notice-list">
        <div
          v-for="item in notices"
          :key="item.id"
          class="notice-item"
          @click="openDetail(item.id)"
        >
          <div class="notice-main">
            <div class="notice-title">
              <span>{{ item.title }}</span>
              <NoticeTypeTag :notice-type="item.noticeType" :notice-type-text="item.noticeTypeText" />
            </div>
            <p class="notice-time">{{ formatTime(item.publishTime) }}</p>
          </div>
          <el-button type="primary" link @click.stop="openDetail(item.id)">详情</el-button>
        </div>
      </div>
      <el-empty v-else-if="!loading" description="暂无公告" />
    </el-card>

    <div class="pagination">
      <el-pagination
        v-model:current-page="pageNum"
        :page-size="PAGE_SIZE"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="loadNotices"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import NoticeTypeTag from '@/components/public/NoticeTypeTag.vue'
import { listPublicNotices } from '@/api/public'
import type { PublicNoticeItem } from '@/types/public'

const PAGE_SIZE = 10

const router = useRouter()
const loading = ref(false)
const notices = ref<PublicNoticeItem[]>([])
const total = ref(0)
const pageNum = ref(1)

function formatTime(value: string | null): string {
  return value ? value.replace('T', ' ').slice(0, 16) : '未发布'
}

async function loadNotices() {
  loading.value = true
  try {
    const page = await listPublicNotices({ pageNum: pageNum.value, pageSize: PAGE_SIZE })
    notices.value = page.list
    total.value = page.total
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openDetail(id: number) {
  router.push(`/notices/${id}`)
}

onMounted(loadNotices)
</script>

<style scoped>
.notices-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.page-head h1 {
  margin: 0 0 6px;
  font-size: 24px;
  color: #1f2d3d;
}

.subtitle {
  margin: 0 0 20px;
  font-size: 14px;
  color: #909399;
}

.notice-list {
  display: flex;
  flex-direction: column;
}

.notice-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 4px;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
}

.notice-item:last-child {
  border-bottom: none;
}

.notice-item:hover .notice-title span {
  color: #409eff;
}

.notice-main {
  flex: 1;
  min-width: 0;
}

.notice-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.notice-time {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
