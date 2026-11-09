<template>
  <PageStub
    stage="阶段⑧ · 公示"
    title="公示管理"
    description="生成脱敏名单并发布公示，公示期满锁定最终名单。"
    :tasks="['生成公示名单（脱敏）', '发布与公示计时', '锁定最终名单并写入入组']"
    :apis="['POST /api/publications', 'POST /api/publications/{id}/publish', 'POST /api/publications/{id}/lock']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
