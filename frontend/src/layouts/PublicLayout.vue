<template>
  <div class="public-layout">
    <header class="public-header">
      <router-link class="brand" to="/labs">学生实训室进组选拔平台</router-link>
      <nav class="nav">
        <router-link to="/labs">实训室</router-link>
        <router-link to="/notices">公告栏</router-link>
        <router-link to="/student/login">学生登录</router-link>
        <router-link to="/teacher/login">教师登录</router-link>
        <router-link to="/admin/login">管理员登录</router-link>
      </nav>
    </header>
    <main class="public-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.public-layout {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.public-header {
  height: 64px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
}

.brand {
  font-size: 18px;
  font-weight: 600;
  color: #1f2d3d;
}

.nav {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #606266;
}

.nav a.router-link-active {
  color: #409eff;
  font-weight: 600;
}

.public-main {
  flex: 1;
}
</style>
