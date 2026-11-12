<template>
  <div class="wrap">
    <el-result icon="warning" title="403 无权访问" sub-title="该页面仅对实训室组长开放，或当前角色无此权限。">
      <template #extra>
        <el-button type="primary" @click="back">返回我的工作台</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

function back() {
  if (auth.role === 'STUDENT') router.replace('/student/dashboard')
  else if (auth.role === 'COLLEGE_ADMIN') router.replace('/admin/dashboard')
  else router.replace('/teacher/dashboard')
}
</script>

<style scoped>
.wrap { min-height: 100%; display: flex; align-items: center; justify-content: center; background: var(--trs-bg); }
</style>
