<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">面试管理</h2>
          <p class="page-desc">为选择本人为导师的学生安排面试，或以受邀教师身份参加共同面试。</p>
        </div>
        <el-button type="primary" :disabled="!labId" @click="openSchedule">安排面试</el-button>
      </div>
    </div>

    <el-card v-if="!labId" shadow="never">
      <el-empty description="未绑定实训室" />
    </el-card>

    <el-card v-else shadow="never">
      <section v-if="panelMeetings.length" class="panel-meetings" aria-label="共同面试邀请">
        <h3>共同面试邀请</h3>
        <div v-for="item in panelMeetings" :key="item.id" class="panel-row">
          <span>{{ item.studentName }} · {{ formatTime(item.interviewTime) }} · {{ meetingStatusLabels[item.status] }}</span>
          <router-link :to="`/meeting/${item.id}`">查看会议 →</router-link>
        </div>
      </section>
      <el-table v-loading="loading" :data="list" stripe empty-text="暂无面试记录">
        <el-table-column prop="studentNumber" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column label="面试官" width="110">
          <template #default="{ row }">{{ row.interviewerName || '—' }}</template>
        </el-table-column>
        <el-table-column label="面试时间" width="160">
          <template #default="{ row }">{{ formatTime(row.interviewTime) }}</template>
        </el-table-column>
        <el-table-column label="通知" width="100"><template #default="{row}">{{ row.noticeStatus === 'READ' ? '学生已读' : row.noticeStatus === 'SENT' ? '已发送' : '未发送' }}</template></el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.interviewStatus)" effect="light">
              {{ row.online ? meetingStatusLabels[row.online.status as MeetingStatus] : (INTERVIEW_STATUS_LABELS[row.interviewStatus] || row.interviewStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="学习态度" width="95" align="center">
          <template #default="{ row }">{{ row.attitudeScore ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="逻辑思维" width="95" align="center">
          <template #default="{ row }">{{ row.logicScore ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="编程基础" width="95" align="center">
          <template #default="{ row }">{{ row.programmingScore ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="时间投入" width="95" align="center">
          <template #default="{ row }">{{ row.timeCommitmentScore ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="综合表现" width="95" align="center">
          <template #default="{ row }">{{ row.comprehensiveScore ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="录取建议" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.recommendation)" effect="plain">
              {{ RECOMMENDATION_LABELS[row.recommendation] || row.recommendation }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="228" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.online" size="small" text type="primary" tag="router-link" :to="`/meeting/${row.id}`">
              {{ ['ENDED', 'CANCELLED', 'CLOSED'].includes(row.online.status) ? '会议详情' : '进入会议' }}
            </el-button>
            <el-button v-if="!row.online || row.online.status === 'ENDED'" size="small" text type="primary" @click="openScore(row)">
              {{ (row.online ? row.scoredAt : row.interviewStatus === 'COMPLETED') ? '修改评分' : '评分' }}
            </el-button>
            <el-button v-if="row.interviewTime && (row.online ? ['UPCOMING', 'WAITING'].includes(row.online.status) : !['COMPLETED', 'CANCELLED'].includes(row.interviewStatus))" size="small" text @click="cancelSchedule(row)">取消面试</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="scheduleVisible" title="安排面试" width="min(520px, calc(100vw - 32px))">
      <el-form :model="scheduleForm" label-width="90px">
        <el-form-item label="学生">
          <el-select v-model="scheduleForm.studentId" filterable placeholder="请选择报名学生" style="width: 100%">
            <el-option
              v-for="p in preferences"
              :key="p.studentId"
              :label="`${p.studentName}（${p.studentNumber}）`"
              :value="p.studentId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="面试时间">
          <el-date-picker
            v-model="scheduleForm.interviewTime"
            type="datetime"
            placeholder="选择面试时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="面试方式">
          <el-radio-group v-model="scheduleDetails.mode">
            <el-radio-button value="STANDARD">常规面试</el-radio-button>
            <el-radio-button value="LIVEKIT">平台视频</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="scheduleDetails.mode === 'LIVEKIT'" label="共同面试官">
          <el-select v-model="scheduleDetails.panelIds" multiple filterable clearable :multiple-limit="12" placeholder="选择本实训室同事（可选）">
            <el-option v-for="teacher in panelOptions" :key="teacher.id" :label="teacher.name" :value="teacher.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="形式"><el-input v-model="scheduleDetails.interviewForm" maxlength="50" placeholder="例如：线上或线下" /></el-form-item>
        <el-form-item label="时长（分钟）"><el-input-number v-model="scheduleDetails.durationMinutes" :min="5" :max="180" /></el-form-item>
        <el-form-item v-if="scheduleDetails.mode === 'STANDARD'" label="地点或会议"><el-input v-model="scheduleDetails.location" maxlength="250" /></el-form-item>
        <el-form-item label="面试要求"><el-input v-model="scheduleDetails.instructions" type="textarea" maxlength="500" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scheduleVisible = false">取消</el-button>
        <el-button type="primary" :loading="scheduling" @click="submitSchedule">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="scoreVisible" :title="`面试评分 - ${currentStudent}`" width="560px">
      <el-form :model="scoreForm" label-width="100px">
        <el-form-item v-for="dim in scoreDims" :key="dim.key" :label="dim.label">
          <el-input-number
            v-model="scoreForm[dim.key]"
            :min="0"
            :max="100"
            :step="1"
            controls-position="right"
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="文字评价">
          <el-input v-model="scoreForm.evaluation" type="textarea" :rows="3" placeholder="请填写面试评价" />
        </el-form-item>
        <el-form-item label="面试结论">
          <el-select v-model="scoreForm.recommendation" style="width: 180px">
            <el-option
              v-for="(label, value) in RECOMMENDATION_LABELS"
              :key="value"
              :label="value === 'INTENDED' ? '面试通过' : label"
              :value="value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scoreVisible = false">取消</el-button>
        <el-button type="primary" :loading="scoring" @click="submitScore">提交评分</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { labApi, type InterviewRow, type PreferenceRow, type ScorePayload } from '@/api/lab'
import { interviewVideoApi, meetingStatusLabels, type MeetingStatus, type MeetingSummary } from '@/api/interviewVideo'
import { useAuthStore } from '@/stores/auth'
import { INTERVIEW_STATUS_LABELS, RECOMMENDATION_LABELS, formatTime, statusTag } from '../college/shared'

type DimensionKey =
  | 'attitudeScore'
  | 'logicScore'
  | 'programmingScore'
  | 'timeCommitmentScore'
  | 'comprehensiveScore'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const list = ref<InterviewRow[]>([])
const preferences = ref<PreferenceRow[]>([])
const panelOptions = ref<{ id: number; name: string }[]>([])
const panelMeetings = ref<MeetingSummary[]>([])
const loading = ref(false)

const scheduleVisible = ref(false)
const scheduling = ref(false)
const scheduleDetails = reactive({
  location: '', interviewForm: '', instructions: '', durationMinutes: 30,
  mode: 'STANDARD' as 'STANDARD' | 'LIVEKIT', panelIds: [] as number[]
})
const scheduleForm = reactive<{ studentId: number | null; interviewTime: Date | null }>({
  studentId: null,
  interviewTime: null
})

const scoreDims: Array<{ key: DimensionKey; label: string }> = [
  { key: 'attitudeScore', label: '学习态度' },
  { key: 'logicScore', label: '逻辑思维' },
  { key: 'programmingScore', label: '编程基础' },
  { key: 'timeCommitmentScore', label: '时间投入' },
  { key: 'comprehensiveScore', label: '综合表现' }
]

const scoreVisible = ref(false)
const scoring = ref(false)
const currentRow = ref<InterviewRow | null>(null)
const currentStudent = computed(() => currentRow.value?.studentName || '')
const scoreForm = reactive<{
  attitudeScore: number | undefined
  logicScore: number | undefined
  programmingScore: number | undefined
  timeCommitmentScore: number | undefined
  comprehensiveScore: number | undefined
  evaluation: string
  recommendation: ScorePayload['recommendation']
}>({
  attitudeScore: undefined,
  logicScore: undefined,
  programmingScore: undefined,
  timeCommitmentScore: undefined,
  comprehensiveScore: undefined,
  evaluation: '',
  recommendation: 'PENDING'
})

function openSchedule() {
  scheduleForm.studentId = null
  scheduleForm.interviewTime = null
  Object.assign(scheduleDetails, { location: '', interviewForm: '', instructions: '', durationMinutes: 30,
    mode: 'STANDARD', panelIds: [] })
  scheduleVisible.value = true
}

async function submitSchedule() {
  if (!labId.value) return
  if (!scheduleForm.studentId) {
    ElMessage.warning('请选择学生')
    return
  }
  if (!scheduleForm.interviewTime) {
    ElMessage.warning('请选择面试时间')
    return
  }
  scheduling.value = true
  try {
    await labApi.scheduleInterview({
      ...scheduleDetails,
      studentId: scheduleForm.studentId,
      laboratoryId: labId.value,
      interviewTime: new Date(scheduleForm.interviewTime).toISOString(),
      interviewStatus: 'SCHEDULED'
    })
    ElMessage.success('面试安排成功')
    scheduleVisible.value = false
    await load()
  } catch (err) {
    console.error('安排面试失败', err)
    ElMessage.error(err instanceof Error ? err.message : '安排面试失败')
  } finally {
    scheduling.value = false
  }
}

async function cancelSchedule(row: InterviewRow) {
  if (!labId.value || !row.interviewTime || scheduling.value) return
  scheduling.value = true
  try {
    await labApi.scheduleInterview({ studentId: row.studentId, laboratoryId: labId.value,
      interviewTime: row.interviewTime, interviewStatus: 'CANCELLED', durationMinutes: row.durationMinutes })
    ElMessage.success('已取消面试并通知学生')
    await load()
  } catch { /* 请求层显示失败原因。 */ }
  finally { scheduling.value = false }
}

function openScore(row: InterviewRow) {
  currentRow.value = row
  scoreForm.attitudeScore = row.attitudeScore ?? undefined
  scoreForm.logicScore = row.logicScore ?? undefined
  scoreForm.programmingScore = row.programmingScore ?? undefined
  scoreForm.timeCommitmentScore = row.timeCommitmentScore ?? undefined
  scoreForm.comprehensiveScore = row.comprehensiveScore ?? undefined
  scoreForm.evaluation = row.evaluation || ''
  scoreForm.recommendation = row.recommendation || 'PENDING'
  scoreVisible.value = true
}

async function submitScore() {
  if (!currentRow.value) return
  const values = scoreDims.map((d) => scoreForm[d.key])
  if (values.some((v) => typeof v !== 'number')) {
    ElMessage.warning('请完成五个考核维度的评分')
    return
  }
  const payload: ScorePayload = {
    attitudeScore: scoreForm.attitudeScore as number,
    logicScore: scoreForm.logicScore as number,
    programmingScore: scoreForm.programmingScore as number,
    timeCommitmentScore: scoreForm.timeCommitmentScore as number,
    comprehensiveScore: scoreForm.comprehensiveScore as number,
    evaluation: scoreForm.evaluation,
    recommendation: scoreForm.recommendation
  }
  scoring.value = true
  try {
    await labApi.scoreInterview(currentRow.value.id, payload)
    ElMessage.success('评分已提交')
    scoreVisible.value = false
    await load()
  } catch (err) {
    console.error('提交评分失败', err)
    ElMessage.error(err instanceof Error ? err.message : '提交评分失败')
  } finally {
    scoring.value = false
  }
}

async function load() {
  if (!labId.value) return
  loading.value = true
  try {
    const [i, p] = await Promise.all([labApi.interviews(labId.value), labApi.preferences(labId.value)])
    list.value = i
    preferences.value = p
  } catch (err) {
    console.error('面试数据加载失败', err)
    ElMessage.error('面试数据加载失败')
  } finally { loading.value = false }
  const results = await Promise.allSettled([interviewVideoApi.list(), interviewVideoApi.panel()])
  if (results[0].status === 'fulfilled') panelMeetings.value = results[0].value.filter(item => item.role === 'PANEL')
  if (results[1].status === 'fulfilled') panelOptions.value = results[1].value
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.panel-meetings { padding: 16px; margin-bottom: 16px; border: 1px solid #ebd8cc; border-radius: 12px; background: #fff7ef; }
.panel-meetings h3 { margin: 0 0 8px; }
.panel-row { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px 18px; padding: 8px 0; }
</style>
