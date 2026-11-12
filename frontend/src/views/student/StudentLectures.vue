<template>
  <div class="page">
    <div class="page-header">
      <el-tag size="small" effect="plain" class="stage-tag">阶段① · 集中宣讲</el-tag>
      <h1 class="page-title">集中宣讲视频</h1>
      <p class="page-desc">各实训室导师介绍研究方向、培养安排与选拔要求，宣讲期间可反复观看。</p>
    </div>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      title="视频由学院管理员或实训室负责人维护"
      description="资源地址支持 MP4 直链、外链页面（B 站 / 校内视频平台）与内嵌页面三种形式。"
      class="hint"
    />

    <el-row :gutter="16">
      <el-col :xs="24" :md="8">
        <el-card v-loading="loading" shadow="never" class="panel">
          <template #header>
            <span class="panel-title">视频目录</span>
            <span class="count">{{ videos.length }} 个</span>
          </template>
          <el-empty v-if="!loading && videos.length === 0" description="暂未发布宣讲视频" />
          <div v-else class="video-list">
            <div
              v-for="video in videos"
              :key="video.id"
              class="video-item"
              :class="{ active: current?.id === video.id }"
              @click="current = video"
            >
              <div class="video-item-title">{{ video.title }}</div>
              <div class="video-item-meta">
                <span>{{ video.labName || '未关联实训室' }}</span>
                <el-tag size="small" effect="plain" type="info">{{ typeLabel(video.videoType) }}</el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="16">
        <el-card shadow="never" class="panel">
          <VideoPlayer :item="current" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { mediaApi } from '@/api/media'
import VideoPlayer from '@/components/media/VideoPlayer.vue'
import type { VideoItem } from '@/types'

const loading = ref(false)
const videos = ref<VideoItem[]>([])
const current = ref<VideoItem | null>(null)

function typeLabel(type?: string) {
  const map: Record<string, string> = { MP4: '视频', LINK: '外链', EMBED: '内嵌' }
  return map[type || ''] || type || ''
}

onMounted(async () => {
  loading.value = true
  try {
    videos.value = await mediaApi.videos()
    current.value = videos.value[0] || null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.stage-tag {
  margin-bottom: 10px;
}

.hint {
  margin-bottom: 16px;
}

.panel-title {
  font-weight: 600;
}

.count {
  margin-left: 8px;
  color: var(--lm-text-secondary);
  font-size: 13px;
}

.video-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 520px;
  overflow: auto;
}

.video-item {
  padding: 10px 12px;
  border: 1px solid var(--lm-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.video-item:hover {
  border-color: var(--lm-primary);
}

.video-item.active {
  border-color: var(--lm-primary);
  background: #f1f5ff;
}

.video-item-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.video-item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  color: var(--lm-text-secondary);
  font-size: 12px;
}
</style>
