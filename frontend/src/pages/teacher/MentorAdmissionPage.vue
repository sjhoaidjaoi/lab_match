<template>
  <div v-loading="loading" class="mentor-admission-page">
    <div class="page-header">
      <div>
        <h2>我的录取名单</h2>
        <p class="subtitle">
          {{ round?.roundName ? `${round.roundName} · ` : '' }}查看本人录取进度，待确认学生可发送提醒
        </p>
      </div>
      <el-button plain :loading="loading" @click="loadData">刷新</el-button>
    </div>

    <div class="stat-grid">
      <el-card shadow="never">
        <div class="stat-label">个人名额</div>
        <div class="stat-value">{{ summary?.quota ?? 0 }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="stat-label">已确认</div>
        <div class="stat-value success">{{ summary?.confirmedCount ?? 0 }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="stat-label">待确认</div>
        <div class="stat-value warn">{{ summary?.pendingCount ?? 0 }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="stat-label">剩余名额</div>
        <div class="stat-value">{{ summary?.remainQuota ?? 0 }}</div>
      </el-card>
    </div>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="section-title">录取记录</span>
          <span class="count">共 {{ summary?.items.length ?? 0 }} 人</span>
        </div>
      </template>
      <el-table :data="summary?.items ?? []" stripe>
        <el-table-column prop="studentNo" label="学号" width="140" />
        <el-table-column prop="studentName" label="姓名" width="110" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="确认时间" min-width="180">
          <template #default="{ row }">{{ row.confirmTime || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 1"
              link
              type="primary"
              size="small"
              :loading="remindingId === row.id"
              @click="handleRemind(row)"
            >
              发送确认提醒
            </el-button>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && (summary?.items.length ?? 0) === 0" description="暂无录取记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getMyAdmissions, remindAdmission } from '@/api/teacherAdmission'
import { getCurrentRound } from '@/api/public'
import type { TeacherAdmissionItem, TeacherAdmissionSummary } from '@/types/admission'
import type { PublicCurrentRound } from '@/types/public'

const loading = ref(false)
const remindingId = ref<number | null>(null)
const summary = ref<TeacherAdmissionSummary | null>(null)
const round = ref<PublicCurrentRound | null>(null)

function statusTag(status: number): 'success' | 'warning' | 'info' | 'danger' {
  if (status === 2 || status === 3) {
    return 'success'
  }
  if (status === 1) {
    return 'warning'
  }
  if (status === 5) {
    return 'danger'
  }
  return 'info'
}

async function loadData() {
  loading.value = true
  try {
    round.value = await getCurrentRound().catch(() => null)
    summary.value = await getMyAdmissions(round.value?.id)
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

async function handleRemind(row: TeacherAdmissionItem) {
  remindingId.value = row.id
  try {
    await remindAdmission(row.id)
    ElMessage.success('已发送确认提醒')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    remindingId.value = null
  }
}

onMounted(loadData)
</script>

<style scoped>
.mentor-admission-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1f2d3d;
}

.stat-value.success {
  color: #67c23a;
}

.stat-value.warn {
  color: #e6a23c;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
}

.count {
  font-size: 13px;
  color: #909399;
}

.empty-text {
  color: #c0c4cc;
}
</style>
