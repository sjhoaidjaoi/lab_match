<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h2>轮次配置</h2>
        <p class="subtitle">配置各轮时间窗与四维评分权重</p>
      </div>
      <el-button type="primary" @click="openCreate">新建轮次</el-button>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="rounds" stripe>
        <el-table-column prop="roundNo" label="轮次" width="70" />
        <el-table-column prop="roundName" label="名称" min-width="130" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag[row.status]">{{ statusText[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="填报窗口" min-width="180">
          <template #default="{ row }">
            <div>{{ row.applyStart }}</div>
            <div class="muted">{{ row.applyEnd }}</div>
          </template>
        </el-table-column>
        <el-table-column label="面试窗口" min-width="180">
          <template #default="{ row }">
            <div>{{ row.interviewStart }}</div>
            <div class="muted">{{ row.interviewEnd }}</div>
          </template>
        </el-table-column>
        <el-table-column label="确认截止" width="170">
          <template #default="{ row }">{{ row.nominationEnd }}</template>
        </el-table-column>
        <el-table-column label="内部调剂窗口" min-width="190">
          <template #default="{ row }">
            <template v-if="row.innerAdjustStart && row.innerAdjustEnd">
              <div>{{ row.innerAdjustStart }}</div>
              <div class="muted">{{ row.innerAdjustEnd }}</div>
            </template>
            <span v-else class="muted">未配置</span>
          </template>
        </el-table-column>
        <el-table-column label="权重" width="150">
          <template #default="{ row }">
            {{ row.weightAttitude }} / {{ row.weightLogic }} /
            {{ row.weightProgramming }} / {{ row.weightTime }}
          </template>
        </el-table-column>
        <el-table-column label="锁定" width="80">
          <template #default="{ row }">
            <el-tag :type="row.locked === 1 ? 'warning' : 'info'">
              {{ row.locked === 1 ? '已锁定' : '未锁定' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="350" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              :disabled="row.locked === 1"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === 1 || [2, 3, 4].includes(row.status)"
              link
              :type="row.status === 1 ? 'success' : 'danger'"
              size="small"
              @click="toggleStatus(row)"
            >
              {{ row.status === 1 ? '开启' : '结束' }}
            </el-button>
            <el-button link type="primary" size="small" @click="openSnapshot(row)">
              快照
            </el-button>
            <el-button
              link
              type="primary"
              size="small"
              :loading="issuingId === row.id"
              @click="handleIssue(row)"
            >
              手动签发
            </el-button>
            <el-button
              link
              :type="row.locked === 1 ? 'warning' : 'danger'"
              size="small"
              :disabled="row.locked === 0 && !isLastRound(row)"
              @click="openLock(row)"
            >
              {{ row.locked === 1 ? '解锁' : '锁定' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <RoundConfigDialog v-model="dialogVisible" :round="editingRound" @saved="loadRounds" />
    <SnapshotDialog v-model="snapshotVisible" :round="actionRound" @generated="loadRounds" />
    <RoundLockDialog v-model="lockVisible" :round="actionRound" @done="loadRounds" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listRounds, issueRound, updateRoundStatus } from '@/api/adminRound'
import RoundConfigDialog from '@/components/RoundConfigDialog.vue'
import SnapshotDialog from '@/components/SnapshotDialog.vue'
import RoundLockDialog from '@/components/RoundLockDialog.vue'
import type { RoundListItem } from '@/types/basic'

const loading = ref(false)
const rounds = ref<RoundListItem[]>([])
const dialogVisible = ref(false)
const editingRound = ref<RoundListItem | null>(null)
const snapshotVisible = ref(false)
const lockVisible = ref(false)
const actionRound = ref<RoundListItem | null>(null)
const issuingId = ref<number | null>(null)

const lastRoundNo = computed(() =>
  rounds.value.reduce((max, item) => Math.max(max, item.roundNo), 0)
)

function isLastRound(round: RoundListItem): boolean {
  return round.roundNo === lastRoundNo.value
}

function openSnapshot(round: RoundListItem) {
  actionRound.value = round
  snapshotVisible.value = true
}

function openLock(round: RoundListItem) {
  actionRound.value = round
  lockVisible.value = true
}

const statusText: Record<number, string> = {
  1: '未开始',
  2: '填报中',
  3: '面试中',
  4: '拟录取确认中',
  5: '已完成'
}

const statusTag: Record<number, 'info' | 'primary' | 'warning' | 'success'> = {
  1: 'info',
  2: 'primary',
  3: 'warning',
  4: 'warning',
  5: 'success'
}

async function loadRounds() {
  loading.value = true
  try {
    rounds.value = await listRounds()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingRound.value = null
  dialogVisible.value = true
}

function openEdit(round: RoundListItem) {
  editingRound.value = round
  dialogVisible.value = true
}

async function toggleStatus(round: RoundListItem) {
  if (round.locked === 1) {
    ElMessage.warning('批次已锁定，不可修改轮次状态')
    return
  }
  const nextStatus = round.status === 1 ? 2 : 5
  const actionText = round.status === 1 ? '开启' : '结束'
  try {
    await ElMessageBox.confirm(`确定${actionText}「${round.roundName}」吗？`, '提示', {
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await updateRoundStatus(round.id, nextStatus)
    ElMessage.success(`已${actionText}`)
    await loadRounds()
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function handleIssue(round: RoundListItem) {
  try {
    await ElMessageBox.confirm(
      `确定对「${round.roundName}」手动签发吗？将按学生维度重新生成录取记录，重复执行结果一致。`,
      '手动签发',
      { type: 'warning' }
    )
  } catch {
    return
  }
  issuingId.value = round.id
  try {
    await issueRound(round.id)
    ElMessage.success('签发完成')
    await loadRounds()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    issuingId.value = null
  }
}

onMounted(loadRounds)
</script>

<style scoped>
.admin-page {
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

.muted {
  color: #909399;
  font-size: 12px;
}
</style>
