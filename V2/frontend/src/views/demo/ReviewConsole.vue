<template>
  <div class="page">
    <PageHeader title="学院审核演示台" desc="按账号权限读取本室或全院提交快照，演示组长提交后的「通过 / 退回 / 重新提交」闭环。">
      <template #actions>
        <el-button @click="queue.refresh()">刷新</el-button>
      </template>
    </PageHeader>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="演示入口：真实环境仅学院总负责人可见，接口为 GET/POST /api/admin/submissions/**"
      style="margin-bottom: 16px"
    />
    <el-alert
      v-if="!isAdmin"
      type="info"
      :closable="false"
      show-icon
      title="当前是组长账号，只能查看，不能审批；请用学院负责人账号登录后再操作。"
      style="margin-bottom: 16px"
    />

    <div class="card">
      <el-table :data="visibleSubmissions" size="small">
        <el-table-column prop="labName" label="实训室" min-width="200" />
        <el-table-column prop="submittedAt" label="提交时间" width="170" />
        <el-table-column label="拟录取" width="100">
          <template #default="{ row }">{{ row.counts.intended ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="递补" width="90">
          <template #default="{ row }">{{ row.counts.alternate ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="内部调剂" width="100">
          <template #default="{ row }">{{ row.counts.adjustment ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <el-button link type="primary" @click="open(row)">查看</el-button>
            <el-button link type="success" :disabled="!isAdmin" @click="approve(row)">通过</el-button>
            <el-button link type="danger" :disabled="!isAdmin" @click="reject(row)">退回</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!visibleSubmissions.length" description="暂无待审核提交。请先以组长身份提交本室名单。" />
    </div>

    <div class="card" style="margin-top: 16px">
      <h3 class="block-title">时间变更申请（学院审批演示）</h3>
      <el-table :data="visibleTimeRequests" size="small">
        <el-table-column label="实训室" min-width="180">
          <template #default="{ row }">第 {{ row.labId }} 室 · {{ row.requester }}</template>
        </el-table-column>
        <el-table-column label="阶段" width="110">
          <template #default="{ row }">第 {{ row.stageNo }} 阶段</template>
        </el-table-column>
        <el-table-column label="建议时间" min-width="240">
          <template #default="{ row }">{{ row.proposedStart }} ~ {{ row.proposedEnd }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="理由" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button link type="success" :disabled="!isAdmin" @click="approveTime(row)">通过</el-button>
            <el-button link type="danger" :disabled="!isAdmin" @click="rejectTime(row)">退回</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!visibleTimeRequests.length" description="暂无待审批的时间变更申请" />
    </div>

    <el-drawer v-model="drawer" title="提交详情" size="520px">
      <template v-if="current">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="实训室">{{ current.labName }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ current.submittedAt }}</el-descriptions-item>
          <el-descriptions-item label="名额">{{ current.payload?.quota ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="空缺">{{ current.counts.vacancy ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="拟录取">{{ current.counts.intended ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="递补">{{ current.counts.alternate ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="内部调剂">{{ current.counts.adjustment ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="已确认">{{ current.counts.confirmed ?? '-' }}</el-descriptions-item>
        </el-descriptions>

        <h4 class="sub-title">操作时间线</h4>
        <AuditTimeline :items="current.timeline" />

        <el-collapse>
          <el-collapse-item title="查看提交 JSON 快照" name="payload">
            <pre class="payload">{{ JSON.stringify(current.payload, null, 2) }}</pre>
          </el-collapse-item>
        </el-collapse>
      </template>

      <template #footer>
        <el-button @click="drawer = false">关闭</el-button>
        <el-button type="danger" :disabled="!isAdmin" @click="reject(current)">退回</el-button>
        <el-button type="success" :disabled="!isAdmin" @click="approve(current)">通过</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import AuditTimeline from '@/components/AuditTimeline.vue'
import { useReviewQueueStore } from '@/stores/reviewQueue'
import { useSubmissionStore } from '@/stores/submission'
import { useTimeRequestsStore } from '@/stores/timeRequests'
import { useAuthStore } from '@/stores/auth'

const queue = useReviewQueueStore()
const submission = useSubmissionStore()
const timeRequests = useTimeRequestsStore()
const auth = useAuthStore()
const isAdmin = auth.role === 'COLLEGE_ADMIN'
// 组长只能看到本室提交；学院负责人看全院
const visibleSubmissions = computed(() =>
  isAdmin ? queue.pending : queue.pending.filter((row) => Number(row.labId) === Number(auth.laboratoryId))
)
const visibleTimeRequests = computed(() =>
  isAdmin
    ? timeRequests.pending
    : timeRequests.pending.filter((row) => Number(row.labId) === Number(auth.laboratoryId))
)
const drawer = ref(false)
const current = ref(null)

function open(row) {
  current.value = row
  drawer.value = true
}

async function approve(row) {
  if (!isAdmin) {
    ElMessage.warning('请使用学院负责人账号审批')
    return
  }
  await ElMessageBox.confirm(`确认通过「${row.labName}」的提交？通过后进入公示流程。`, '学院审核通过', {
    type: 'success'
  })
  if (!submission.review(row.labId, 'approve')) {
    ElMessage.error('提交状态已变化，请刷新后重试')
    queue.refresh()
    return
  }
  drawer.value = false
  queue.refresh()
  ElMessage.success(`已通过：${row.labName}`)
}

function approveTime(row) {
  if (!isAdmin) {
    ElMessage.warning('请使用学院负责人账号审批')
    return
  }
  if (timeRequests.review(row.id, 'approve')) ElMessage.success('已通过时间变更申请')
}

async function rejectTime(row) {
  if (!isAdmin) {
    ElMessage.warning('请使用学院负责人账号审批')
    return
  }
  try {
    const { value } = await ElMessageBox.prompt('请填写退回原因', '退回时间变更申请', {
      inputValidator: (v) => (v && v.trim() ? true : '请填写原因')
    })
    if (timeRequests.review(row.id, 'reject', value)) ElMessage.warning('已退回时间变更申请')
  } catch {
    /* cancel */
  }
}

async function reject(row) {
  if (!isAdmin) {
    ElMessage.warning('请使用学院负责人账号审批')
    return
  }
  let reason = ''
  try {
    const { value } = await ElMessageBox.prompt('请填写退回原因（将记入提交时间线与操作日志）', '学院退回', {
      inputPlaceholder: '如：递补顺位与面试评分不一致，请复核',
      inputValidator: (v) => (v && v.trim() ? true : '退回原因不能为空')
    })
    reason = value
  } catch {
    return
  }
  if (!submission.review(row.labId, 'reject', reason)) {
    ElMessage.error('提交状态已变化，请刷新后重试')
    queue.refresh()
    return
  }
  drawer.value = false
  queue.refresh()
  ElMessage.warning(`已退回：${row.labName}`)
}
</script>

<style scoped>
.sub-title { margin: 18px 0 10px; font-size: 14px; }
.payload { margin: 0; padding: 12px; background: #f7f8fa; border-radius: 6px; font-size: 12px; line-height: 1.6; max-height: 320px; overflow: auto; }
</style>
