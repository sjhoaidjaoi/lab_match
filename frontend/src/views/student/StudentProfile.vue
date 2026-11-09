<template>
  <PageStub
    stage="通用"
    title="个人中心"
    description="维护个人资料与联系方式，修改密码并查看历史回执。"
    :tasks="['个人信息与联系方式维护', '修改密码', '我的报名回执']"
    :apis="['GET /api/auth/me', 'POST /api/auth/change-password', 'GET /api/applications/mine']"
    owner="学生端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
