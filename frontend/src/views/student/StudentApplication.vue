<template>
  <PageStub
    stage="阶段③ · 意向填报"
    title="意向填报"
    description="在填报窗口内选择至多 3 个平行意向，签署三级调剂同意书并提交。"
    :tasks="['平行意向选择（最多 3 个，不分先后）', 'L1/L2/L3 调剂同意书勾选与快照', '草稿保存、提交回执与窗口倒计时']"
    :apis="['GET /api/applications/mine', 'PUT /api/applications/mine', 'POST /api/applications/mine/submit']"
    owner="学生端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
