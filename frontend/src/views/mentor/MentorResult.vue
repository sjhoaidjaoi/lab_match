<template>
  <PageStub
    stage="阶段⑧ · 结果"
    title="录取名单"
    description="查看本人最终录取与正式入组名单。"
    :tasks="['最终名单展示', '入组学生信息', '导出名单']"
    :apis="['GET /api/publications/current', 'GET /api/offers', 'GET /api/publications/{id}/items']"
    owner="导师端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
