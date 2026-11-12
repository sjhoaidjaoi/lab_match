<template>
  <PageStub
    stage="阶段③ · 填报监控"
    title="填报进度"
    description="监控本室各导师报名人数与冷热情况，及时提醒。"
    :tasks="['本室报名人数统计', '导师冷热榜', '异常（0 报名/超额）提醒']"
    :apis="['GET /api/labs/{id}', 'GET /api/mentors?labId=', 'GET /api/cycles/current']"
    owner="负责人端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
