<template>
  <div class="confirm-center-page">
    <div class="page-header">
      <div>
        <h2>录取待确认中心</h2>
        <p class="subtitle">统一承载拟录取多选一、递补待确认与异议调整待确认，请在截止前完成选择</p>
      </div>
    </div>

    <el-alert
      v-if="pendingItems.length > 1"
      type="warning"
      :closable="false"
      show-icon
      :title="`你有 ${pendingItems.length} 个录取待确认，请选择唯一去向`"
    />

    <el-card v-if="acceptedItem" shadow="never" class="accepted-card">
      <div class="accepted-head">
        <el-tag type="success" size="large">已确认</el-tag>
        <span class="accepted-title">{{ acceptedItem.labName }} · {{ acceptedItem.mentorName }}</span>
      </div>
      <p class="accepted-tip">已接受录取，请等待公示。公示期间如有疑问可提交异议。</p>
    </el-card>

    <el-card v-loading="loading" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="section-title">待确认记录</span>
          <span class="count">共 {{ pendingItems.length }} 条</span>
        </div>
      </template>

      <div v-if="pendingItems.length === 0" class="empty">
        <el-empty description="暂无待确认的录取结果">
          <p class="empty-tip">本轮未录取或已完成选择，若进入补录或调剂将另行通知。</p>
        </el-empty>
      </div>

      <div v-else class="card-list">
        <div v-for="item in pendingItems" :key="item.id" class="offer-card">
          <div class="offer-head">
            <el-tag :type="typeTag(item.pendingType)" :class="{ 'purple-tag': item.pendingType === 3 }">
              {{ item.pendingTypeText }}
            </el-tag>
            <span class="deadline">确认截止：{{ item.confirmDeadline }}</span>
          </div>
          <div class="offer-body">
            <div class="offer-main">
              <div class="lab-name">{{ item.labName }}</div>
              <div class="mentor">导师：{{ item.mentorName }}</div>
              <div class="source">来源：{{ item.sourceTypeText }} · 总分 {{ item.totalScore.toFixed(2) }}</div>
            </div>
            <div class="countdown">
              <span class="countdown-label">剩余</span>
              <span class="countdown-value">{{ formatCountdown(countdown[item.id] ?? 0) }}</span>
            </div>
          </div>
          <div class="offer-actions">
            <el-button
              type="primary"
              :loading="respondingId === item.id"
              @click="handleRespond(item, 'ACCEPT')"
            >
              接受
            </el-button>
            <el-button
              type="danger"
              plain
              :loading="respondingId === item.id"
              @click="handleRespond(item, 'REJECT')"
            >
              拒绝
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getConfirmCenter, respondConfirm } from '@/api/confirmCenter'
import type { ConfirmCenterItem } from '@/types/nomination'

const loading = ref(false)
const respondingId = ref<number | null>(null)
const pendingItems = ref<ConfirmCenterItem[]>([])
const acceptedItem = ref<ConfirmCenterItem | null>(null)
const countdown = reactive<Record<number, number>>({})
const deadlines = reactive<Record<number, number>>({})
let timer: number | undefined

function typeTag(pendingType: number): 'primary' | 'warning' | 'success' | 'info' {
  if (pendingType === 1) {
    return 'primary'
  }
  if (pendingType === 2) {
    return 'warning'
  }
  return 'info'
}

function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(totalSeconds, 0)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(rest)}`
}

async function loadCenter() {
  loading.value = true
  try {
    const result = await getConfirmCenter()
    pendingItems.value = result.items
    for (const item of result.items) {
      countdown[item.id] = item.countdownSeconds
      deadlines[item.id] = Date.now() + item.countdownSeconds * 1000
    }
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

async function handleRespond(item: ConfirmCenterItem, action: 'ACCEPT' | 'REJECT') {
  const isAccept = action === 'ACCEPT'
  try {
    await ElMessageBox.confirm(
      isAccept
        ? `确认接受「${item.labName} · ${item.mentorName}」的录取吗？`
        : '拒绝后不可撤回，确认拒绝？',
      isAccept ? '接受录取' : '拒绝录取',
      { type: isAccept ? 'info' : 'warning' }
    )
  } catch {
    return
  }
  respondingId.value = item.id
  try {
    const result = await respondConfirm(item.id, { action })
    if (result.status === 2) {
      acceptedItem.value = item
      pendingItems.value = []
      ElMessage.success('已接受录取，请等待公示')
    } else {
      pendingItems.value = pendingItems.value.filter((row) => row.id !== item.id)
      ElMessage.success('已拒绝该录取')
    }
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    respondingId.value = null
  }
}

onMounted(async () => {
  await loadCenter()
  timer = window.setInterval(() => {
    for (const key of Object.keys(deadlines)) {
      const id = Number(key)
      countdown[id] = Math.max(0, Math.ceil((deadlines[id] - Date.now()) / 1000))
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) {
    window.clearInterval(timer)
  }
})
</script>

<style scoped>
.confirm-center-page {
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

.card-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.offer-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
}

.offer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.purple-tag {
  --el-tag-bg-color: #f3ecff;
  --el-tag-border-color: #d3b8ff;
  --el-tag-text-color: #7b3fe4;
}

.deadline {
  font-size: 13px;
  color: #909399;
}

.offer-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 14px 0;
}

.lab-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2d3d;
}

.mentor,
.source {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
}

.countdown {
  text-align: right;
}

.countdown-label {
  font-size: 12px;
  color: #909399;
}

.countdown-value {
  display: block;
  margin-top: 4px;
  font-size: 20px;
  font-weight: 600;
  color: #e6a23c;
}

.offer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.accepted-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.accepted-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2d3d;
}

.accepted-tip {
  margin: 12px 0 0;
  font-size: 13px;
  color: #909399;
}

.empty-tip {
  margin: 8px 0 0;
  font-size: 13px;
  color: #909399;
}
</style>
