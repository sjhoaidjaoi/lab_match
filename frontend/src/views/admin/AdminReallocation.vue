<template>
  <PageStub
    stage="阶段⑦ · 调剂"
    title="统筹调剂"
    description="建立调剂池，按 L1→L2→L3 顺序执行统筹调剂与谈话安置。"
    :tasks="['调剂池建立', '三级优先匹配', '直接分配与谈话安置记录']"
    :apis="['GET /api/adjustment/pools', 'POST /api/adjustment/assign', 'GET/POST /api/talk-records']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
