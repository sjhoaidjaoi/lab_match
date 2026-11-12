<template>
  <PageStub
    stage="阶段⑥ · 补录"
    title="补录续招"
    description="查看剩余名额，筛选补录学生并提交补录名单。"
    :tasks="['剩余名额查询', '补录学生筛选与面试安排', '补录名单提交']"
    :apis="['GET /api/vacancies', 'GET /api/mentor-lists', 'POST /api/mentor-lists/submit']"
    owner="导师端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
