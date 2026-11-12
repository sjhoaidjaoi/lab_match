<template>
  <PageStub
    stage="阶段⑧ · 异议"
    title="异议处理"
    description="处理公示期异议工单，回复结论并联动通知。"
    :tasks="['工单列表与优先级', '回复与状态流转', '处理结果通知']"
    :apis="['GET /api/objections', 'POST /api/objections/{id}/handle', 'GET /api/notifications/mine']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
