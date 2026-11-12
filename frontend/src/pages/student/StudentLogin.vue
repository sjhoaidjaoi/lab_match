<template>
  <LoginForm
    :login-type="1"
    title="学生登录"
    account-label="学号"
    account-placeholder="请输入学号"
    redirect="/student"
  />
</template>

<script setup lang="ts">
import LoginForm from '@/components/LoginForm.vue'
</script>
