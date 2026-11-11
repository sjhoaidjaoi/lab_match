<template>
  <div class="home">
    <section class="hero">
      <h1>学生实训室进组选拔平台</h1>
      <p class="subtitle">统一填报、公开面试、透明确认，让每一次进组选择都有据可依。</p>
      <div class="actions">
        <router-link to="/student/login">
          <el-button type="primary" size="large">学生登录</el-button>
        </router-link>
        <router-link to="/teacher/login">
          <el-button size="large">教师登录</el-button>
        </router-link>
        <router-link to="/admin/login">
          <el-button size="large">管理员登录</el-button>
        </router-link>
      </div>
    </section>

    <section class="cards">
      <el-card v-for="entry in entries" :key="entry.title" shadow="hover" class="entry-card">
        <h3>{{ entry.title }}</h3>
        <p>{{ entry.description }}</p>
        <router-link :to="entry.to" class="entry-link">{{ entry.action }}</router-link>
      </el-card>
    </section>
  </div>
</template>

<script setup lang="ts">
const entries = [
  {
    title: '学生端',
    description: '完善档案、填报意向、查看面试安排与录取结果。',
    to: '/student/login',
    action: '进入学生端'
  },
  {
    title: '教师端',
    description: '查看本室报名、参与评分、提交拟录取与维护递补顺位。',
    to: '/teacher/login',
    action: '进入教师端'
  },
  {
    title: '管理端',
    description: '维护账号与实训室、配置轮次、统筹调剂与公示归档。',
    to: '/admin/login',
    action: '进入管理端'
  }
]
</script>

<style scoped>
.home {
  max-width: 1100px;
  margin: 0 auto;
  padding: 64px 24px;
}

.hero {
  text-align: center;
  padding: 48px 24px 56px;
}

.hero h1 {
  margin: 0;
  font-size: 36px;
  color: #1f2d3d;
}

.subtitle {
  margin: 16px 0 32px;
  font-size: 16px;
  color: #606266;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.entry-card h3 {
  margin: 0 0 12px;
  font-size: 18px;
}

.entry-card p {
  min-height: 48px;
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.7;
  color: #606266;
}

.entry-link {
  font-size: 14px;
  color: #409eff;
}

@media (max-width: 900px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
