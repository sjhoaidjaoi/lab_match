<template>
  <div class="admin-dispute-page">
    <div class="page-header">
      <div>
        <h2>异议处理</h2>
        <p class="subtitle">处理结果与意见将推送站内通知给学生；调整录取须选择目标导师</p>
      </div>
      <div class="header-actions">
        <el-select v-model="statusFilter" class="status-select" @change="loadDisputes">
          <el-option label="全部状态" :value="0" />
          <el-option label="待处理" :value="1" />
          <el-option label="处理中" :value="2" />
          <el-option label="已回复" :value="3" />
          <el-option label="已关闭" :value="4" />
        </el-select>
        <el-button @click="loadDisputes">刷新</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="disputes" row-key="id" stripe>
        <el-table-column prop="disputeNo" label="工单号" width="170" />
        <el-table-column label="学生" width="170">
          <template #default="{ row }">{{ row.studentName }}（{{ row.studentNo }}）</template>
        </el-table-column>
        <el-table-column prop="disputeTypeText" label="类型" width="130" />
        <el-table-column prop="publicityTitle" label="公示批次" min-width="210" />
        <el-table-column prop="gmtCreate" label="提交时间" width="170" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="tagType(row.status)" size="small">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 1 || row.status === 2"
              link
              type="primary"
              @click="openHandleDialog(row)"
            >
              处理
            </el-button>
            <span v-else class="done-text">已处理</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && disputes.length === 0" description="暂无异议工单" />
    </el-card>

    <el-dialog v-model="handleVisible" title="处理异议" width="560px">
      <template v-if="current">
        <el-descriptions :column="1" border class="detail">
          <el-descriptions-item label="工单号">{{ current.disputeNo }}</el-descriptions-item>
          <el-descriptions-item label="异议说明">{{ current.content }}</el-descriptions-item>
        </el-descriptions>
        <el-form label-width="90px" class="handle-form">
          <el-form-item label="处理结果" required>
            <el-select v-model="handleResult" class="full-width">
              <el-option
                v-for="(text, value) in HANDLE_RESULT_TEXT"
                :key="value"
                :label="text"
                :value="Number(value)"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="handleResult === 2" label="目标导师" required>
            <el-select v-model="adjustMentorId" class="full-width" placeholder="请选择目标导师">
              <el-option
                v-for="mentor in mentors"
                :key="mentor.id"
                :label="`${mentor.realName} · ${mentor.labName}（剩余 ${mentor.remainQuota}）`"
                :value="mentor.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="处理意见" required>
            <el-input
              v-model="handleOpinion"
              type="textarea"
              :rows="4"
              maxlength="1000"
              show-word-limit
              placeholder="请填写处理依据与结论"
            />
          </el-form-item>
        </el-form>
        <el-alert
          v-if="handleResult === 2"
          type="warning"
          :closable="false"
          show-icon
          title="调整录取将释放原导师名额并生成新的待确认记录，操作会写入日志。"
        />
      </template>
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MockError } from '@/mock/auth'
import { mockMentorList } from '@/mock/basic'
import { HANDLE_RESULT_TEXT, mockAdminDisputes, mockHandleDispute } from '@/mock/publicity'
import type { MentorListItem } from '@/types/basic'
import type { DisputeItem } from '@/types/publicity'

const loading = ref(false)
const submitting = ref(false)
const handleVisible = ref(false)
const statusFilter = ref(0)
const disputes = ref<DisputeItem[]>([])
const current = ref<DisputeItem | null>(null)
const mentors = ref<MentorListItem[]>([])
const handleResult = ref<number>(1)
const handleOpinion = ref('')
const adjustMentorId = ref<number | null>(null)

function tagType(status: number): 'warning' | 'primary' | 'success' | 'info' {
  if (status === 1) {
    return 'warning'
  }
  if (status === 2) {
    return 'primary'
  }
  return status === 3 ? 'success' : 'info'
}

async function loadDisputes() {
  loading.value = true
  try {
    disputes.value = await mockAdminDisputes(statusFilter.value === 0 ? undefined : statusFilter.value)
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '加载异议列表失败')
  } finally {
    loading.value = false
  }
}

async function openHandleDialog(row: DisputeItem) {
  current.value = row
  handleResult.value = 1
  handleOpinion.value = ''
  adjustMentorId.value = null
  try {
    mentors.value = (await mockMentorList()).filter((item) => item.remainQuota > 0)
  } catch {
    mentors.value = []
  }
  handleVisible.value = true
}

async function handleSubmit() {
  if (!current.value) {
    return
  }
  if (!handleOpinion.value.trim()) {
    ElMessage.warning('请填写处理意见')
    return
  }
  if (handleResult.value === 2 && !adjustMentorId.value) {
    ElMessage.warning('请选择目标导师')
    return
  }
  submitting.value = true
  try {
    await mockHandleDispute(current.value.id, {
      handleResult: handleResult.value,
      handleOpinion: handleOpinion.value,
      adjustMentorId: handleResult.value === 2 ? adjustMentorId.value ?? undefined : undefined
    })
    handleVisible.value = false
    ElMessage.success('异议已处理，已通知学生')
    await loadDisputes()
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '处理失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadDisputes)
</script>

<style scoped>
.admin-dispute-page {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-select {
  width: 150px;
}

.done-text {
  font-size: 13px;
  color: #909399;
}

.detail {
  margin-bottom: 16px;
}

.handle-form {
  margin-top: 8px;
}

.full-width {
  width: 100%;
}
</style>
