<template>
  <div class="page-container notice-detail">
    <div v-loading="loading" class="detail-body">
      <template v-if="notice">
        <el-card shadow="never">
          <div class="notice-head">
            <h1>{{ notice.title }}</h1>
            <div class="meta">
              <NoticeTypeTag :notice-type="notice.noticeType" :notice-type-text="notice.noticeTypeText" />
              <span class="publish-time">发布时间：{{ formatTime(notice.publishTime) }}</span>
            </div>
          </div>

          <div class="content">{{ notice.content }}</div>

          <div class="actions">
            <el-button
              v-if="notice.attachmentUrl"
              tag="a"
              :href="notice.attachmentUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              下载附件
            </el-button>
            <el-button
              v-if="notice.noticeType === 3 && notice.publicityId"
              type="primary"
              @click="goPublicity"
            >
              查看公示名单
            </el-button>
            <el-button @click="goBack">返回公告列表</el-button>
          </div>
        </el-card>
      </template>

      <el-empty v-else-if="!loading" description="公告不存在或已下线" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NoticeTypeTag from '@/components/public/NoticeTypeTag.vue'
import { getPublicNoticeDetail } from '@/api/public'
import type { PublicNoticeItem } from '@/types/public'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const notice = ref<PublicNoticeItem | null>(null)

function formatTime(value: string | null): string {
  return value ? value.replace('T', ' ').slice(0, 16) : '未发布'
}

async function loadNotice() {
  const id = Number(route.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    loading.value = false
    return
  }
  try {
    notice.value = await getPublicNoticeDetail(id)
  } catch {
    notice.value = null
  } finally {
    loading.value = false
  }
}

function goPublicity() {
  router.push({
    path: '/student/publicity',
    query: { publicityId: notice.value?.publicityId ?? undefined }
  })
}

function goBack() {
  router.push('/notices')
}

onMounted(loadNotice)
</script>

<style scoped>
.notice-detail {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.detail-body {
  min-height: 260px;
}

.notice-head h1 {
  margin: 0 0 12px;
  font-size: 24px;
  line-height: 1.5;
  color: #1f2d3d;
}

.meta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f2f5;
}

.publish-time {
  font-size: 13px;
  color: #909399;
}

.content {
  padding: 20px 0;
  font-size: 14px;
  line-height: 1.9;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f2f5;
}
</style>
