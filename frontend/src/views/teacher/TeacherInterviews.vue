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
          <el-button v-if="item.status === 'ENDED'" type="primary" link @click="openScore(item)">我的评价</el-button>
        </div>
      </section>
      <div class="panel-row"><el-input v-model="keyword" clearable placeholder="搜索学生姓名或学号" />
        <el-select v-model="filter" clearable placeholder="按面试状态筛选">
          <el-option v-for="(label, value) in appointments" :key="value" :label="label" :value="value" />
        </el-select></div>
      <el-table v-loading="loading" :data="filtered.slice((page - 1) * 15, page * 15)" stripe empty-text="暂无面试记录">
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
              {{ appointments[row.appointmentStatus] || INTERVIEW_STATUS_LABELS[row.interviewStatus] || row.interviewStatus }}
              <span v-if="row.exceptionCode"> · 异常</span>
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
        <el-table-column label="操作" width="270" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.online" size="small" text type="primary" tag="router-link" :to="`/meeting/${row.id}`">
              {{ ['ENDED', 'CANCELLED', 'CLOSED'].includes(row.online.status) ? '会议详情' : '进入会议' }}
            </el-button>
            <el-button v-if="row.interviewTime && !row.exceptionCode && (!row.online || row.online.status === 'ENDED')" size="small" text type="primary" @click="openScore(row)">
              {{ row.scoredAt ? '评价历史' : '面试评价' }}
            </el-button>
            <el-button v-if="row.interviewTime && !row.exceptionCode && (row.online ? ['UPCOMING', 'WAITING'].includes(row.online.status) : row.interviewStatus === 'SCHEDULED')" size="small" text @click="scheduleRow(row)">改期</el-button>
            <el-button v-if="row.interviewTime && (row.online ? ['UPCOMING', 'WAITING'].includes(row.online.status) : row.interviewStatus === 'SCHEDULED')" size="small" text @click="cancelSchedule(row)">取消面试</el-button>
            <el-button v-if="row.canMarkException && !row.exceptionCode" size="small" text @click="markException(row)">登记异常</el-button>
            <el-button v-if="row.exceptionCode" size="small" text type="primary" @click="scheduleRow(row)">补面试</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-if="filtered.length > 15" v-model:current-page="page" :page-size="15" :total="filtered.length" layout="prev,pager,next" />
    </el-card>

    <el-dialog v-model="scheduleVisible" title="安排面试" width="min(520px, calc(100vw - 32px))">
      <el-form :model="scheduleForm" label-width="90px">
        <el-form-item label="学生">
          <el-select v-model="scheduleForm.studentId" :disabled="!!lockedStudent" filterable placeholder="请选择报名学生" style="width: 100%">
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

    <el-dialog v-model="exceptionVisible" title="登记面试异常" width="min(480px, calc(100vw - 32px))">
      <el-select v-model="exceptionCode" aria-label="异常类型">
        <el-option label="学生未参加" value="STUDENT_ABSENT" /><el-option label="面试官未参加" value="TEACHER_ABSENT" />
        <el-option label="网络或设备故障" value="NETWORK" /><el-option label="其他异常" value="OTHER" />
      </el-select>
      <el-input v-model="exceptionReason" type="textarea" :rows="3" maxlength="400" placeholder="简要记录事实及后续安排" />
      <template #footer><el-button type="primary" :disabled="!exceptionReason.trim()" @click="saveException">确认登记</el-button></template>
    </el-dialog>
    <el-dialog v-model="scoreVisible" :title="`我的面试评价 · ${currentStudent}`" width="min(560px, calc(100vw - 32px))">
      <p v-if="currentOnline"><router-link :to="{ path: '/teacher/interview-archives', query: { interviewId: currentId } }">查看录像、逐字稿和纪要</router-link></p>
      <p v-if="!editable">当前场次仅可查阅评价。</p>
      <el-form :model="scoreForm" :disabled="!editable" label-width="116px">
        <el-form-item v-for="dim in scoreDims" :key="dim.key" :label="`${dim.label} ${policy?.weights[dim.key] ?? 20}%`">
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
      <el-collapse v-if="history.length">
        <el-collapse-item title="我的历史评价">
          <p v-for="item in history" :key="item.version">
            {{ item.version ? '#' + item.version : '历史记录' }} · {{ item.state === 'DRAFT' ? '草稿' : '已提交' }} ·
            {{ item.total ?? '未计算总分' }} · {{ formatTime(item.createdAt) }}<br>{{ item.evaluation }}
          </p>
        </el-collapse-item>
      </el-collapse>
      <template #footer>
        <el-button @click="scoreVisible = false">取消</el-button>
        <el-button :disabled="!editable" :loading="scoring" @click="submitScore('DRAFT')">保存草稿</el-button>
        <el-button type="primary" :disabled="!editable" :loading="scoring" @click="submitScore('SUBMITTED')">提交正式评价</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { labApi, type InterviewRow, type PreferenceRow, type ScorePayload } from '@/api/lab'
