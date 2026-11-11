<template>
  <div class="pool-page">
    <div class="page-header">
      <div>
        <h2>全院调剂池</h2>
        <p class="subtitle">仅在统筹调剂阶段开放；先到先得，录入后直接生效，学生无需确认</p>
      </div>
      <el-tag type="success" size="large">我的剩余名额 {{ pool?.myRemainQuota ?? 0 }} 个</el-tag>
    </div>

    <el-card shadow="never">
      <div class="filters">
        <el-input v-model="keyword" placeholder="学号 / 姓名" clearable class="keyword" />
        <el-select v-model="major" placeholder="专业" clearable class="major">
          <el-option v-for="item in majorOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="grade" placeholder="年级" clearable class="grade">
          <el-option v-for="item in gradeOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <span class="refresh-tip">列表每 30 秒自动刷新</span>
      </div>
    </el-card>

    <el-row v-loading="loading" :gutter="16">
      <el-col v-for="item in filteredItems" :key="item.studentId" :span="8">
        <el-card shadow="never" class="student-card" :class="{ taken: item.taken === 1 }">
          <div class="card-title">
            <span>{{ item.studentName }}</span>
            <el-tag size="small" type="info">{{ item.studentNo }}</el-tag>
          </div>
          <p class="meta">{{ item.major }} · {{ item.grade }} · 每周 {{ item.weeklyHours }} 小时</p>
          <p class="summary">{{ item.statementSummary }}</p>
          <div class="langs">
            <el-tag v-for="lang in item.programmingLanguages" :key="lang" size="small" effect="plain">
              {{ lang }}
            </el-tag>
          </div>
          <div class="card-actions">
            <el-button
              size="small"
              :disabled="item.hasFullArchive !== 1"
              @click="handleViewArchive(item)"
            >
              {{ item.hasFullArchive === 1 ? '查看完整档案' : '未授权完整档案' }}
            </el-button>
            <el-button
              v-if="item.taken === 0"
              size="small"
              type="primary"
              :disabled="(pool?.myRemainQuota ?? 0) <= 0"
              @click="openTakeDialog(item)"
            >
              录入
            </el-button>
            <el-tag v-else type="info">已被{{ item.takenLabName }}录入</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="!loading && filteredItems.length === 0" description="当前调剂池暂无可录入学生" />

    <el-dialog v-model="dialogVisible" title="录入学生" width="460px">
      <el-alert type="warning" :closable="false" show-icon class="dialog-alert">
        <template #title>录入后直接生效，学生无需确认，请确认该生与导师方向匹配。</template>
      </el-alert>
      <p class="dialog-student">学生：{{ currentItem?.studentName }}（{{ currentItem?.studentNo }}）</p>
      <el-input
        v-model="reason"
        type="textarea"
        :rows="4"
        maxlength="200"
        show-word-limit
        placeholder="请填写录入理由（10-200 字）"
      />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleTake">确认录入</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getStudentArchive } from '@/api/teacherApplicant'
import { getTeacherPool, takeStudent } from '@/api/teacherReallocation'
import type { ReallocationPool, ReallocationPoolItem } from '@/types/reallocation'
import type { TeacherStudentArchive } from '@/types/teacher'

const loading = ref(false)
const submitting = ref(false)
const pool = ref<ReallocationPool | null>(null)
const keyword = ref('')
const major = ref('')
const grade = ref('')
const dialogVisible = ref(false)
const archiveVisible = ref(false)
const archive = ref<TeacherStudentArchive | null>(null)
const currentItem = ref<ReallocationPoolItem | null>(null)
const reason = ref('')
let timer: number | undefined

const majorOptions = computed(() =>
  Array.from(new Set((pool.value?.list ?? []).map((item) => item.major)))
)
const gradeOptions = computed(() =>
  Array.from(new Set((pool.value?.list ?? []).map((item) => item.grade)))
)
const filteredItems = computed(() => {
  const text = keyword.value.trim()
  return (pool.value?.list ?? []).filter((item) => {
    const matchKeyword = !text || item.studentNo.includes(text) || item.studentName.includes(text)
    const matchMajor = !major.value || item.major === major.value
    const matchGrade = !grade.value || item.grade === grade.value
    return matchKeyword && matchMajor && matchGrade
  })
})

async function loadPool() {
  loading.value = true
  try {
    pool.value = await getTeacherPool({ pageNum: 1, pageSize: 100 })
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openTakeDialog(item: ReallocationPoolItem) {
  currentItem.value = item
  reason.value = ''
  dialogVisible.value = true
}

async function handleViewArchive(item: ReallocationPoolItem) {
  if (item.hasFullArchive !== 1) {
    ElMessage.warning('该生未同意全院导师查看完整档案')
    return
  }
  try {
    archive.value = await getStudentArchive(item.studentId)
    archiveVisible.value = true
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function handleTake() {
  if (!currentItem.value) {
    return
  }
  const text = reason.value.trim()
  if (text.length < 10 || text.length > 200) {
    ElMessage.warning('录入理由需为 10-200 字')
    return
  }
  try {
    await ElMessageBox.confirm('录入后直接生效，学生无需确认，确认录入？', '抢录确认', {
      type: 'warning'
    })
  } catch {
    return
  }
  submitting.value = true
  try {
    await takeStudent(currentItem.value.studentId, { reason: text })
    ElMessage.success('已录入，学生将收到录取通知')
    dialogVisible.value = false
    await loadPool()
  } catch {
    // 错误提示已由请求层统一处理
    await loadPool()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadPool()
  timer = window.setInterval(() => {
    void loadPool()
  }, 30000)
})

onUnmounted(() => {
  if (timer) {
    window.clearInterval(timer)
  }
})
</script>

<style scoped>
.pool-page {
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

.filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.keyword {
  width: 200px;
}

.major,
.grade {
  width: 150px;
}

.refresh-tip {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}

.student-card {
  margin-bottom: 16px;
}

.student-card.taken {
  background: #f5f7fa;
  opacity: 0.75;
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  font-weight: 600;
}

.meta {
  margin: 8px 0;
  font-size: 13px;
  color: #606266;
}

.summary {
  margin: 0 0 12px;
  min-height: 60px;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}

.langs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
}

.statement-label {
  margin-bottom: 6px;
  font-size: 13px;
  color: #909399;
}

.archive-statement p {
  margin: 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #303133;
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>
