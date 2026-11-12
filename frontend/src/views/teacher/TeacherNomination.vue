<template>
  <PageStub
    stage="阶段④—⑤ · 名单"
    title="拟录取名单"
    description="编排拟录取名单并提交，系统校验名额上限；提交后冻结。"
    :tasks="['拟录取排序', '名额超限校验', '提交冻结与撤回规则']"
    :apis="['GET /api/mentor-lists', 'POST /api/mentor-lists/submit', 'POST /api/mentor-lists/{id}/reorder']"
    owner="导师端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