import { interviewVideoApi, meetingStatusLabels, type MeetingSummary } from '@/api/interviewVideo'
import { appointments, interviewSelection, scoreDimensions as scoreDims, type Evaluation, type ScorePolicy } from '@/api/interviewSelection'
import { useAuthStore } from '@/stores/auth'
import { INTERVIEW_STATUS_LABELS, RECOMMENDATION_LABELS, formatTime, statusTag } from '../college/shared'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const list = ref<InterviewRow[]>([])
const preferences = ref<PreferenceRow[]>([])
const panelOptions = ref<{ id: number; name: string }[]>([])
const panelMeetings = ref<MeetingSummary[]>([])
const loading = ref(false)
const keyword = ref('')
const filter = ref('')
const page = ref(1)
const filtered = computed(() => list.value.filter(item => (!filter.value || item.appointmentStatus === filter.value) &&
  (item.studentName.includes(keyword.value.trim()) || item.studentNumber.includes(keyword.value.trim()))))
watch([keyword, filter], () => { page.value = 1 })

const scheduleVisible = ref(false)
const scheduling = ref(false)
const lockedStudent = ref(false)
const retryOf = ref<number>()
const scheduleDetails = reactive({
  location: '', interviewForm: '', instructions: '', durationMinutes: 30,
  mode: 'STANDARD' as 'STANDARD' | 'LIVEKIT', panelIds: [] as number[]
})
const scheduleForm = reactive<{ studentId: number | null; interviewTime: Date | null }>({
  studentId: null,
  interviewTime: null
})

const scoreVisible = ref(false)
const scoring = ref(false)
const currentId = ref<number>()
const currentStudent = ref('')
const currentOnline = ref(false)
const history = ref<Evaluation[]>([])
const policy = ref<ScorePolicy>()
const editable = ref(false)
const exceptionVisible = ref(false)
const exceptionId = ref<number>()
const exceptionCode = ref('NETWORK')
const exceptionReason = ref('')
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
  lockedStudent.value = false
  retryOf.value = undefined
  scheduleForm.studentId = null
  scheduleForm.interviewTime = null
  Object.assign(scheduleDetails, { location: '', interviewForm: '', instructions: '', durationMinutes: 30,
    mode: 'STANDARD', panelIds: [] })
  scheduleVisible.value = true
}
function scheduleRow(row: InterviewRow) {
  openSchedule()
  lockedStudent.value = true
  scheduleForm.studentId = row.studentId
  retryOf.value = row.exceptionCode ? row.id : undefined
  scheduleForm.interviewTime = !retryOf.value && row.interviewTime ? new Date(row.interviewTime) : null
  Object.assign(scheduleDetails, { mode: row.online || retryOf.value ? 'LIVEKIT' : 'STANDARD', location: row.location || '',
    interviewForm: row.interviewForm || '', instructions: row.instructions || '', durationMinutes: row.durationMinutes || 30,
    panelIds: row.panelIds || [] })
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
      preferenceId: preferences.value.find(item => item.studentId === scheduleForm.studentId)?.id,
      retryOf: retryOf.value,
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
  try { await ElMessageBox.confirm('确认取消这场面试并通知学生？', '取消面试') }
  catch { return }
  scheduling.value = true
  try {
    await labApi.scheduleInterview({ studentId: row.studentId, laboratoryId: labId.value,
      interviewTime: row.interviewTime, interviewStatus: 'CANCELLED', durationMinutes: row.durationMinutes })
    ElMessage.success('已取消面试并通知学生')
    await load()
  } catch { /* 请求层显示失败原因。 */ }
  finally { scheduling.value = false }
}

