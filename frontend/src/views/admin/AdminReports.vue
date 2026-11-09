<template>
  <PageStub
    stage="通用"
    title="报表统计"
    description="统计报名、录取、名额利用率等指标并导出。"
    :tasks="['报名/录取漏斗', '名额利用率', '按实训室/导师统计与导出']"
    :apis="['GET /api/cycles/current', 'GET /api/labs', 'GET /api/offers']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
