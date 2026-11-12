<template>
  <PageStub
    stage="阶段① · 宣讲"
    title="公告管理"
    description="编辑宣讲、开放日与公示公告，控制发布与锁定。"
    :tasks="['公告草稿/审核/发布/锁定', '富文本编辑', '发布后通知推送']"
    :apis="['GET /api/announcements', 'POST /api/announcements (待新增)', 'GET /api/cycles/current']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
