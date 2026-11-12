<template>
  <section class="student-page">
    <h1>{{ lab ? lab.name + ' · 全景云游' : '实训室全景云游' }}</h1>
    <RouterLink :to="lab ? '/student/labs/' + lab.id : '/student/labs'">返回实训室介绍</RouterLink>
    <el-card v-if="lab" shadow="never">
      <PanoramaViewer v-if="panorama" :item="panorama" class="student-panorama" />
      <el-empty v-else description="该实训室暂未配置全景素材" />
      <p>现场设备 · {{ lab.equipment }}</p>
    </el-card>
    <el-empty v-else description="未找到该实训室" />
    <div class="student-actions" aria-label="切换实训室">
      <RouterLink v-for="item in labs.filter(item => item.id !== lab?.id)" :key="item.id"
        :to="'/student/labs/' + item.id + '/tour'">{{ item.name }}</RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PanoramaViewer from '@/components/media/PanoramaViewer.vue'
import { labs, panoramas } from './studentDemo'

const route = useRoute()
const lab = computed(() => labs.find(item => String(item.id) === route.params.labId))
const panorama = computed(() => panoramas.find(item => item.laboratoryId === lab.value?.id))
</script>

<style scoped>
.student-panorama { min-height: 300px; height: 55vh; }
.student-panorama :deep(iframe) { min-height: 300px; height: 50vh; }
</style>
