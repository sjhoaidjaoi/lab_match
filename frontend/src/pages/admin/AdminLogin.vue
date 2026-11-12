<template>
  <LoginForm
    :login-type="3"
    title="管理员登录"
    account-label="管理员账号"
    account-placeholder="请输入管理员账号"
    redirect="/admin"
  />
</template>

<script setup lang="ts">
import LoginForm from '@/components/LoginForm.vue'
</script>
