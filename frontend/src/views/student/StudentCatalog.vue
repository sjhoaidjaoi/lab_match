<template>
  <PageStub
    stage="阶段①—② · 宣讲与开放日"
    title="公告与导师目录"
    description="展示集中宣讲、开放日安排与导师目录，帮助学生了解方向与名额后形成意向。"
    :tasks="['展示公告列表与详情（富文本）', '展示开放日场次、地点与答疑安排', '展示实训室/导师目录：方向、剩余名额、培养与考核']"
    :apis="['GET /api/announcements', 'GET /api/open-day-plans', 'GET /api/labs、GET /api/mentors']"
    owner="学生端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
