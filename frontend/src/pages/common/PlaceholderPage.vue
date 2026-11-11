<template>
  <div class="placeholder">
    <h2>{{ title }}</h2>
    <p class="welcome">欢迎，{{ userStore.displayName }}</p>
    <el-empty description="本模块将在后续阶段实现" />
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/store/user'

defineProps<{
  title: string
}>()

const userStore = useUserStore()
</script>

<style scoped>
.placeholder {
  padding: 8px;
}

h2 {
  margin: 0 0 8px;
  font-size: 20px;
}

.welcome {
  margin: 0 0 24px;
  font-size: 14px;
  color: #606266;
}
</style>
