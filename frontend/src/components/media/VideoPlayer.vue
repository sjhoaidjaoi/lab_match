<template>
  <div class="video-player">
    <div v-if="!item" class="empty">
      <el-empty description="请选择左侧视频" />
    </div>
    <template v-else>
      <div class="frame">
        <video
          v-if="item.videoType === 'MP4' && !failed"
          :key="item.id"
          :src="item.videoUrl"
          :poster="item.coverUrl || undefined"
          class="media"
          controls
          preload="metadata"
          @error="failed = true"
        />
        <iframe
          v-else-if="item.videoType !== 'MP4' && !failed"
          :key="item.id"
          :src="item.videoUrl"
          class="media"
          allowfullscreen
          referrerpolicy="no-referrer"
          @error="failed = true"
        />
        <div v-else class="failed">
          <el-result icon="warning" title="视频源暂不可用" :sub-title="item.videoUrl">
            <template #extra>
              <el-button v-if="isHttp(item.videoUrl)" type="primary" link @click="openExternal">
                在新窗口打开
              </el-button>
            </template>
          </el-result>
        </div>
      </div>
      <div class="meta">
        <h3 class="title">{{ item.title }}</h3>
        <p class="sub">
          <el-tag size="small" effect="plain">{{ item.labName || '未关联实训室' }}</el-tag>
          <span class="type">{{ typeLabel }}</span>
        </p>
        <p v-if="item.description" class="desc">{{ item.description }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { VideoItem } from '@/types'

const props = defineProps<{ item: VideoItem | null }>()

const failed = ref(false)
watch(
  () => props.item?.id,
  () => {
    failed.value = false
  }
)

const typeLabel = computed(() => {
  const map: Record<string, string> = { MP4: 'MP4 视频', LINK: '外链页面', EMBED: '内嵌页面' }
  return map[props.item?.videoType || ''] || props.item?.videoType || ''
})

function isHttp(url: string) {
  return /^https?:\/\//i.test(url)
}

function openExternal() {
  if (props.item) window.open(props.item.videoUrl, '_blank', 'noopener')
}
</script>

<style scoped>
.empty {
  padding: 40px 0;
}

.frame {
  background: #0f172a;
  border-radius: var(--lm-radius);
  overflow: hidden;
  aspect-ratio: 16 / 9;
}

.media {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  object-fit: contain;
  background: #0f172a;
}

.failed {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.meta {
  padding: 14px 4px 0;
}

.title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
}

.sub {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--lm-text-secondary);
  font-size: 13px;
}

.desc {
  margin: 10px 0 0;
  color: var(--lm-text-secondary);
  line-height: 1.7;
}
</style>
