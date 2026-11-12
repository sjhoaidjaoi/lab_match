<template>
  <PageStub
    stage="阶段⑤ · 递补"
    title="递补顺位"
    description="维护递补学生顺位；有人放弃时按顺位自动递补。"
    :tasks="['递补顺位调整', '放弃后的自动递补', '顺位变更留痕']"
    :apis="['GET /api/mentor-lists', 'POST /api/mentor-lists/{id}/reorder', 'GET /api/offers']"
    owner="导师端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
