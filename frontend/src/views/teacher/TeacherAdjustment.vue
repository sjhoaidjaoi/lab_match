<template>
  <PageStub
    stage="阶段⑦ · 调剂"
    title="接收调剂"
    description="查看调剂进入本人的学生并确认接收。"
    :tasks="['调剂候选学生', '室内优先顺序展示', '确认接收/拒绝']"
    :apis="['GET /api/adjustment/pools', 'POST /api/adjustment/assign', 'GET /api/notifications/mine']"
    owner="导师端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
