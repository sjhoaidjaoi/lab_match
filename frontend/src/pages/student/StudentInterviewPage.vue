<template>
  <div v-loading="loading" class="interview-page">
    <div class="page-header">
      <div>
        <h2>面试安排</h2>
        <p class="subtitle">按“导师 + 场次”分别参加面试，请留意每位导师的安排</p>
      </div>
    </div>

    <el-empty
      v-if="!loading && interviews.length === 0"
      description="暂无面试安排，请等待实训室排期"
    />

    <div v-else class="card-grid">
      <el-card v-for="item in interviews" :key="item.id" shadow="hover" class="interview-card">
        <div class="card-header">
          <span class="session-name">{{ item.sessionName }}</span>
          <el-tag :type="item.status === 2 ? 'success' : item.status === 3 ? 'danger' : 'warning'">
            {{ item.statusText }}
          </el-tag>
        </div>
        <div class="info-row">实训室：{{ item.labName }}</div>
        <div class="info-row">导师：{{ item.mentorName || '-' }}</div>
        <div class="info-row">时间：{{ item.interviewDate }} {{ item.startTime }} - {{ item.endTime }}</div>
        <div class="info-row">地点：{{ item.location }}</div>
        <div class="info-row">面试官：{{ item.interviewers.join('、') || '-' }}</div>
        <div class="note">{{ item.note }}</div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listMyInterviews } from '@/api/interview'
import type { StudentInterview } from '@/types/interview'

const loading = ref(false)
const interviews = ref<StudentInterview[]>([])

async function loadData() {
  loading.value = true
  try {
    interviews.value = await listMyInterviews()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.interview-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.interview-card {
  border-left: 4px solid #409eff;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.session-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2d3d;
}

.info-row {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
}

.note {
  margin-top: 12px;
  padding: 8px 10px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
