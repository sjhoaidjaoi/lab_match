<template>
  <PageStub
    stage="阶段⑤ · 确认"
    title="确认总览"
    description="查看全院 Offer 状态、确认率与异常情况。"
    :tasks="['Offer 状态统计', '确认率与放弃率', '超时自动处理']"
    :apis="['GET /api/offers', 'POST /api/offers/issue', 'GET /api/cycles/current']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
