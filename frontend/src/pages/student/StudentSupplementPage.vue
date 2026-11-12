<template>
  <div class="supplement-page">
    <div class="page-header">
      <div>
        <h2>补录填报</h2>
        <p class="subtitle">补录轮教师可直接录入，无需面试；每轮仅可填报 1 个志愿</p>
      </div>
      <el-tag type="warning" size="large">
        第 {{ round?.roundNo ?? 2 }} 轮补录 · 剩余名额 {{ remainCount }} 个
      </el-tag>
    </div>

    <el-alert type="info" :closable="false" show-icon>
      <template #title>
        仅展示仍有剩余名额的导师；可重复申报第一轮面试过的实训室，提交前请确认志愿。
      </template>
    </el-alert>

    <el-card shadow="never">
      <el-table
        v-loading="loading"
        :data="mentors"
        row-key="mentorId"
        stripe
        @row-click="handleRowSelect"
      >
        <el-table-column width="60">
          <template #default="{ row }">
            <el-radio
              :model-value="selectedId"
              :label="row.mentorId"
              :disabled="row.remainQuota <= 0 || submitted"
              @change="selectedId = row.mentorId"
            >
              <span />
            </el-radio>
          </template>
        </el-table-column>
        <el-table-column prop="mentorName" label="导师" width="130" />
        <el-table-column prop="title" label="职称" width="110" />
        <el-table-column prop="labName" label="所属实训室" width="180" />
        <el-table-column prop="researchDirection" label="研究方向" min-width="200" />
        <el-table-column label="剩余名额" width="110">
          <template #default="{ row }">
            <el-tag :type="row.remainQuota > 0 ? 'success' : 'info'">
              {{ row.remainQuota > 0 ? row.remainQuota : '已满' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <div class="footer-actions">
      <span class="hint">当前选择：{{ selectedName || '未选择' }}</span>
      <el-button type="primary" :loading="submitting" :disabled="!selectedId || submitted" @click="handleSubmit">
        {{ submitted ? '已提交补录志愿' : '提交补录志愿' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMyIntention, saveMyIntention } from '@/api/intention'
import { getCurrentRound } from '@/api/public'
import { listSupplementMentors } from '@/api/supplement'
import type { SupplementMentor } from '@/types/reallocation'
import type { CurrentRound } from '@/types/student'

const loading = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const round = ref<CurrentRound | null>(null)
const mentors = ref<SupplementMentor[]>([])
const selectedId = ref<number | null>(null)

const remainCount = computed(() =>
  mentors.value.reduce((total, item) => total + Math.max(item.remainQuota, 0), 0)
)
const selectedName = computed(
  () => mentors.value.find((item) => item.mentorId === selectedId.value)?.mentorName ?? ''
)

async function loadMentors() {
  loading.value = true
  try {
    const [roundData, mentorPage, intention] = await Promise.all([
      getCurrentRound(),
      listSupplementMentors(),
      getMyIntention()
    ])
    round.value = roundData
    mentors.value = mentorPage.list
    if (intention) {
      selectedId.value = intention.items[0]?.mentorId ?? null
      submitted.value = intention.status === 2
    }
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function handleRowSelect(row: SupplementMentor) {
  if (submitted.value || row.remainQuota <= 0) {
    return
  }
  selectedId.value = row.mentorId
}

async function handleSubmit() {
  if (!selectedId.value) {
    ElMessage.warning('请选择 1 个补录志愿')
    return
  }
  if (!round.value) {
    ElMessage.warning('当前无补录轮次')
    return
  }
  try {
    await ElMessageBox.confirm('补录轮仅可填报 1 个志愿，提交后不可修改，确认提交？', '提交补录志愿', {
      type: 'warning'
    })
  } catch {
    return
  }
  submitting.value = true
  try {
    await saveMyIntention({
      roundId: round.value.id,
      items: [{ mentorId: selectedId.value }],
      acceptInnerAdjust: 0,
      acceptCrossAdjust: 0,
      poolConsent: 0,
      submit: 1
    })
    submitted.value = true
    ElMessage.success('补录志愿已提交')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    submitting.value = false
  }
}

onMounted(loadMentors)
</script>

<style scoped>
.supplement-page {
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

.footer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.hint {
  font-size: 13px;
  color: #606266;
}
</style>
