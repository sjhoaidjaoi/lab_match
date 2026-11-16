<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">补录管理</h2>
      <p class="page-desc">查看本实训室内部调剂候选学生与本室调剂记录；补录由实训室组长统筹，教师配合完成面试与信息核对。</p>
    </div>

    <el-card v-if="!labId" shadow="never">
      <el-empty description="未绑定实训室" />
    </el-card>

    <div v-else v-loading="loading">
      <el-alert
        class="tip"
        type="info"
        :closable="false"
        show-icon
        title="补录工作由实训室组长统筹安排，教师负责配合完成候选学生的面试评分与信息核对。"
      />

      <el-card shadow="never" class="block">
        <template #header><span>内部调剂候选学生</span></template>
        <el-table :data="candidates" stripe empty-text="暂无内部调剂候选学生">
          <el-table-column prop="studentNumber" label="学号" width="130" />
          <el-table-column prop="studentName" label="姓名" width="110" />
          <el-table-column label="面试状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.interviewStatus)" effect="light">
                {{ row.interviewStatus ? INTERVIEW_STATUS_LABELS[row.interviewStatus] || row.interviewStatus : '未面试' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="学习态度" width="95" align="center">
            <template #default="{ row }">{{ row.attitudeScore ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="逻辑思维" width="95" align="center">
            <template #default="{ row }">{{ row.logicScore ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="编程基础" width="95" align="center">
            <template #default="{ row }">{{ row.programmingScore ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="时间投入" width="95" align="center">
            <template #default="{ row }">{{ row.timeCommitmentScore ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="综合表现" width="95" align="center">
            <template #default="{ row }">{{ row.comprehensiveScore ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="服从内部调剂" width="125" align="center">
            <template #default="{ row }">
              <el-tag :type="row.obeyInternalAdjustment ? 'success' : 'info'" effect="plain">
                {{ row.obeyInternalAdjustment ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="服从全院调剂" width="125" align="center">
            <template #default="{ row }">
              <el-tag :type="row.obeyCollegeAdjustment ? 'success' : 'info'" effect="plain">
                {{ row.obeyCollegeAdjustment ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="是否可调剂" width="115" align="center">
            <template #default="{ row }">
              <el-tag :type="row.eligible ? 'success' : 'danger'" effect="plain">
                {{ row.eligible ? '可调剂' : '不可调剂' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header><span>本室调剂记录</span></template>
        <el-table :data="adjustments" stripe empty-text="暂无调剂记录">
          <el-table-column prop="studentName" label="学生" width="120" />
          <el-table-column label="调剂类型" width="140" align="center">
            <template #default="{ row }">
              {{ ADJUSTMENT_TYPE_LABELS[row.adjustmentType] || row.adjustmentType }}
            </template>
          </el-table-column>
          <el-table-column prop="targetLabName" label="目标实训室" min-width="180" />
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" effect="light">
                {{ ADJUSTMENT_STATUS_LABELS[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="原因" min-width="200">
            <template #default="{ row }">{{ row.reason || '—' }}</template>
          </el-table-column>
          <el-table-column label="提交时间" width="170">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { labApi, type AdjustmentRow, type LabCandidate } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'
import {
  ADJUSTMENT_STATUS_LABELS,
  ADJUSTMENT_TYPE_LABELS,
  INTERVIEW_STATUS_LABELS,
  formatTime,
  statusTag
} from '../college/shared'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const candidates = ref<LabCandidate[]>([])
const adjustments = ref<AdjustmentRow[]>([])
const loading = ref(false)

async function load() {
  if (!labId.value) return
  loading.value = true
  try {
    const [c, a] = await Promise.all([
      labApi.candidates(labId.value),
      labApi.adjustments(labId.value)
    ])
    candidates.value = c
    adjustments.value = a
  } catch (err) {
    console.error('补录数据加载失败', err)
    ElMessage.error('补录数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.tip { margin-bottom: 14px; }
.block { margin-bottom: 14px; }
</style>
