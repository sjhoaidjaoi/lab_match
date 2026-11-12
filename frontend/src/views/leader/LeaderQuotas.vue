<template>
  <PageStub
    stage="阶段① · 名额"
    title="导师与名额"
    description="查看本室导师名单、名额与使用情况，提交名额调整申请。"
    :tasks="['本室导师与名额列表', '名额使用/剩余统计', '名额调整申请']"
    :apis="['GET /api/labs/{id}', 'GET /api/mentors?labId=', 'GET /api/labs']"
    owner="负责人端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
