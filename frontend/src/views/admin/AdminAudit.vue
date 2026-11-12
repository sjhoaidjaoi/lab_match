<template>
  <PageStub
    stage="通用"
    title="审计日志"
    description="检索操作审计与敏感数据访问日志，支持导出。"
    :tasks="['操作审计检索', '敏感访问理由记录', '导出审计报表']"
    :apis="['GET /api/audit-logs', 'GET /api/access-logs', 'GET /api/admin/accounts']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
