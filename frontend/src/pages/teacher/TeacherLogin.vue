<template>
  <LoginForm
    :login-type="2"
    title="教师登录"
    account-label="工号"
    account-placeholder="请输入工号"
    redirect="/teacher"
  />
</template>

<script setup lang="ts">
import LoginForm from '@/components/LoginForm.vue'
</script>
