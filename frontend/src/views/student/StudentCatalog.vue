<template>
  <section v-loading="loading" class="student-page">
    <RouterLink :to="openDay ? '/student/labs' : '/student/announcement'">
      ← 返回{{ openDay ? '实训室开放日' : '集中宣讲' }}
    </RouterLink>
    <el-alert v-if="failed" title="实训室资料加载失败" type="error" :closable="false"><el-button text @click="load">重试</el-button></el-alert>
    <template v-else-if="lab">
      <header class="student-welcome">
        <p>{{ openDay ? '实训室开放日' : '集中宣讲' }}</p>
        <h1>{{ lab.name }}</h1>
        <p v-if="lab.projectDirection">{{ lab.projectDirection }}</p>
      </header>
      <el-card v-if="!openDay" shadow="never">
        <h2>实训室简介</h2>
        <p class="lab-introduction">{{ lab.description || lab.briefingText || '组长尚未发布简介。' }}</p>
        <p v-if="lab.technologyStack">技术栈 · {{ lab.technologyStack }}</p>
        <p>计划招生 {{ lab.recruitmentQuota }} 人</p>
        <template v-if="lab.description && lab.briefingText && lab.briefingText.trim() !== lab.description.trim()">
          <h2>宣讲介绍</h2>
          <p class="lab-introduction">{{ lab.briefingText }}</p>
        </template>
        <template v-if="lab.teachers?.length">
          <h2>指导教师</h2>
          <ul class="student-list"><li v-for="teacher in lab.teachers" :key="teacher.id">
            {{ teacher.name }}<template v-if="teacher.direction"> · {{ teacher.direction }}</template>
            <template v-if="teacher.recruitmentQuota != null"> · 招生 {{ teacher.recruitmentQuota }} 人</template>
          </li></ul>
        </template>
        <BriefingMaterials :lab-id="lab.id" />
      </el-card>
      <el-card shadow="never">
        <h2>{{ openDay ? '云游视频' : '介绍视频' }}</h2>
        <a v-if="video?.videoType === 'LINK' && /^https?:\/\//i.test(video.videoUrl)"
          :href="video.videoUrl" target="_blank" rel="noopener noreferrer">在新窗口观看{{ openDay ? '云游视频' : '介绍视频' }} ↗</a>
        <VideoPlayer v-else-if="video" :item="video" />
        <el-empty :image-size="88" v-else :description="openDay ? '组长尚未发布云游视频' : '组长尚未发布介绍视频'" />
        <p v-if="openDay && lab.panoramicResource && /^https?:\/\//i.test(lab.panoramicResource)">
          <a :href="lab.panoramicResource" target="_blank" rel="noopener noreferrer">打开空间全景 ↗</a>
        </p>
      </el-card>
    </template>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import VideoPlayer from '@/components/media/VideoPlayer.vue'
import BriefingMaterials from '@/components/media/BriefingMaterials.vue'
import { studentApi, type LabDetail } from '@/api/student'
import type { VideoItem } from '@/types'

const props = defineProps<{ openDay?: boolean }>()
const route = useRoute()
const lab = ref<LabDetail>()
const loading = ref(false)
const failed = ref(false)
const video = computed<VideoItem | undefined>(() => {
  const item = lab.value
  if (!item) return
  const url = props.openDay ? item.tourVideoUrl : item.briefingVideoUrl
  if (!url) return
  return {
    id: item.id, laboratoryId: item.id, labName: item.name, title: props.openDay ? '实训室云游' : '实训室介绍',
    videoType: (props.openDay ? item.tourVideoType : item.briefingVideoType) ?? 'LINK',
    videoUrl: url, sortNo: 1, status: 'PUBLISHED'
  }
})
async function load() {
  const id = Number(route.params.labId)
  if (!id) return
  loading.value = true
  failed.value = false
  lab.value = undefined
  try {
    const detail = await studentApi.labDetail(id)
    if (Number(route.params.labId) === id) lab.value = detail
  } catch {
    if (Number(route.params.labId) === id) failed.value = true
  } finally {
    if (Number(route.params.labId) === id) loading.value = false
  }
}
watch(() => route.params.labId, load, { immediate: true })
</script>
<style scoped>
.lab-introduction { white-space: pre-wrap; }
</style>
