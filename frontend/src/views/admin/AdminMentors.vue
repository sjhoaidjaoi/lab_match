<template>
  <PageStub
    stage="阶段① · 名额配置"
    title="导师与名额"
    description="维护导师档案与名额，发布前生成名额基线快照。"
    :tasks="['导师档案维护', '名额配置与快照', '名额余额校验']"
    :apis="['GET /api/mentors', 'GET /api/labs/{id}', 'POST /api/labs (待新增)']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
