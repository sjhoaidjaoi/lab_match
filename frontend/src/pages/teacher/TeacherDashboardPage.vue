<template>
  <div v-loading="loading" class="dashboard-page">
    <div class="page-header">
      <div>
        <h2>导师工作台</h2>
        <p v-if="dashboard?.round" class="subtitle">
          第 {{ dashboard.round.roundNo }} 轮 · {{ dashboard.round.statusText }}
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
        <div class="stat-label">我的名额</div>
        <div class="stat-value">{{ dashboard.quota }}</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">已拟录取</div>
        <div class="stat-value">{{ dashboard.quotaUsed }}</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">剩余名额</div>
        <div class="stat-value highlight">{{ dashboard.remainQuota }}</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-label">报名人数</div>
        <div v-if="dashboard.applicantVisible === 1" class="stat-value">{{ dashboard.applicantCount }}</div>
        <div v-else class="stat-blind">填报进行中，截止后可见</div>
      </el-card>
    </div>

    <section v-if="dashboard">
      <div class="section-title">待办事项</div>
      <el-card shadow="never">
        <ul class="todo-list">
          <li>
            <span class="todo-text">待评分 {{ dashboard.pendingScoreCount }} 人</span>
            <el-button link type="primary" @click="go('/leader/scoring')">去评分</el-button>
          </li>
          <li>
            <span class="todo-text">待勾选拟录取 {{ dashboard.pendingNomination }} 项</span>
            <el-button link type="primary" @click="go('/teacher/nominations')">去拟录取</el-button>
          </li>
          <li>
            <span class="todo-text">待调整递补顺位 {{ dashboard.pendingWaitlistAdjust }} 项</span>
            <el-button link type="primary" @click="go('/teacher/waitlist')">递补顺位</el-button>
          </li>
        </ul>
      </el-card>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getTeacherDashboard } from '@/api/dashboard'
import { formatCountdown } from '@/utils/countdown'
import type { TeacherDashboard } from '@/types/dashboard'

const router = useRouter()
const loading = ref(false)
const dashboard = ref<TeacherDashboard | null>(null)

const countdownText = computed(() => formatCountdown(dashboard.value?.round?.countdownSeconds ?? 0))

function go(path: string) {
  router.push(path)
}

async function loadData() {
  loading.value = true
  try {
    dashboard.value = await getTeacherDashboard()
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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

.stat-blind {
  margin-top: 12px;
  font-size: 13px;
  color: #e6a23c;
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
