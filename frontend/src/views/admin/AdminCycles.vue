<template>
  <PageStub
    stage="阶段① · 周期配置"
    title="周期与轮次"
    description="配置选拔周期与三轮时间窗，控制阶段自动切换与发布。"
    :tasks="['周期创建/发布/关闭', '三轮填报-面试-确认时间窗', '阶段自动切换与服务端校验']"
    :apis="['GET /api/cycles', 'GET /api/cycles/current', 'GET /api/cycles/{id}/rounds']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
