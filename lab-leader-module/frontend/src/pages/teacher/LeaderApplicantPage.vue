<template>
  <div class="leader-applicant-page">
    <div class="page-header">
      <div>
        <h2>本室报名学生</h2>
        <p class="subtitle">查看本室全部报名学生、志愿与调剂意愿，填报截止后可见</p>
      </div>
      <el-tag v-if="round" type="warning" size="large">
        第 {{ round.roundNo }} 轮 · {{ round.statusText }}
      </el-tag>
    </div>

    <el-alert
      v-if="visible === 0"
      type="info"
      :closable="false"
      show-icon
      title="填报进行中，结束后可查看本室报名学生"
    />

    <el-card shadow="never">
      <div class="filters">
        <el-input v-model="keyword" placeholder="学号 / 姓名" clearable class="keyword" @keyup.enter="handleSearch" />
        <el-button type="primary" plain @click="handleSearch">查询</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="applicants" row-key="studentId" stripe>
        <el-table-column prop="studentNo" label="学号" width="130" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column prop="major" label="专业" min-width="130" />
        <el-table-column prop="grade" label="年级" width="80" />
        <el-table-column label="意向" min-width="240">
          <template #default="{ row }">
            <el-tag
              v-for="item in row.intentions"
              :key="`${item.labId}-${item.mentorId}`"
              size="small"
              class="intention-tag"
            >
              {{ item.labName }} · {{ item.mentorName }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="调剂意愿" width="150">
          <template #default="{ row }">
            <el-tag v-if="row.acceptInnerAdjust === 1" size="small" type="success">内部</el-tag>
            <el-tag v-if="row.acceptCrossAdjust === 1" size="small" type="warning">跨室</el-tag>
            <span v-if="row.acceptInnerAdjust !== 1 && row.acceptCrossAdjust !== 1">-</span>
          </template>
        </el-table-column>
        <el-table-column label="面试" min-width="140">
          <template #default="{ row }">
            <span v-if="row.sessionName">{{ row.sessionName }}（{{ row.interviewDate }}）</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="总分" width="90">
          <template #default="{ row }">{{ formatScore(row.totalScore) }}</template>
        </el-table-column>
        <el-table-column label="录取状态" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.admissionStatus" size="small" type="info">
              {{ row.admissionStatusText }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openArchive(row)">查看档案</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && applicants.length === 0" description="暂无报名学生" />
      <div class="pager">
        <el-pagination
          v-model:current-page="pageNum"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, total"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <el-dialog v-model="archiveVisible" title="学生档案" width="760px">
      <div v-if="archive" class="archive-body">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="学号">{{ archive.userNo }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ archive.realName }}</el-descriptions-item>
          <el-descriptions-item label="学院">{{ archive.college || '-' }}</el-descriptions-item>
          <el-descriptions-item label="专业">{{ archive.major || '-' }}</el-descriptions-item>
          <el-descriptions-item label="年级">{{ archive.grade || '-' }}</el-descriptions-item>
          <el-descriptions-item label="班级">{{ archive.className || '-' }}</el-descriptions-item>
          <el-descriptions-item label="GPA">{{ archive.gpa ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="专业排名">{{ archive.ranking ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="英语等级">{{ archive.englishLevel || '-' }}</el-descriptions-item>
          <el-descriptions-item label="每周投入">{{ archive.weeklyHours ? `${archive.weeklyHours} 小时` : '-' }}</el-descriptions-item>
          <el-descriptions-item label="可投入时段" :span="2">{{ archive.availableSlots || '-' }}</el-descriptions-item>
          <el-descriptions-item label="期望方向" :span="2">{{ archive.expectedDirection || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="archive-section">
          <div class="section-title">技能</div>
          <div class="tag-row">
            <el-tag v-for="item in archive.programmingLanguages" :key="item" size="small">{{ item }}</el-tag>
            <el-tag v-for="item in archive.techStack" :key="item" size="small" type="info">{{ item }}</el-tag>
            <span v-if="archive.programmingLanguages.length === 0 && archive.techStack.length === 0">-</span>
          </div>
        </div>

        <div v-for="section in textSections" :key="section.label" class="archive-section">
          <div class="section-title">{{ section.label }}</div>
          <p class="section-text">{{ section.value || '-' }}</p>
        </div>
      </div>
      <el-empty v-else description="该生尚未完善档案" :image-size="60" />
      <template #footer>
        <el-button type="primary" @click="archiveVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getLeaderStudentArchive, listLeaderApplicants } from '@/api/leaderApplicant'
import { getCurrentRound } from '@/api/public'
import type { LeaderApplicant } from '@/types/leader'
import type { CurrentRound } from '@/types/student'
import type { TeacherStudentArchive } from '@/types/teacher'

const loading = ref(false)
const round = ref<CurrentRound | null>(null)
const roundId = ref<number | null>(null)
const visible = ref(1)
const keyword = ref('')
const applicants = ref<LeaderApplicant[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = 10

const archiveVisible = ref(false)
const archive = ref<TeacherStudentArchive | null>(null)

const textSections = computed(() => [
  { label: '项目经历', value: archive.value?.projectExperience },
  { label: '竞赛经历', value: archive.value?.competitionExperience },
  { label: '科研经历', value: archive.value?.researchExperience },
  { label: '实习经历', value: archive.value?.internshipExperience },
  { label: '其他任职', value: archive.value?.otherDuties },
  { label: '个人陈述', value: archive.value?.statement }
])

function formatScore(value: number | null): string {
  return value === null ? '-' : value.toFixed(2)
}

async function loadData() {
  loading.value = true
  try {
    const [roundData, page] = await Promise.all([
      getCurrentRound(),
      listLeaderApplicants({
        roundId: roundId.value ?? undefined,
        keyword: keyword.value.trim() || undefined,
        pageNum: pageNum.value,
        pageSize
      })
    ])
    round.value = roundData
    roundId.value = roundData?.id ?? null
    visible.value = page.visible
    applicants.value = page.list
    total.value = Number(page.total)
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pageNum.value = 1
  loadData()
}

async function openArchive(row: LeaderApplicant) {
  archive.value = null
  archiveVisible.value = true
  try {
    archive.value = await getLeaderStudentArchive(row.studentId, roundId.value ?? undefined)
  } catch {
    // 错误提示已由请求层统一处理
  }
}

onMounted(loadData)
</script>

<style scoped>
.leader-applicant-page {
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
  gap: 12px;
}

.keyword {
  width: 240px;
}

.intention-tag {
  margin: 2px 6px 2px 0;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.archive-body {
  max-height: 60vh;
  overflow-y: auto;
}

.archive-section {
  margin-top: 16px;
}

.section-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2d3d;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.section-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
  white-space: pre-wrap;
}
</style>
