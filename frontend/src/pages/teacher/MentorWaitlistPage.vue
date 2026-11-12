<template>
  <div class="waitlist-page">
    <div class="page-header">
      <div>
        <h2>递补顺位</h2>
        <p class="subtitle">默认按总分降序排列；手工调整需填写理由，操作全程留痕</p>
      </div>
      <el-button type="primary" :loading="saving" @click="handleSave">保存顺位</el-button>
    </div>

    <el-card shadow="never">
      <el-input
        v-model="adjustReason"
        type="textarea"
        :rows="2"
        maxlength="500"
        show-word-limit
        placeholder="手工调整理由（必填），例如：线下约谈后综合判断"
      />
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="items" stripe>
        <el-table-column prop="rankNo" label="排名" width="80" />
        <el-table-column prop="studentNo" label="学号" width="130" />
        <el-table-column prop="studentName" label="姓名" width="110" />
        <el-table-column label="总分" width="100">
          <template #default="{ row }">{{ row.totalScore.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.applyStatus === 1 ? 'warning' : row.applyStatus === 2 ? 'success' : 'info'">
              {{ row.applyStatusText }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="调整标记" min-width="180">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.isManual === 1"
              :content="row.adjustReason || '手工调整'"
              placement="top"
            >
              <el-tag type="warning">已手工调整</el-tag>
            </el-tooltip>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ $index, row }">
            <el-button
              link
              type="primary"
              size="small"
              :disabled="row.applyStatus !== 1 || $index === 0"
              @click="moveUp($index)"
            >
              上移
            </el-button>
            <el-button
              link
              type="primary"
              size="small"
              :disabled="row.applyStatus !== 1 || $index === items.length - 1"
              @click="moveDown($index)"
            >
              下移
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getCurrentRound } from '@/api/public'
import { adjustWaitlistRank, listWaitlist } from '@/api/teacherNomination'
import type { WaitlistItem } from '@/types/nomination'

const loading = ref(false)
const saving = ref(false)
const adjustReason = ref('')
const roundId = ref(0)
const items = ref<WaitlistItem[]>([])

async function loadWaitlist() {
  loading.value = true
  try {
    const [roundData, list] = await Promise.all([getCurrentRound(), listWaitlist()])
    roundId.value = roundData?.id ?? 0
    items.value = list
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function moveUp(index: number) {
  swap(index, index - 1)
}

function moveDown(index: number) {
  swap(index, index + 1)
}

function swap(from: number, to: number) {
  const list = [...items.value]
  const current = list[from]
  const target = list[to]
  if (!current || !target || current.applyStatus !== 1 || target.applyStatus !== 1) {
    return
  }
  list[from] = target
  list[to] = current
  items.value = list.map((item, index) => ({ ...item, rankNo: index + 1 }))
}

async function handleSave() {
  if (!adjustReason.value.trim()) {
    ElMessage.warning('请填写手工调整理由')
    return
  }
  saving.value = true
  try {
    await adjustWaitlistRank({
      roundId: roundId.value,
      items: items.value.map((item) => ({ waitlistId: item.id, rankNo: item.rankNo })),
      adjustReason: adjustReason.value.trim()
    })
    ElMessage.success('顺位已保存并留痕')
    adjustReason.value = ''
    await loadWaitlist()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}

onMounted(loadWaitlist)
</script>

<style scoped>
.waitlist-page {
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
}
</style>
