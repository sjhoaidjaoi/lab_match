<template>
  <PageStub
    stage="阶段④ · 问卷"
    title="问卷编排"
    description="编排面试问卷，设置题型、必填与限时；面试开始前冻结。"
    :tasks="['题目增删改与排序', '题型/必填/限时配置', '冻结后只读与版本管理']"
    :apis="['GET /api/questionnaires', 'POST /api/questionnaires', 'POST /api/questionnaires/{id}/freeze']"
    owner="导师端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
