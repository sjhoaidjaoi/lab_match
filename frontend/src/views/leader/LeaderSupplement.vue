<template>
  <PageStub
    stage="阶段⑥ · 补录"
    title="本室补录看板"
    description="查看本室剩余名额与补录进展，完成轮次对账。"
    :tasks="['本室剩余名额看板', '补录批次跟踪', '轮次结算对账']"
    :apis="['GET /api/vacancies', 'GET /api/rounds/{roundNo}/result', 'GET /api/labs/{id}']"
    owner="负责人端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
