<template>
  <PageStub
    stage="阶段⑧ · 结果"
    title="本室名单与入组"
    description="查看本室最终录取名单、名额消耗与入组情况。"
    :tasks="['最终名单', '名额消耗统计', '入组确认']"
    :apis="['GET /api/publications/current', 'GET /api/offers', 'GET /api/labs/{id}']"
    owner="负责人端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
