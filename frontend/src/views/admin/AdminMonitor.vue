<template>
  <PageStub
    stage="阶段③ · 全院进度"
    title="全院监控"
    description="实时查看全院填报进度、导师冷热与异常预警。"
    :tasks="['报名总览与同比', '导师冷热榜', '异常预警（0 报名、超额、材料缺失）']"
    :apis="['GET /api/cycles/current', 'GET /api/labs', 'GET /api/mentors']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
