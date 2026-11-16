<template>
  <section class="page" v-loading="loading">
    <header class="page-header teacher-header">
      <div>
        <h1 class="page-title">确认进度</h1>
        <p class="page-desc">给本人面试通过的学生发出入组邀请。学生接受后自动加入小组，放弃后释放名额。</p>
      </div>
      <el-button v-if="labId" :loading="loading" @click="load">刷新</el-button>
    </header>
    <el-empty v-if="!labId" description="当前账号未绑定实训室" />
    <el-alert v-else-if="failed" type="error" title="邀请记录加载失败" :closable="false">
      <el-button link @click="load">重试</el-button>
    </el-alert>
    <template v-else-if="progress">
      <el-row :gutter="14" class="summary">
        <el-col v-for="item in counts" :key="item.label" :xs="12" :sm="6">
          <div class="stat-card"><div>{{ item.label }}</div><strong>{{ item.count }}</strong></div>
        </el-col>
      </el-row>
      <el-card shadow="never" class="invitation-card">
        <template #header>面试通过 · 待发送邀请</template>
        <p v-if="!progress.mentorConfigured">请联系组长，在「实训室相关信息」为本账号关联导师资料。</p>
        <p v-else>
          {{ progress.quota == null ? '导师名额由实训室统筹' : `导师剩余名额 ${remaining} / ${progress.quota}` }}
          <span v-if="!progress.open"> · 当前为非首轮邀请阶段</span>
        </p>
        <el-table :data="progress.candidates" empty-text="暂无面试通过且尚未邀请的学生">
          <el-table-column prop="studentName" label="姓名" min-width="120" />
          <el-table-column prop="studentNumber" label="学号" min-width="120" />
          <el-table-column label="操作" min-width="135">
            <template #default="{ row }">
              <el-button link type="primary" :loading="sending === row.studentId"
                :disabled="!progress.open || remaining === 0 || sending !== null" @click="send(row)">发送入组邀请</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
      <el-card shadow="never" class="invitation-card">
        <template #header>已发送的邀请</template>
        <el-table :data="progress.invitations" stripe empty-text="暂无邀请记录">
          <el-table-column prop="studentName" label="姓名" min-width="105" />
          <el-table-column prop="studentNumber" label="学号" min-width="120" />
          <el-table-column label="确认状态" min-width="110">
            <template #default="{ row }"><el-tag :type="statusTag(row.status)">{{ labels[row.status] || row.status }}</el-tag></template>
          </el-table-column>
          <el-table-column label="截止时间" min-width="155">
            <template #default="{ row }">{{ formatTime(row.confirmationDeadline) }}</template>
          </el-table-column>
          <el-table-column label="回复时间" min-width="155">
            <template #default="{ row }">{{ formatTime(row.confirmedAt) }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { labApi, type InvitationCandidate, type TeacherInvitationProgress } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'
import { formatTime, statusTag } from '../college/shared'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId)
const labels: Record<string, string> = { PENDING: '待回复', CONFIRMED: '已同意', REJECTED: '已放弃', EXPIRED: '已逾期' }
const progress = ref<TeacherInvitationProgress>()
const loading = ref(false)
const failed = ref(false)
const sending = ref<number | null>(null)
const counts = computed(() => Object.entries(labels).map(([status, label]) => ({
  label, count: progress.value?.invitations.filter(item => item.status === status).length ?? 0
})))
const remaining = computed(() => progress.value?.quota == null ? null : Math.max(0, progress.value.quota - progress.value.occupied))

async function load() {
  if (!labId.value) return
  loading.value = true
  failed.value = false
  try { progress.value = await labApi.teacherInvitations() }
  catch { failed.value = true }
  finally { loading.value = false }
}

async function send(student: InvitationCandidate) {
  if (sending.value !== null) return
  sending.value = student.studentId
  try {
    const accepted = await ElMessageBox.confirm(`向 ${student.studentName} 发送面试通过和入组邀请？`, '发送入组邀请')
      .then(() => true, () => false)
    if (!accepted) return
    await labApi.sendTeacherInvitation(student.studentId)
    ElMessage.success('入组邀请已发送')
    await load()
  } catch { /* 请求层显示发送失败原因。 */ }
  finally { sending.value = null }
}

watch(labId, load, { immediate: true })
</script>

<style scoped>
.teacher-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.summary { margin-block-end: 8px; }
.stat-card { padding: 14px 16px; margin-block-end: 8px; color: var(--lm-text-secondary); }
.stat-card strong { display: block; margin-top: 5px; font-size: 25px; color: var(--lm-text); }
.invitation-card + .invitation-card { margin-top: 14px; }
</style>
