<template>
  <PageStub
    stage="阶段⑧ · 公示入组"
    title="公示与异议"
    description="查看脱敏公示名单，核对本人结果并在公示期内提交异议。"
    :tasks="['脱敏公示名单展示', '异议提交与状态跟踪', '最终入组信息确认']"
    :apis="['GET /api/publications/current', 'GET /api/publications/{id}/items', 'POST /api/objections']"
    owner="学生端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
