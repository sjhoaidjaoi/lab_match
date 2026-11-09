<template>
  <PageStub
    stage="阶段⑥ · 补录"
    title="剩余名额"
    description="汇总全院剩余名额，监控补录轮与轮次结算。"
    :tasks="['剩余名额汇总', '补录轮监控', '轮次结算与对账']"
    :apis="['GET /api/vacancies', 'GET /api/rounds/{roundNo}/result', 'GET /api/labs']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
