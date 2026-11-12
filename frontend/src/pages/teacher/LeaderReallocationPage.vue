<template>
  <div class="leader-reallocation-page">
    <div class="page-header">
      <div>
        <h2>本室内部调剂</h2>
        <p class="subtitle">阶段 6 仅处理服从本室内部调剂、且本轮尚无录取去向的学生；提交后需学生确认</p>
      </div>
      <el-tag type="warning" size="large">待调剂 {{ candidates.length }} 人</el-tag>
    </div>

    <el-alert v-if="innerWindowText" :title="innerWindowText" type="info" :closable="false" show-icon />
    <el-alert
      v-else
      title="本轮未配置内部调剂时间窗，暂不可执行本室内部调剂"
      type="warning"
      :closable="false"
      show-icon
    />

    <el-card shadow="never" header="本室导师剩余名额">
      <el-table :data="mentors" size="small">
        <el-table-column prop="realName" label="导师" width="140" />
        <el-table-column prop="labName" label="所属实训室" min-width="180" />
        <el-table-column label="剩余名额" width="120">
          <template #default="{ row }">
            <el-tag :type="row.remainQuota > 0 ? 'success' : 'info'">
              {{ row.remainQuota > 0 ? row.remainQuota : '已满' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" header="本室待调剂学生">
      <el-table v-loading="loading" :data="candidates" row-key="studentId" stripe>
        <el-table-column prop="studentNo" label="学号" width="150" />
        <el-table-column prop="studentName" label="姓名" width="120" />
        <el-table-column prop="originLabName" label="原意向实训室" min-width="180" />
        <el-table-column label="总分" width="100">
          <template #default="{ row }">{{ formatScore(row.totalScore) }}</template>
        </el-table-column>
        <el-table-column label="可调剂导师" min-width="200">
          <template #default="{ row }">
            <el-tag v-for="mentor in row.availableMentors" :key="mentor.mentorId" size="small" class="mentor-tag">
              {{ mentor.mentorName }}（余 {{ mentor.remainQuota }}）
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              :disabled="row.availableMentors.length === 0"
              @click="openDialog(row)"
            >
              内部调剂
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && candidates.length === 0" description="暂无符合条件的待调剂学生" />
    </el-card>

    <el-dialog v-model="dialogVisible" title="执行本室内部调剂" width="480px">
      <p class="dialog-student">学生：{{ current?.studentName }}（{{ current?.studentNo }}）</p>
      <el-form label-width="90px">
        <el-form-item label="目标导师" required>
          <el-select v-model="toMentorId" placeholder="请选择本室导师" class="full-width">
            <el-option
              v-for="mentor in current?.availableMentors ?? []"
              :key="mentor.mentorId"
              :label="`${mentor.mentorName}（剩余 ${mentor.remainQuota}）`"
              :value="mentor.mentorId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="调剂说明" required>
          <el-input v-model="reason" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="必填，将写入操作日志" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleReallocate">确认调剂</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listLeaderMentors } from '@/api/leaderMentor'
import { listLeaderCandidates, reallocateInner } from '@/api/leaderReallocation'
import { getCurrentRound } from '@/api/public'
import type { MentorListItem } from '@/types/basic'
import type { ReallocationCandidate } from '@/types/reallocation'

const loading = ref(false)
const submitting = ref(false)
const roundId = ref<number | null>(null)
const roundWindow = ref<{ start: string | null; end: string | null } | null>(null)
const candidates = ref<ReallocationCandidate[]>([])
const mentors = ref<MentorListItem[]>([])
const dialogVisible = ref(false)
const current = ref<ReallocationCandidate | null>(null)
const toMentorId = ref<number | null>(null)
const reason = ref('')

const innerWindowText = computed(() => {
  if (!roundWindow.value?.start || !roundWindow.value?.end) {
    return ''
  }
  return `阶段 6 内部调剂窗口：${roundWindow.value.start} ~ ${roundWindow.value.end}；学生需在窗口结束或通知后 24 小时内确认`
})

function formatScore(value: number | null): string {
  return value === null ? '—' : value.toFixed(2)
}

async function loadData() {
  loading.value = true
  try {
    const round = await getCurrentRound()
    roundId.value = round?.id ?? null
    roundWindow.value = round
      ? { start: round.innerAdjustStart ?? null, end: round.innerAdjustEnd ?? null }
      : null
    const [candidatePage, mentorList] = await Promise.all([
      listLeaderCandidates({
        roundId: roundId.value ?? undefined,
        pageNum: 1,
        pageSize: 100
      }),
      listLeaderMentors()
    ])
    candidates.value = candidatePage.list
    mentors.value = mentorList
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openDialog(row: ReallocationCandidate) {
  current.value = row
  toMentorId.value = row.availableMentors[0]?.mentorId ?? null
  reason.value = ''
  dialogVisible.value = true
}

async function handleReallocate() {
  if (!roundId.value) {
    ElMessage.warning('当前无选拔轮次')
    return
  }
  if (!current.value || !toMentorId.value) {
    ElMessage.warning('请选择目标导师')
    return
  }
  if (!reason.value.trim()) {
    ElMessage.warning('请填写调剂说明')
    return
  }
  try {
    await ElMessageBox.confirm(
      '提交后将生成待确认录取，学生需在截止前确认；逾期或拒绝将释放名额。确认提交吗？',
      '内部调剂确认',
      { type: 'warning' }
    )
  } catch {
    return
  }
  submitting.value = true
  try {
    const resp = await reallocateInner({
      roundId: roundId.value,
      studentId: current.value.studentId,
      toMentorId: toMentorId.value,
      reason: reason.value.trim()
    })
    if (resp.status === 1) {
      ElMessage.success(
        resp.confirmDeadline
          ? `已提交，等待学生于 ${resp.confirmDeadline} 前确认`
          : '已提交，等待学生确认'
      )
    } else {
      ElMessage.success('内部调剂已完成')
    }
    dialogVisible.value = false
    await loadData()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.leader-reallocation-page {
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

.mentor-tag {
  margin-right: 6px;
}

.dialog-student {
  margin: 0 0 12px;
  font-size: 14px;
  color: #303133;
}

.full-width {
  width: 100%;
}
</style>
