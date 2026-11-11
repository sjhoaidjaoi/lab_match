<template>
  <div class="publicity-page">
    <div class="page-header">
      <div>
        <h2>录取名单公示</h2>
        <p class="subtitle">公示期内如对录取结果有异议，可提交异议工单</p>
      </div>
      <el-tag :type="detail?.status === 1 ? 'success' : 'info'" size="large">
        {{ statusText }}
      </el-tag>
    </div>

    <el-card v-loading="loading" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">{{ detail?.title || '暂无可查看的公示' }}</span>
          <span class="countdown">{{ countdownText }}</span>
        </div>
      </template>

      <el-alert type="info" :closable="false" show-icon class="tip">
        <template #title>
          名单中本人信息完整展示，其他学生学号与姓名已脱敏；公示名单不含分数与评语。
        </template>
      </el-alert>

      <el-table :data="detail?.list ?? []" row-key="studentNo" stripe :row-class-name="rowClass">
        <el-table-column prop="studentNo" label="学号" width="170" />
        <el-table-column prop="studentName" label="姓名" width="130" />
        <el-table-column prop="labName" label="实训室" min-width="180" />
        <el-table-column prop="mentorName" label="导师" min-width="140" />
        <el-table-column label="" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isSelf === 1" type="success" size="small">本人</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="footer-actions">
        <span class="hint">{{ submitted ? '你已提交异议，请等待管理员处理' : '公示结束后不再受理新异议' }}</span>
        <el-button type="primary" :disabled="!canSubmit" @click="openDialog">
          {{ buttonText }}
        </el-button>
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" title="提交异议" width="560px">
      <el-form label-width="90px">
        <el-form-item label="异议类型" required>
          <el-radio-group v-model="disputeType">
            <el-radio v-for="(text, value) in DISPUTE_TYPE_TEXT" :key="value" :label="Number(value)">
              {{ text }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="补充说明" required>
          <el-input
            v-model="content"
            type="textarea"
            :rows="5"
            maxlength="500"
            show-word-limit
            placeholder="请说明异议的具体情况，最长 500 字"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!disputeType" @click="handleSubmit">
          提交异议
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listMyNotices } from '@/api/notice'
import { getPublicityDetail, listMyDisputes, submitDispute } from '@/api/publicity'
import type { PublicityDetail } from '@/types/publicity'

const DISPUTE_TYPE_TEXT: Record<number, string> = {
  1: '录取结果有误',
  2: '名额分配不公',
  3: '信息登记错误',
  4: '其他'
}

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const submitted = ref(false)
const publicityId = ref<number | null>(null)
const detail = ref<PublicityDetail | null>(null)
const remainSeconds = ref(0)
const deadline = ref(0)
const disputeType = ref<number | null>(null)
const content = ref('')
let timer: number | undefined

const statusText = computed(() => {
  if (!detail.value) {
    return '未开始'
  }
  if (detail.value.status === 1) {
    return '公示中'
  }
  return detail.value.status === 2 ? '已结束' : '已确认'
})

const countdownText = computed(() => {
  if (detail.value?.status !== 1) {
    return detail.value?.status === 2 ? '公示已结束' : '公示已确认'
  }
  const hours = Math.floor(remainSeconds.value / 3600)
  const minutes = Math.floor((remainSeconds.value % 3600) / 60)
  const seconds = remainSeconds.value % 60
  return `剩余 ${hours} 时 ${minutes} 分 ${seconds} 秒`
})

const canSubmit = computed(
  () => detail.value?.canDispute === 1 && !submitted.value && remainSeconds.value > 0
)
const buttonText = computed(() => {
  if (submitted.value) {
    return '已提交异议'
  }
  return detail.value?.canDispute === 1 && remainSeconds.value > 0 ? '提交异议' : '公示已结束'
})

function rowClass({ row }: { row: { isSelf: number } }): string {
  return row.isSelf === 1 ? 'self-row' : ''
}

function computeRemainSeconds(endTime: string): number {
  const end = new Date(endTime.replace(' ', 'T')).getTime()
  return Math.max(0, Math.floor((end - Date.now()) / 1000))
}

async function loadDetail() {
  loading.value = true
  try {
    const noticePage = await listMyNotices({ noticeType: 5, pageNum: 1, pageSize: 50 })
    const notice = noticePage.list.find((item) => item.bizType === 'PUBLICITY' && item.bizId)
    const targetId = notice?.bizId ?? null
    if (!targetId) {
      detail.value = null
      publicityId.value = null
      remainSeconds.value = 0
      submitted.value = false
      return
    }
    publicityId.value = targetId
    const data = await getPublicityDetail(targetId)
    detail.value = data
    remainSeconds.value = computeRemainSeconds(data.endTime)
    deadline.value = Date.now() + remainSeconds.value * 1000
    const myDisputes = await listMyDisputes()
    submitted.value = myDisputes.list.some(
      (item) => item.publicityId === publicityId.value && (item.status === 1 || item.status === 2)
    )
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openDialog() {
  disputeType.value = null
  content.value = ''
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!disputeType.value) {
    ElMessage.warning('请选择异议类型')
    return
  }
  if (!publicityId.value) {
    ElMessage.warning('当前无可提交异议的公示')
    return
  }
  submitting.value = true
  try {
    await submitDispute({
      publicityId: publicityId.value,
      disputeType: disputeType.value,
      content: content.value,
      attachments: []
    })
    submitted.value = true
    dialogVisible.value = false
    ElMessage.success('异议已提交，请在「我的异议」查看处理进度')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadDetail()
  timer = window.setInterval(() => {
    if (deadline.value > 0) {
      remainSeconds.value = Math.max(0, Math.ceil((deadline.value - Date.now()) / 1000))
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
.publicity-page {
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

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 15px;
  font-weight: 600;
}

.countdown {
  font-size: 13px;
  color: #e6a23c;
}

.tip {
  margin-bottom: 12px;
}

.footer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 16px;
}

.hint {
  font-size: 13px;
  color: #909399;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
}

:deep(.self-row) {
  background: #f0f9eb;
}
</style>
