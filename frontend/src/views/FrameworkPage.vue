<template><PageStub :title="title" :description="description" :stage="stage" :tasks="tasks" :apis="[api]"><el-card v-if="media" shadow="never" class="media-panel"><template #header>{{ media === 'tour' ? '全景云游展示容器' : '宣讲视频播放容器' }}</template><div class="media-placeholder"><el-icon><VideoPlay /></el-icon><span>{{ media === 'tour' ? '等待接入确认后的全景素材与播放器' : '等待维护宣讲视频资源地址与封面' }}</span></div></el-card></PageStub></template>
<script setup lang="ts">
import { computed } from 'vue'
import { VideoPlay } from '@element-plus/icons-vue'
import PageStub from '@/components/PageStub.vue'

const props = defineProps<{ title: string; description: string; stage?: string; api: string; media?: 'video' | 'tour' }>()
const tasks = computed(() => [
  '页面布局与权限入口已完成',
  `对接接口：${props.api}`,
  '具体业务规则待学院确认后实现'
])
</script>
<style scoped>.media-panel{margin-top:16px}.media-placeholder{min-height:160px;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;color:#909399;background:#f8fafc;border:1px dashed #cbd5e1}.media-placeholder .el-icon{font-size:34px;color:#409eff}</style>
