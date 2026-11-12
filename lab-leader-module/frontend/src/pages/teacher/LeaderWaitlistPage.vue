<template>
  <div class="leader-waitlist-page">
    <div class="page-header">
      <div>
        <h2>本室递补名单</h2>
        <p class="subtitle">查看本室全部导师的递补顺位；手工调整需填写理由并留痕</p>
      </div>
      <el-tag type="warning" size="large">共 {{ items.length }} 人</el-tag>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="items" stripe>
        <el-table-column prop="mentorName" label="导师" width="120" />
        <el-table-column prop="rankNo" label="顺位" width="80" />
        <el-table-column prop="studentNo" label="学号" width="130" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column label="总分" width="90">
          <template #default="{ row }">{{ formatScore(row.totalScore) }}</template>
        </el-table-column>
        <el-table-column label="标识" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.isManual === 1" type="warning" size="small">已手工调整</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="applyStatusText" label="调剂状态" width="110" />
        <el-table-column label="调整理由" min-width="160">
          <template #default="{ row }">{{ row.adjustReason || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openAdjust(row)">调整顺位</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && items.length === 0" description="本室暂无递补名单" />
    </el-card>

    <el-dialog v-model="dialogVisible" title="调整递补顺位" width="460px">
      <el-form label-width="90px">
        <el-form-item label="导师">
          <span>{{ current?.mentorName }}</span>
        </el-form-item>
        <el-form-item label="学生">
          <span>{{ current?.studentNo }} {{ current?.studentName }}</span>
        </el-form-item>
        <el-form-item label="新顺位" required>
          <el-input-number v-model="newRank" :min="1" :max="999" />
        </el-form-item>
        <el-form-item label="调整理由" required>
          <el-input v-model="reason" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="必填，将写入操作日志" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adjustLeaderWaitlistRank, listLeaderWaitlist } from '@/api/leaderWaitlist'
import { getCurrentRound } from '@/api/public'
import type { LeaderWaitlistItem } from '@/types/nomination'

const loading = ref(false)
const saving = ref(false)
const roundId = ref<number | null>(null)
const items = ref<LeaderWaitlistItem[]>([])

const dialogVisible = ref(false)
const current = ref<LeaderWaitlistItem | null>(null)
const newRank = ref(1)
const reason = ref('')

function formatScore(value: number | null): string {
  return value === null ? '-' : value.toFixed(2)
}

async function loadData() {
  loading.value = true
  try {
    const round = await getCurrentRound()
    roundId.value = round?.id ?? null
    items.value = await listLeaderWaitlist(roundId.value ?? undefined)
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openAdjust(row: LeaderWaitlistItem) {
  current.value = row
  newRank.value = row.rankNo
  reason.value = ''
  dialogVisible.value = true
}

async function handleSave() {
  if (!roundId.value) {
    ElMessage.warning('当前无选拔轮次')
    return
  }
  if (!current.value) {
    return
  }
  if (!reason.value.trim()) {
    ElMessage.warning('请填写调整理由')
    return
  }
  saving.value = true
  try {
    await adjustLeaderWaitlistRank({
      roundId: roundId.value,
      items: [{ waitlistId: current.value.id, rankNo: newRank.value }],
      adjustReason: reason.value.trim()
    })
    ElMessage.success('递补顺位已调整')
    dialogVisible.value = false
    await loadData()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.leader-waitlist-page {
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
</style>
