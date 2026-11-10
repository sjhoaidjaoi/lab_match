<template>
  <PageStub
    stage="阶段④ · 面试考核"
    title="评分与评语"
    description="查看学生问卷作答，按四维评分并填写评语。"
    :tasks="['四维评分（态度/逻辑/编码/投入）', '评语填写', '评分留痕与修改窗口']"
    :apis="['GET /api/interviews/mentor/todo', 'GET /api/interviews/{id}', 'POST /api/interviews/{id}/score']"
    owner="导师端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