async function openScore(row: { id: number }) {
  currentId.value = row.id
  try {
    const data = await interviewSelection.own(row.id)
    if (currentId.value !== row.id) return
    currentStudent.value = data.studentName
    currentOnline.value = data.online
    history.value = data.history
    policy.value = data.policy
    editable.value = data.editable
    const recent = data.history[0]
    for (const dim of scoreDims) scoreForm[dim.key] = recent?.scores[dim.key] ?? undefined
    scoreForm.evaluation = recent?.evaluation || ''
    scoreForm.recommendation = recent?.recommendation || 'PENDING'
    scoreVisible.value = true
  } catch { /* 请求层显示原因 */ }
}

async function submitScore(state: 'DRAFT' | 'SUBMITTED') {
  if (!currentId.value || !editable.value) return
  const values = scoreDims.map((d) => scoreForm[d.key])
  if (state === 'SUBMITTED' && values.some((v) => typeof v !== 'number')) {
    ElMessage.warning('请完成五个考核维度的评分')
    return
  }
  if (state === 'SUBMITTED') {
    try { await ElMessageBox.confirm('正式评价将计入本场汇总，并保留提交历史。', '提交正式评价') }
    catch { return }
  }
  scoring.value = true
  try {
    await labApi.scoreInterview(currentId.value, { ...scoreForm, state })
    ElMessage.success(state === 'DRAFT' ? '评价草稿已保存' : '正式评价已提交')
    scoreVisible.value = false
    await load()
  } catch (err) {
    console.error('提交评分失败', err)
    ElMessage.error(err instanceof Error ? err.message : '提交评分失败')
  } finally {
    scoring.value = false
  }
}

function markException(row: InterviewRow) {
  exceptionId.value = row.id
  exceptionReason.value = ''
  exceptionCode.value = 'NETWORK'
  exceptionVisible.value = true
}
async function saveException() {
  if (!exceptionId.value || !exceptionReason.value.trim()) return
  try {
    await interviewSelection.exception(exceptionId.value, exceptionCode.value, exceptionReason.value)
    exceptionVisible.value = false
    ElMessage.success('异常已登记，可安排补面试')
    await load()
  } catch { /* 请求层显示原因 */ }
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

onMounted(async () => {
  await load()
  const preference = preferences.value.find(item => item.id === Number(route.query.preferenceId))
  if (preference) {
    openSchedule()
    lockedStudent.value = true
    scheduleForm.studentId = preference.studentId
    scheduleDetails.mode = 'LIVEKIT'
    void router.replace({ query: {} })
  }
  const selected = list.value.find(item => item.id === Number(route.query.interviewId))
  if (selected) keyword.value = selected.studentNumber
})
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.panel-meetings { padding: 16px; margin-bottom: 16px; border: 0; border-radius: 16px; background: color-mix(in srgb, #ea580c 9%, rgba(255,255,255,.6)); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); box-shadow: inset 0 1px 0 rgba(255,255,255,.92); }
.panel-meetings h3 { margin: 0 0 8px; }
.panel-row { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px 18px; padding: 8px 0; }
.panel-row :deep(.el-input), .panel-row :deep(.el-select) { max-width: 260px; }
</style>
