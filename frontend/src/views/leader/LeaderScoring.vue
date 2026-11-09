<template>
  <PageStub
    stage="阶段④ · 评分"
    title="评分汇总"
    description="汇总本室各导师评分进度与结果，负责人只读。"
    :tasks="['评分进度看板', '缺失评分提醒', '评分分布查看']"
    :apis="['GET /api/interviews/mentor/todo', 'GET /api/mentor-lists', 'GET /api/labs/{id}']"
    owner="负责人端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
