<template>
  <PageStub
    stage="阶段⑦ · 调剂"
    title="本室调剂"
    description="优先完成实训室内部调剂，再与学院同步跨室调剂。"
    :tasks="['室内调剂候选', '生成调剂建议', '与学院同步结果']"
    :apis="['GET /api/adjustment/pools', 'POST /api/adjustment/assign', 'GET /api/notifications/mine']"
    owner="负责人端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
