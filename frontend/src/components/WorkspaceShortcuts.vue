<template>
  <nav class="workspace-actions" aria-label="快捷入口">
    <RouterLink v-for="item in items" :key="item.path" :to="item.path" class="workspace-action">
      <el-icon aria-hidden="true"><component :is="item.icon" /></el-icon>
      {{ item.title }}
      <el-icon class="workspace-arrow" aria-hidden="true"><ArrowRight /></el-icon>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
defineProps<{ items: { path: string; title: string; icon: string }[] }>()
</script>
