<template>
  <div v-loading="loading" class="dashboard-page">
    <div class="page-header">
      <div>
        <h2>全院工作台</h2>
        <p v-if="dashboard?.round" class="subtitle">
          第 {{ dashboard.round.roundNo }} 轮 · {{ dashboard.round.roundName }} · {{ dashboard.round.statusText }}
        </p>
      </div>
      <el-tag v-if="dashboard?.round" type="primary">{{ dashboard.round.statusText }}</el-tag>
    </div>

    <el-card v-if="dashboard?.round" shadow="never" class="round-card">
      <span class="round-name">当前阶段：{{ dashboard.round.statusText }}</span>
      <span class="deadline">{{ countdownText }}</span>
    </el-card>

    <div v-if="dashboard" class="stat-grid">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">实训室数</div>
        <div class="stat-value">{{ dashboard.labCount }}</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">导师数</div>
        <div class="stat-value">{{ dashboard.mentorCount }}</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">学生数</div>
        <div class="stat-value">{{ dashboard.studentCount }}</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">总名额</div>
        <div class="stat-value">{{ dashboard.totalQuota }}</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">已录</div>
        <div class="stat-value">{{ dashboard.quotaUsed }}</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">剩余</div>
        <div class="stat-value highlight">{{ dashboard.remainQuota }}</div>
      </el-card>
    </div>

    <section v-if="dashboard">
      <div class="section-title">待办事项</div>
      <el-card shadow="never">
        <ul v-if="dashboard.todo.length > 0" class="todo-list">
          <li v-for="item in dashboard.todo" :key="item.type">
            <span class="todo-text">{{ item.text }} {{ item.count }} 项</span>
            <el-button link type="primary" @click="go(item.target)">去处理</el-button>
          </li>
        </ul>
        <el-empty v-else description="当前没有待办" :image-size="80" />
      </el-card>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAdminDashboard } from '@/api/dashboard'
import { formatCountdown } from '@/utils/countdown'
import type { AdminDashboard } from '@/types/dashboard'

const router = useRouter()
const loading = ref(false)
const dashboard = ref<AdminDashboard | null>(null)

const countdownText = computed(() => formatCountdown(dashboard.value?.round?.countdownSeconds ?? 0))

function go(target?: string) {
  if (target) {
    router.push(target)
  }
}

async function loadData() {
  loading.value = true
  try {
    dashboard.value = await getAdminDashboard()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.round-card {
  border-left: 4px solid #409eff;
}

.round-name {
  font-size: 15px;
  font-weight: 600;
}

.deadline {
  float: right;
  font-size: 13px;
  color: #909399;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 600;
}

.stat-value.highlight {
  color: #409eff;
}

.section-title {
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
}

.todo-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.todo-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f2f5;
}

.todo-list li:last-child {
  border-bottom: none;
}

.todo-text {
  font-size: 14px;
}
</style>
