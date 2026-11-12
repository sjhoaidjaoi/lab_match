<template>
  <PageStub
    stage="阶段⑦ · 统筹调剂"
    title="调剂结果"
    description="查看统筹调剂分配结果与优先范围，确认最终去向。"
    :tasks="['调剂范围与同意状态', '分配结果与导师/实训室信息', '谈话安置结果查看']"
    :apis="['GET /api/adjustment/pools', 'GET /api/offers/mine', 'GET /api/notifications/mine']"
    owner="学生端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
