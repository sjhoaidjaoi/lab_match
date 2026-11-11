<template>
  <div class="schedule-page">
    <div class="page-header">
      <div>
        <h2>面试排期</h2>
        <p class="subtitle">维护本室面试场次，自动或手工分配学生，发布后场次锁定</p>
      </div>
      <div class="header-actions">
        <el-button @click="handleAutoSchedule">自动分配</el-button>
        <el-button type="success" plain :loading="publishing" @click="handlePublish">发布排期</el-button>
        <el-button type="primary" @click="openCreate">新增场次</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <template #header><span class="section-title">场次列表</span></template>
      <el-table v-loading="loading" :data="sessions" stripe>
        <el-table-column prop="sessionName" label="场次" width="110" />
        <el-table-column prop="interviewDate" label="日期" width="120" />
        <el-table-column label="时段" width="130">
          <template #default="{ row }">{{ row.startTime }} - {{ row.endTime }}</template>
        </el-table-column>
        <el-table-column prop="location" label="地点" min-width="130" />
        <el-table-column label="面试官" min-width="150">
          <template #default="{ row }">{{ row.interviewerNames.join('、') || '-' }}</template>
        </el-table-column>
        <el-table-column label="已排/容量" width="110">
          <template #default="{ row }">{{ row.scheduledCount }} / {{ row.capacity }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 2 ? 'success' : row.status === 3 ? 'info' : 'warning'">
              {{ row.statusText }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="section-title">学生排期</span>
          <span class="count">共 {{ schedules.length }} 人</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="schedules" stripe>
        <el-table-column prop="studentNo" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column prop="sessionName" label="场次" width="110" />
        <el-table-column prop="interviewDate" label="日期" width="120" />
        <el-table-column label="时段" width="130">
          <template #default="{ row }">{{ row.startTime }} - {{ row.endTime }}</template>
        </el-table-column>
        <el-table-column prop="statusText" label="状态" width="100" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              :disabled="!canAdjust(row)"
              @click="openAdjust(row)"
            >
              调整场次
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="adjustVisible" title="调整面试场次" width="500px">
      <el-form label-width="90px">
        <el-form-item label="学生">
          <span>{{ adjustingSchedule?.studentNo }} {{ adjustingSchedule?.studentName }}</span>
        </el-form-item>
        <el-form-item label="原场次">
          <span>{{ adjustingSchedule?.sessionName }}</span>
        </el-form-item>
        <el-form-item label="目标场次">
          <el-select v-model="targetSessionId" placeholder="选择草稿场次" class="full-width">
            <el-option
              v-for="session in targetSessions"
              :key="session.id"
              :label="`${session.sessionName}（${session.interviewDate} ${session.startTime}-${session.endTime}，已排 ${session.scheduledCount}/${session.capacity}）`"
              :value="session.id"
              :disabled="session.scheduledCount >= session.capacity"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" :loading="adjusting" @click="handleAdjust">确认调整</el-button>
      </template>
    </el-dialog>

    <SessionFormDialog
      v-model="dialogVisible"
      :session="editingSession"
      :round-id="roundId"
      @saved="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import SessionFormDialog from '@/components/SessionFormDialog.vue'
import {
  adjustInterviewSchedules,
  autoScheduleInterviews,
  deleteInterviewSession,
  listInterviewSchedules,
  listInterviewSessions,
  publishInterviewSchedules
} from '@/api/leaderInterview'
import { getCurrentRound } from '@/api/public'
import type { InterviewSchedule, InterviewSession } from '@/types/interview'

const loading = ref(false)
const publishing = ref(false)
const sessions = ref<InterviewSession[]>([])
const schedules = ref<InterviewSchedule[]>([])
const dialogVisible = ref(false)
const editingSession = ref<InterviewSession | null>(null)
const roundId = ref<number | null>(null)
const adjustVisible = ref(false)
const adjusting = ref(false)
const adjustingSchedule = ref<InterviewSchedule | null>(null)
const targetSessionId = ref<number | null>(null)

const draftSessions = computed(() => sessions.value.filter((session) => session.status === 1))

const targetSessions = computed(() =>
  draftSessions.value.filter((session) => session.id !== adjustingSchedule.value?.sessionId)
)

function sessionStatus(schedule: InterviewSchedule): number | undefined {
  return sessions.value.find((session) => session.id === schedule.sessionId)?.status
}

function canAdjust(schedule: InterviewSchedule): boolean {
  return (
    sessionStatus(schedule) === 1 &&
    draftSessions.value.some((session) => session.id !== schedule.sessionId)
  )
}

async function loadData() {
  loading.value = true
  try {
    const round = await getCurrentRound()
    roundId.value = round?.id ?? null
    const [sessionList, scheduleList] = await Promise.all([
      listInterviewSessions(roundId.value ?? undefined),
      listInterviewSchedules(roundId.value ?? undefined)
    ])
    sessions.value = sessionList
    schedules.value = scheduleList
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function requireRoundId(): number | null {
  if (!roundId.value) {
    ElMessage.warning('当前无选拔轮次')
    return null
  }
  return roundId.value
}

function openCreate() {
  if (!requireRoundId()) {
    return
  }
  editingSession.value = null
  dialogVisible.value = true
}

function openEdit(session: InterviewSession) {
  editingSession.value = session
  dialogVisible.value = true
}

async function handleDelete(session: InterviewSession) {
  try {
    await ElMessageBox.confirm(`确定删除「${session.sessionName}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteInterviewSession(session.id)
    ElMessage.success('已删除')
    await loadData()
  } catch {
    // 错误提示已由请求层统一处理
  }
}

function openAdjust(schedule: InterviewSchedule) {
  adjustingSchedule.value = schedule
  targetSessionId.value = null
  adjustVisible.value = true
}

async function handleAdjust() {
  const currentRoundId = requireRoundId()
  if (!currentRoundId || !adjustingSchedule.value) {
    return
  }
  if (!targetSessionId.value) {
    ElMessage.warning('请选择目标场次')
    return
  }
  adjusting.value = true
  try {
    await adjustInterviewSchedules({
      roundId: currentRoundId,
      items: [{ scheduleId: adjustingSchedule.value.id, sessionId: targetSessionId.value }]
    })
    ElMessage.success('排期已调整')
    adjustVisible.value = false
    await loadData()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    adjusting.value = false
  }
}

async function handleAutoSchedule() {
  const currentRoundId = requireRoundId()
  if (!currentRoundId) {
    return
  }
  try {
    await ElMessageBox.confirm('将按意向导师聚合，为本室未排期学生自动分配场次，确认继续？', '自动分配', {
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await autoScheduleInterviews(currentRoundId)
    ElMessage.success('自动分配完成')
    await loadData()
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function handlePublish() {
  const currentRoundId = requireRoundId()
  if (!currentRoundId) {
    return
  }
  try {
    await ElMessageBox.confirm('发布后场次将锁定只读，并向涉及学生推送通知，确认发布？', '发布排期', {
      type: 'warning'
    })
  } catch {
    return
  }
  publishing.value = true
  try {
    const result = await publishInterviewSchedules(currentRoundId)
    ElMessage.success(
      `已发布 ${result.sessionCount} 个场次，覆盖 ${result.studentCount} 名学生`
    )
    await loadData()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    publishing.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.schedule-page {
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
  gap: 10px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.count {
  font-size: 13px;
  color: #909399;
}

.full-width {
  width: 100%;
}
</style>
