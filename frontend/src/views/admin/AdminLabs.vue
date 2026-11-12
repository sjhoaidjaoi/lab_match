<template>
  <PageStub
    stage="阶段①—② · 基础数据"
    title="实训室档案"
    description="维护实训室档案、开放日安排与负责人绑定。"
    :tasks="['实训室增删改查', '开放日安排维护', '负责人绑定']"
    :apis="['GET /api/labs', 'GET /api/open-day-plans', 'POST /api/labs (待新增)']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
