<template>
  <PageStub
    stage="阶段④ · 面试"
    title="面试进度"
    description="监控全院面试安排、问卷与评分进度。"
    :tasks="['面试进度总览', '缺失问卷/评分提醒', '名单冻结状态']"
    :apis="['GET /api/interviews/mentor/todo', 'GET /api/mentor-lists', 'GET /api/cycles/current']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
