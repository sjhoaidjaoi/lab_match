<template>
  <div class="page">
    <div class="page-header">
      <el-tag size="small" effect="plain" class="stage-tag">阶段② · 实训室开放日</el-tag>
      <h1 class="page-title">实训室 720° 全景云游</h1>
      <p class="page-desc">开放日期间线上沉浸式参观实训室环境与设备，配合线下开放日安排了解实训条件。</p>
    </div>

    <el-card v-if="openDays.length > 0" shadow="never" class="panel schedule">
      <template #header><span class="panel-title">开放日安排</span></template>
      <div class="schedule-list">
        <div v-for="day in openDays" :key="day.id" class="schedule-item">
          <span class="date">{{ day.dateAt }}</span>
          <span>{{ day.startTime }} - {{ day.endTime }}</span>
          <span class="muted">{{ day.location }}</span>
          <span v-if="day.note" class="muted note">{{ day.note }}</span>
        </div>
      </div>
    </el-card>

    <el-card v-loading="loading" shadow="never" class="panel">
      <template #header>
        <span class="panel-title">全景云游</span>
        <span class="count">{{ panoramas.length }} 个实训室</span>
      </template>
      <el-empty v-if="!loading && panoramas.length === 0" description="暂未发布全景资源" />
      <el-row v-else :gutter="16">
        <el-col v-for="item in panoramas" :key="item.id" :xs="24" :sm="12" :md="8">
          <div class="pano-card">
            <div class="pano-cover" :style="coverStyle(item)">
              <span class="pano-badge">720°</span>
            </div>
            <div class="pano-body">
              <h3 class="pano-title">{{ item.name }}</h3>
              <p class="pano-sub">{{ item.labName || '未关联实训室' }}</p>
              <p v-if="item.description" class="pano-desc">{{ item.description }}</p>
              <div class="pano-actions">
                <el-button type="primary" @click="open(item)">进入云游</el-button>
                <el-button v-if="isHttp(item.panoramaUrl)" link @click="openExternal(item)">
                  新窗口打开
                </el-button>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="active?.name || '全景云游'"
      width="82%"
      top="6vh"
      destroy-on-close
    >
      <div class="pano-dialog">
        <PanoramaViewer :item="active" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { mediaApi } from '@/api/media'
import { catalogApi } from '@/api/catalog'
import PanoramaViewer from '@/components/media/PanoramaViewer.vue'
import type { OpenDayItem, PanoramaItem } from '@/types'

const loading = ref(false)
const panoramas = ref<PanoramaItem[]>([])
const openDays = ref<OpenDayItem[]>([])
const active = ref<PanoramaItem | null>(null)
const dialogVisible = ref(false)

function isHttp(url: string) {
  return /^https?:\/\//i.test(url)
}

function coverStyle(item: PanoramaItem) {
  return item.coverUrl ? { backgroundImage: `url(${item.coverUrl})` } : {}
}

function open(item: PanoramaItem) {
  active.value = item
  dialogVisible.value = true
}

function openExternal(item: PanoramaItem) {
  window.open(item.panoramaUrl, '_blank', 'noopener')
}

onMounted(async () => {
  loading.value = true
  try {
    const [panoList, days] = await Promise.all([
      mediaApi.panoramas(),
      catalogApi.openDays().catch(() => [] as OpenDayItem[])
    ])
    panoramas.value = panoList
    openDays.value = days
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.stage-tag {
  margin-bottom: 10px;
}

.panel {
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

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schedule-item {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 13px;
}

.date {
  font-weight: 600;
}

.note {
  flex-basis: 100%;
  font-size: 12px;
}

.pano-card {
  border: 1px solid var(--lm-border);
  border-radius: var(--lm-radius);
  overflow: hidden;
  margin-bottom: 16px;
  background: #fff;
}

.pano-cover {
  position: relative;
  height: 150px;
  background: linear-gradient(135deg, #1d4ed8, #38bdf8);
  background-size: cover;
  background-position: center;
}

.pano-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.65);
  color: #fff;
  font-size: 12px;
}

.pano-body {
  padding: 14px 16px 16px;
}

.pano-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
}

.pano-sub {
  margin: 0;
  color: var(--lm-text-secondary);
  font-size: 12px;
}

.pano-desc {
  margin: 8px 0 0;
  color: var(--lm-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.pano-actions {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.pano-dialog {
  height: 68vh;
}
</style>
