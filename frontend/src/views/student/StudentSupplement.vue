<template>
  <PageStub
    stage="阶段⑥ · 分轮补录"
    title="补录填报"
    description="查看剩余名额并参与补录轮报名，复用填报、面试与确认流程。"
    :tasks="['剩余名额实时展示', '补录轮报名与提交', '轮次截止与结果提示']"
    :apis="['GET /api/vacancies', 'GET /api/applications/mine', 'GET /api/interviews/mine']"
    owner="学生端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
