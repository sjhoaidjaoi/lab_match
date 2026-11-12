<template>
  <PageStub
    stage="阶段⑤ · 拟录取确认"
    title="录取确认"
    description="在确认窗口内接受或放弃拟录取通知；超时未确认视为放弃。"
    :tasks="['单 Offer 自动确认、多 Offer 择一', '确认窗口倒计时与超时提示', '确认结果与占用名额反馈']"
    :apis="['GET /api/offers/mine', 'POST /api/offers/{id}/confirm', 'POST /api/offers/{id}/decline']"
    owner="学生端小组"
  />
</template>

<script setup lang="ts">
import PageStub from '@/components/PageStub.vue'
</script>
