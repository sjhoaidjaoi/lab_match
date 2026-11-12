<template>
  <PageStub
    stage="阶段④—⑤ · 名单"
    title="名单汇总"
    description="汇总本室导师拟录取与递补名单，校验名额后提交学院。"
    :tasks="['各导师名单汇总', '名额上限校验', '提交学院并冻结']"
    :apis="['GET /api/mentor-lists', 'POST /api/mentor-lists/submit', 'GET /api/labs/{id}']"
    owner="负责人端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
