<template>
  <PageStub
    stage="阶段④ · 面试"
    title="面试排期"
    description="安排本室统一面试场次，避免导师与学生时间冲突。"
    :tasks="['面试场次创建', '导师/学生冲突检测', '面试通知发送']"
    :apis="['GET /api/interviews/mentor/todo', 'GET /api/mentors?labId=', 'POST /api/notifications (待新增)']"
    owner="负责人端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
