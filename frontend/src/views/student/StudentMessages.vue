<template>
  <PageStub
    stage="通用"
    title="消息通知"
    description="接收各阶段关键节点提醒与处理结果通知。"
    :tasks="['通知分页列表', '单条/全部已读', '关键节点未读提醒']"
    :apis="['GET /api/notifications/mine', 'POST /api/notifications/{id}/read', 'POST /api/notifications/read-all']"
    owner="学生端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
