<template>
  <div v-loading="loading" class="dashboard-page">
    <div class="page-header">
      <div>
        <h2>你好，{{ userStore.displayName }}</h2>
        <p v-if="dashboard?.round" class="subtitle">
          第 {{ dashboard.round.roundNo }} 轮 · {{ dashboard.round.roundName }}
        </p>
      </div>
      <el-tag v-if="dashboard?.round" type="primary">{{ dashboard.round.statusText }}</el-tag>
    </div>

    <el-card v-if="dashboard?.round" shadow="never" class="round-card">
      <span class="round-name">当前阶段：{{ dashboard.round.statusText }}</span>
      <span class="deadline">{{ countdownText }}</span>
    </el-card>

    <section>
      <div class="section-title">待办事项</div>
      <div v-if="todo.length > 0" class="todo-grid">
        <el-card v-for="item in todo" :key="item.type" shadow="hover" class="todo-card">
          <h3>{{ item.text }}</h3>
          <p class="count">共 {{ item.count }} 项</p>
          <el-button type="primary" plain @click="go(item.target)">去处理</el-button>
        </el-card>
      </div>
      <el-empty v-else description="当前没有待办" :image-size="80" />
    </section>

    <section>
      <div class="section-title">我的填报摘要</div>
      <el-card shadow="never">
        <template v-if="dashboard?.intentionSummary">
          <div class="summary-head">
            <el-tag :type="dashboard.intentionSummary.status === 2 ? 'success' : 'info'" size="small">
              {{ dashboard.intentionSummary.status === 2 ? '已提交' : '草稿' }}
            </el-tag>
            <el-tag :type="dashboard.intentionSummary.acceptInnerAdjust === 1 ? 'success' : 'info'" size="small">
              {{ dashboard.intentionSummary.acceptInnerAdjust === 1 ? '服从室内部调剂' : '不服从室内部调剂' }}
            </el-tag>
            <el-tag :type="dashboard.intentionSummary.acceptCrossAdjust === 1 ? 'success' : 'info'" size="small">
              {{ dashboard.intentionSummary.acceptCrossAdjust === 1 ? '服从全院调剂' : '不服从全院调剂' }}
            </el-tag>
          </div>
          <div class="intention-grid">
            <div v-for="index in 3" :key="index" class="intention-slot">
              <template v-if="intentionItems[index - 1]">
                <div class="mentor-name">{{ intentionItems[index - 1].mentorName }}</div>
                <div class="lab-name">{{ intentionItems[index - 1].labName }}</div>
              </template>
              <el-button v-else link type="primary" @click="go('/student/intention')">
                + 添加意向
              </el-button>
            </div>
          </div>
        </template>
        <el-empty v-else description="尚未填报意向" :image-size="80">
          <el-button type="primary" @click="go('/student/intention')">去填报意向</el-button>
        </el-empty>
      </el-card>
    </section>

    <section>
      <div class="section-title-row">
        <span class="section-title">最近通知</span>
        <el-button link type="primary" @click="go('/student/notices')">查看全部</el-button>
      </div>
      <el-card shadow="never">
        <ul v-if="notices.length > 0" class="notice-list">
          <li v-for="item in notices" :key="item.id">
            <span class="dot" :class="{ unread: item.isRead === 0 }"></span>
            <span class="notice-title">{{ item.title }}</span>
            <span class="notice-time">{{ formatTime(item.gmtCreate) }}</span>
          </li>
        </ul>
        <el-empty v-else description="暂无通知" :image-size="60" />
      </el-card>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getStudentDashboard } from '@/api/dashboard'
import { listMyNotices } from '@/api/notice'
import { useUserStore } from '@/store/user'
import { formatCountdown } from '@/utils/countdown'
import type { StudentDashboard } from '@/types/dashboard'
import type { NoticeItem } from '@/types/notice'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const dashboard = ref<StudentDashboard | null>(null)
const notices = ref<NoticeItem[]>([])

const todo = computed(() => dashboard.value?.todo ?? [])
const intentionItems = computed(() => dashboard.value?.intentionSummary?.items ?? [])
const countdownText = computed(() => formatCountdown(dashboard.value?.round?.countdownSeconds ?? 0))

function go(target?: string) {
  if (target) {
    router.push(target)
  }
}

async function loadData() {
  loading.value = true
  try {
    const [dashboardData, noticePage] = await Promise.all([
      getStudentDashboard(),
      listMyNotices({ pageNum: 1, pageSize: 5 })
    ])
    dashboard.value = dashboardData
    notices.value = noticePage.list
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function formatTime(value: string): string {
  return value.replace('T', ' ').slice(0, 16)
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
  font-size: 13px;
  color: #909399;
}

.section-title {
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title-row .section-title {
  margin-bottom: 0;
}

.todo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.todo-card h3 {
  margin: 0 0 10px;
  font-size: 17px;
}

.todo-card .count {
  margin: 0 0 16px;
  font-size: 13px;
  color: #909399;
}

.summary-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.intention-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.intention-slot {
  min-height: 88px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
}

.mentor-name {
  font-size: 15px;
  font-weight: 600;
}

.lab-name {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
}

.notice-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.notice-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f2f5;
}

.notice-list li:last-child {
  border-bottom: none;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dcdfe6;
}

.dot.unread {
  background: #f56c6c;
}

.notice-title {
  flex: 1;
  font-size: 14px;
}

.notice-time {
  font-size: 12px;
  color: #909399;
}
</style>
