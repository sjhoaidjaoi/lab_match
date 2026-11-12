<template>
  <PageStub
    stage="通用"
    title="账号管理"
    description="导入账号、分配角色、重置密码与禁用账号。"
    :tasks="['账号列表与检索（已通接口）', 'Excel 批量导入与失败明细', '角色分配与负责人提拔']"
    :apis="['GET /api/admin/accounts', 'POST /api/admin/accounts/{id}/reset-password', 'PUT /api/admin/accounts/{id}/status']"
    owner="管理端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
