<template>
  <div class="leader-mentor-page">
    <div class="page-header">
      <div>
        <h2>本室导师与名额</h2>
        <p class="subtitle">配置本室各导师名额，合计不得超过本室总名额</p>
      </div>
      <div class="quota-summary">
        <span>已分配名额 <strong>{{ quotaSum }}</strong></span>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="mentors" stripe>
        <el-table-column prop="userNo" label="工号" width="120" />
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column prop="title" label="职称" width="100">
          <template #default="{ row }">{{ row.title || '-' }}</template>
        </el-table-column>
        <el-table-column prop="researchDirection" label="研究方向" min-width="160">
          <template #default="{ row }">{{ row.researchDirection || '-' }}</template>
        </el-table-column>
        <el-table-column prop="quota" label="个人名额" width="100" />
        <el-table-column prop="quotaUsed" label="已录" width="90" />
        <el-table-column label="剩余" width="90">
          <template #default="{ row }">{{ Math.max(row.quota - row.quotaUsed, 0) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openQuota(row)">调整名额</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && mentors.length === 0" description="本室暂无导师" />
    </el-card>

    <el-dialog v-model="quotaDialogVisible" title="调整导师名额" width="440px">
      <el-form ref="quotaFormRef" :model="quotaForm" :rules="quotaRules" label-width="90px">
        <el-form-item label="导师">
          <span>{{ quotaForm.realName }}</span>
        </el-form-item>
        <el-form-item label="新名额" prop="quota">
          <el-input-number v-model="quotaForm.quota" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="调整理由" prop="reason">
          <el-input v-model="quotaForm.reason" type="textarea" :rows="3" placeholder="必填，将写入操作日志" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quotaDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleQuota">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { adjustLeaderMentorQuota, listLeaderMentors } from '@/api/leaderMentor'
import type { MentorListItem } from '@/types/basic'

interface MentorQuotaForm {
  id: number
  realName: string
  quota: number
  quotaUsed: number
  reason: string
}

const loading = ref(false)
const saving = ref(false)
const mentors = ref<MentorListItem[]>([])

const quotaDialogVisible = ref(false)
const quotaFormRef = ref<FormInstance>()
const quotaForm = reactive<MentorQuotaForm>({ id: 0, realName: '', quota: 0, quotaUsed: 0, reason: '' })

const quotaSum = computed(() => mentors.value.reduce((sum, mentor) => sum + mentor.quota, 0))

const quotaRules: FormRules<MentorQuotaForm> = {
  quota: [
    { required: true, message: '请输入新名额', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: number, callback: (error?: Error) => void) => {
        if (value < quotaForm.quotaUsed) {
          callback(new Error(`新名额不得小于已占用名额（${quotaForm.quotaUsed} 人）`))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ],
  reason: [{ required: true, message: '请输入调整理由', trigger: 'blur' }]
}

async function loadData() {
  loading.value = true
  try {
    mentors.value = await listLeaderMentors()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openQuota(mentor: MentorListItem) {
  quotaForm.id = mentor.id
  quotaForm.realName = mentor.realName
  quotaForm.quota = mentor.quota
  quotaForm.quotaUsed = mentor.quotaUsed
  quotaForm.reason = ''
  quotaDialogVisible.value = true
}

async function handleQuota() {
  if (!quotaFormRef.value) {
    return
  }
  const valid = await quotaFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }
  saving.value = true
  try {
    await adjustLeaderMentorQuota(quotaForm.id, {
      quota: quotaForm.quota,
      reason: quotaForm.reason.trim()
    })
    ElMessage.success('名额已调整')
    quotaDialogVisible.value = false
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
.leader-mentor-page {
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

.quota-summary {
  display: flex;
  gap: 18px;
  font-size: 13px;
  color: #606266;
}

.quota-summary strong {
  color: #1f2d3d;
}
</style>
