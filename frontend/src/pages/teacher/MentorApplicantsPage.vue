<template>
  <div class="applicants-page">
    <div class="page-header">
      <div>
        <h2>报名学生</h2>
        <p class="subtitle">仅显示将你列为意向的学生，填报截止后可见</p>
      </div>
      <el-tag type="warning" size="large">
        第 {{ round?.roundNo ?? '-' }} 轮 · {{ round?.statusText ?? '未开始' }}
      </el-tag>
    </div>

    <el-alert v-if="visible === 0" type="info" :closable="false" show-icon
      title="填报进行中，结束后可查看报名学生" />
    <el-alert v-else-if="isSupplement" type="info" :closable="false" show-icon>
      <template #title>
        补录轮可直接录入，无需面试；直接录入必须填写理由并写操作日志。
      </template>
    </el-alert>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="applicants" row-key="studentId" stripe>
        <el-table-column prop="studentNo" label="学号" width="150" />
        <el-table-column prop="studentName" label="姓名" width="120" />
        <el-table-column prop="major" label="专业" min-width="150" />
        <el-table-column prop="grade" label="年级" width="90" />
        <el-table-column label="当前总分" width="110">
          <template #default="{ row }">
            {{ row.totalScore === null ? '—' : row.totalScore.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="面试场次" min-width="140">
          <template #default="{ row }">{{ row.sessionName || '—' }}</template>
        </el-table-column>
        <el-table-column label="录取状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.admissionStatus" size="small" type="info">
              {{ row.admissionStatusText }}
            </el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="270" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleViewArchive(row)">查看档案</el-button>
            <el-button size="small" type="primary" plain @click="openScore(row)">评分</el-button>
            <el-button v-if="isSupplement" size="small" type="primary" @click="openDialog(row)">
              直接录入
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && applicants.length === 0" description="暂无报名学生" />
    </el-card>

    <el-dialog v-model="dialogVisible" title="补录直接录入" width="480px">
      <el-alert type="warning" :closable="false" show-icon class="dialog-alert">
        <template #title>直接录入免面试，录取结果直接生效，学生无需确认。</template>
      </el-alert>
      <p class="dialog-student">学生：{{ current?.studentName }}（{{ current?.studentNo }}）</p>
      <el-input
        v-model="reason"
        type="textarea"
        :rows="4"
        maxlength="500"
        show-word-limit
        placeholder="请填写直接录入理由，如项目经历、技能匹配度等"
      />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleAdmit">确认录入</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="archiveVisible" title="学生完整档案" width="720px">
      <template v-if="archive">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="学号">{{ archive.userNo }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ archive.realName }}</el-descriptions-item>
          <el-descriptions-item label="学院">{{ archive.college || '—' }}</el-descriptions-item>
          <el-descriptions-item label="专业">{{ archive.major || '—' }}</el-descriptions-item>
          <el-descriptions-item label="年级">{{ archive.grade || '—' }}</el-descriptions-item>
          <el-descriptions-item label="班级">{{ archive.className || '—' }}</el-descriptions-item>
          <el-descriptions-item label="GPA">{{ archive.gpa ?? '—' }}</el-descriptions-item>
          <el-descriptions-item label="专业排名">{{ archive.ranking ?? '—' }}</el-descriptions-item>
          <el-descriptions-item label="英语等级">{{ archive.englishLevel || '—' }}</el-descriptions-item>
          <el-descriptions-item label="每周投入">{{ archive.weeklyHours ?? '—' }} 小时</el-descriptions-item>
          <el-descriptions-item label="编程语言" :span="2">
            {{ archive.programmingLanguages.join('、') || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="工具链" :span="2">
            {{ archive.techStack.join('、') || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="可投入时段" :span="2">
            {{ archive.availableSlots || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="期望方向" :span="2">
            {{ archive.expectedDirection || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="项目经历" :span="2">
            {{ archive.projectExperience || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="竞赛经历" :span="2">
            {{ archive.competitionExperience || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="科研经历" :span="2">
            {{ archive.researchExperience || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="实习经历" :span="2">
            {{ archive.internshipExperience || '—' }}
          </el-descriptions-item>
        </el-descriptions>
        <div class="archive-statement">
          <div class="statement-label">个人陈述</div>
          <p>{{ archive.statement || '—' }}</p>
        </div>
      </template>
      <el-empty v-else description="该生尚未创建档案" />
      <template #footer>
        <el-button type="primary" @click="archiveVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <ScoreFormDialog
      v-model="scoreDialogVisible"
      :row="editingScoreRow"
      :round-id="round?.id ?? null"
      @saved="loadApplicants"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ScoreFormDialog from '@/components/ScoreFormDialog.vue'
import { getCurrentRound } from '@/api/public'
import { getTeacherScore } from '@/api/teacherScore'
import { directAdmit, getStudentArchive, listApplicants } from '@/api/teacherApplicant'
import type { InterviewScoreRow } from '@/types/interview'
import type { CurrentRound } from '@/types/student'
import type { TeacherApplicant, TeacherStudentArchive } from '@/types/teacher'

const loading = ref(false)
const submitting = ref(false)
const visible = ref(0)
const round = ref<CurrentRound | null>(null)
const applicants = ref<TeacherApplicant[]>([])
const dialogVisible = ref(false)
const current = ref<TeacherApplicant | null>(null)
const reason = ref('')
const scoreDialogVisible = ref(false)
const editingScoreRow = ref<InterviewScoreRow | null>(null)
const archiveVisible = ref(false)
const archive = ref<TeacherStudentArchive | null>(null)

const isSupplement = computed(() => (round.value?.roundNo ?? 0) > 1)

async function loadApplicants() {
  loading.value = true
  try {
    const [roundData, page] = await Promise.all([
      getCurrentRound(),
      listApplicants({ pageNum: 1, pageSize: 100 })
    ])
    round.value = roundData
    visible.value = page.visible
    applicants.value = page.list
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openDialog(row: TeacherApplicant) {
  current.value = row
  reason.value = ''
  dialogVisible.value = true
}

async function handleViewArchive(row: TeacherApplicant) {
  try {
    archive.value = await getStudentArchive(row.studentId)
    archiveVisible.value = true
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function openScore(row: TeacherApplicant) {
  if (!round.value) {
    ElMessage.warning('当前无选拔轮次')
    return
  }
  let detail = null
  try {
    detail = await getTeacherScore(row.studentId, round.value.id)
  } catch {
    detail = null
  }
  editingScoreRow.value = {
    id: detail?.id ?? null,
    studentId: row.studentId,
    studentNo: row.studentNo,
    studentName: row.studentName,
    mentorId: detail?.mentorId ?? 0,
    mentorName: detail?.mentorName ?? '',
    sessionName: row.sessionName || '',
    attitudeScore: detail?.attitudeScore ?? null,
    logicScore: detail?.logicScore ?? null,
    programmingScore: detail?.programmingScore ?? null,
    timeScore: detail?.timeScore ?? null,
    systemTotal: detail?.systemTotal ?? null,
    manualTotal: detail?.manualTotal ?? null,
    finalTotal: detail?.finalTotal ?? null,
    status: detail?.status ?? 0,
    statusText: detail ? '已评分' : '未评分'
  }
  scoreDialogVisible.value = true
}

async function handleAdmit() {
  if (!current.value || !round.value) {
    return
  }
  if (!reason.value.trim()) {
    ElMessage.warning('请填写直接录入理由')
    return
  }
  try {
    await ElMessageBox.confirm('直接录入后录取结果立即生效，确认提交？', '直接录入确认', {
      type: 'warning'
    })
  } catch {
    return
  }
  submitting.value = true
  try {
    await directAdmit({
      roundId: round.value.id,
      studentId: current.value.studentId,
      reason: reason.value.trim()
    })
    ElMessage.success('已直接录入，学生将收到录取通知')
    dialogVisible.value = false
    await loadApplicants()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    submitting.value = false
  }
}

onMounted(loadApplicants)
</script>

<style scoped>
.applicants-page {
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

.dialog-alert {
  margin-bottom: 12px;
}

.dialog-student {
  margin: 0 0 8px;
  font-size: 14px;
  color: #303133;
}

.archive-statement {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f2f5;
}

.statement-label {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.archive-statement p {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
}
</style>
