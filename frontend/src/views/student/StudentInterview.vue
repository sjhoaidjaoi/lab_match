<template>
  <PageStub
    stage="阶段④ · 面试考核"
    title="面试与问卷"
    description="查看面试任务，在限时内完成导师问卷并提交；提交后不可修改。"
    :tasks="['面试任务与导师信息', '限时问卷作答、自动保存与断线续答', '提交确认与完成状态展示']"
    :apis="['GET /api/interviews/mine', 'GET /api/interviews/{id}', 'POST /api/interviews/{id}/submit']"
    owner="学生端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
