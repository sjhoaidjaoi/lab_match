<template>
  <PageStub
    stage="阶段⑤ · 确认"
    title="发出的 Offer"
    description="查看本人发出的拟录取通知及学生确认状态。"
    :tasks="['Offer 状态列表', '超时与放弃统计', '多 Offer 择一联动结果']"
    :apis="['GET /api/offers', 'POST /api/offers/issue', 'GET /api/mentor-lists']"
    owner="导师端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
