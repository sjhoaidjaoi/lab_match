<template>
  <PageStub
    stage="阶段③—④ · 报名与初选"
    title="报名学生"
    description="查看选择本人的学生、调剂同意范围与个人陈述，完成初选。"
    :tasks="['按意向筛选报名学生', '查看学生材料（记录访问理由）', '标记初选通过/淘汰']"
    :apis="['GET /api/interviews/mentor/todo', 'GET /api/mentor-lists', 'GET /api/labs/{id}']"
    owner="导师端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
