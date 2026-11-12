<template>
  <div class="page">
    <PageHeader title="面试管理" desc="报名即面试，不做超额淘汰；按学生批量排期，同一面试官同一时段不可重复安排。">
      <template #actions>
        <el-button :disabled="stageClosed" @click="openReview">添加复评</el-button>
        <el-button type="primary" :disabled="stageClosed" @click="openSchedule()">新建面试安排</el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="stageClosed"
      :title="expired
        ? `面试与评价截止 ${interviewDeadline} 已过，本页写操作关闭`
        : `当前处于第 ${stage.current.no} 阶段（${stage.current.name}），面试相关写操作已按阶段关闭`"
      :description="expired ? '如需调整时间，请联系组长提交「时间变更申请」。' : ''"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />

    <div class="stat-grid" style="margin-bottom: 16px">
      <StatCard label="应面试" :value="interviews.studentCount" suffix="人" />
      <StatCard label="已评价学生" :value="interviews.evaluatedStudentCount" suffix="人" />
      <StatCard label="待评价学生" :value="interviews.pendingStudentCount" suffix="人" />
      <StatCard label="缺勤" :value="interviews.absentStudentCount" suffix="人" tone="#f56c6c" />
    </div>

    <div class="card" style="margin-bottom: 16px">
      <div class="toolbar">
        <el-switch v-model="onlyMine" active-text="只看我负责的" />
        <el-select v-model="interviewerFilter" placeholder="按面试官" clearable style="width: 160px">
          <el-option v-for="name in interviewerOptions" :key="name" :label="name" :value="name" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="按状态" clearable style="width: 140px">
          <el-option label="待评价" value="PENDING" />
          <el-option label="已评价" value="EVALUATED" />
          <el-option label="缺勤" value="ABSENT" />
        </el-select>
        <span class="muted">筛选结果 {{ filtered.length }} 条 · 共 {{ interviews.records.length }} 条记录 · 已排批次 {{ interviews.schedules.length }}</span>
      </div>
      <div class="toolbar">
        <span class="muted">录取建议分布：</span>
        <el-tag type="success" effect="plain">建议拟录取 {{ interviews.recommendationCounts.ADMIT }}</el-tag>
        <el-tag type="warning" effect="plain">建议递补 {{ interviews.recommendationCounts.ALTERNATE }}</el-tag>
        <el-tag type="danger" effect="plain">不建议 {{ interviews.recommendationCounts.REJECT }}</el-tag>
      </div>
    </div>

    <div class="card">
      <el-table :data="filtered" size="small" row-key="id">
        <el-table-column prop="realName" label="姓名" width="90" />
        <el-table-column prop="studentNumber" label="学号" width="130" />
        <el-table-column label="面试官" width="120">
          <template #default="{ row }">
            {{ row.interviewer }}
            <el-tag v-if="isMine(row)" size="small" type="success" effect="plain">我</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="面试时间" width="170">
          <template #default="{ row }">
            {{ row.time }}
            <span v-if="row.durationMin" class="muted">（{{ row.durationMin }} 分钟）</span>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="地点" width="120" />
        <el-table-column prop="form" label="形式" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><StatusTag :status="row.status" :label="row.status === 'PENDING' ? '待评价' : row.status === 'ABSENT' ? '缺勤' : ''" /></template>
        </el-table-column>
        <el-table-column label="综合分" width="90">
          <template #default="{ row }">{{ row.total ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210">
          <template #default="{ row }">
            <el-button v-if="row.status !== 'ABSENT'" link type="primary" @click="goEvaluate(row)">
              {{ row.status === 'EVALUATED' ? '查看' : isMine(row) ? '录入评价' : '查看' }}
            </el-button>
            <el-button v-if="row.status === 'PENDING'" link type="danger" :disabled="stageClosed" @click="onAbsent(row)">记缺勤</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="card" style="margin-top: 16px">
      <h3 class="block-title">本室面试时段（每位教师专属）</h3>
      <el-table :data="teacherSlotRows" size="small">
        <el-table-column prop="name" label="教师" width="120" />
        <el-table-column prop="date" label="日期" width="130" />
        <el-table-column label="时段" min-width="160">
          <template #default="{ row }">{{ row.start }} ~ {{ row.end }}</template>
        </el-table-column>
      </el-table>
      <el-collapse style="margin-top: 10px">
        <el-collapse-item title="查看全院 6 室时段梯度（只读，互不重叠）" name="all">
          <el-table :data="labSlotRows" size="small">
            <el-table-column label="实训室" width="120">
              <template #default="{ row }">第 {{ row.id }} 室</template>
            </el-table-column>
            <el-table-column prop="date" label="日期" width="130" />
            <el-table-column label="时段" min-width="160">
              <template #default="{ row }">{{ row.start }} ~ {{ row.end }}</template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </div>

    <div class="card" style="margin-top: 16px">
      <div class="toolbar">
        <h3 class="block-title" style="margin: 0">已排批次</h3>
        <span class="muted">共 {{ interviews.schedules.length }} 批；取消后该批学生恢复为待排期</span>
      </div>
      <el-table :data="interviews.schedules" size="small">
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column label="时间" width="140">
          <template #default="{ row }">{{ row.time }}（{{ row.durationMin || 20 }} 分钟）</template>
        </el-table-column>
        <el-table-column prop="location" label="地点" width="140" />
        <el-table-column prop="form" label="形式" width="80" />
        <el-table-column prop="interviewer" label="面试官" width="110" />
        <el-table-column label="人数" width="80">
          <template #default="{ row }">{{ row.studentIds?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="danger" :disabled="stageClosed" @click="onCancelSchedule(row)">取消批次</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!interviews.schedules.length" description="暂无排期批次" :image-size="60" />
    </div>

    <el-dialog v-model="reviewDialog" title="添加复评" width="520px">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="同一学生可由不同面试官复评；同一面试官不能重复评价同一学生。"
        style="margin-bottom: 14px"
      />
      <el-form label-width="90px">
        <el-form-item label="学生">
          <el-select v-model="reviewForm.studentId" filterable placeholder="选择已评价学生" style="width: 100%">
            <el-option
              v-for="s in evaluatedStudents"
              :key="s.studentId"
              :label="`${s.realName}（${s.studentNumber}）`"
              :value="s.studentId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="复评教师">
          <el-select v-model="reviewForm.interviewerId" placeholder="选择教师" style="width: 100%">
            <el-option v-for="t in directory" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!reviewForm.studentId || !reviewForm.interviewerId" @click="saveReview">添加</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dialog" title="排面试" width="860px">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        :title="`本室面试时段：${labSlot?.date || '-'} ${labSlot?.start || '-'} ~ ${labSlot?.end || '-'}；每位教师只在自己的时段内面试`"
        :description="selectedSlot ? `当前面试官时段：${selectedSlot.date} ${selectedSlot.start} ~ ${selectedSlot.end}` : '选择面试官后显示其专属时段'"
        style="margin-bottom: 12px"
      />
      <el-form :model="form" label-width="88px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="面试日期">
              <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-time-picker v-model="form.time" value-format="HH:mm" placeholder="选择时间" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="地点">
              <el-input v-model="form.location" placeholder="如：实验楼 A301" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="形式">
              <el-radio-group v-model="form.form">
                <el-radio value="线下">线下</el-radio>
                <el-radio value="线上">线上</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="面试官">
              <el-select v-model="form.interviewer" style="width: 100%">
                <el-option v-for="name in interviewerOptions" :key="name" :label="name" :value="name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="时长（分钟）">
              <el-input-number v-model="form.durationMin" :min="5" :max="120" :step="5" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <p class="muted">选择待评价学生（可多选）。只更新被选中的学生，已评价/缺勤的学生不会出现在列表中。</p>
      <el-table :data="pendingStudents" size="small" row-key="studentId" max-height="320" @selection-change="onPick">
        <el-table-column type="selection" width="52" />
        <el-table-column prop="studentNumber" label="学号" width="140" />
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column prop="time" label="当前安排" width="160" />
        <el-table-column prop="interviewer" label="当前面试官" width="120" />
      </el-table>

      <template #footer>
        <span class="muted" style="margin-right: 12px">已选 {{ picked.length }} 人</span>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :disabled="!picked.length" @click="saveSchedule">保存安排</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useInterviewsStore } from '@/stores/interviews'
import { useStageStore } from '@/stores/stage'
import { useClockStore } from '@/stores/clock'
import { isPast } from '@/utils/time'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useLogsStore } from '@/stores/logs'
import { TEACHER_DIRECTORY, teacherIdByName } from '@/mock/teachers'
import { LAB_SLOTS, labSlotOf, teacherSlotOf } from '@/mock/schedule'

const router = useRouter()
const interviews = useInterviewsStore()
const stage = useStageStore()
const clock = useClockStore()
const auth = useAuthStore()
const labId = computed(() => auth.laboratoryId)
const notifications = useNotificationsStore()
const logs = useLogsStore()

const interviewDeadline = computed(() => stage.stages.find((s) => s.no === 4)?.end || '2026-11-03 17:00')
const expired = computed(() => isPast(interviewDeadline.value, clock.now))
const stageClosed = computed(() => !stage.canWrite(4) || expired.value)
const dialog = ref(false)
const picked = ref([])
const onlyMine = ref(false)
const interviewerFilter = ref('')
const statusFilter = ref('')

const interviewerOptions = computed(() => [...new Set(interviews.records.map((r) => r.interviewer))])
const pendingStudents = computed(() => interviews.records.filter((r) => r.status === 'PENDING'))

const form = reactive({
  date: '',
  time: '09:00',
  location: '实验楼 A301',
  form: '线下',
  interviewer: '',
  durationMin: 20
})

const directory = computed(() => TEACHER_DIRECTORY.filter((t) => t.labId === labId.value))
const reviewDialog = ref(false)
const reviewForm = reactive({ studentId: null, interviewerId: null })
const evaluatedStudents = computed(() => {
  const map = new Map()
  interviews.records
    .filter((r) => r.status === 'EVALUATED')
    .forEach((r) => map.set(r.studentId, r))
  return [...map.values()]
})

const myTeacherId = computed(() => teacherIdByName(auth.realName, labId.value))
const labSlot = computed(() => labSlotOf(labId.value))
const selectedSlot = computed(() => (form.interviewer ? teacherSlotOf(labId.value, form.interviewer) : null))
const teacherSlotRows = computed(() =>
  directory.value.map((t) => ({ name: t.name, ...(teacherSlotOf(labId.value, t.name) || {}) }))
)
const labSlotRows = computed(() =>
  Object.entries(LAB_SLOTS).map(([id, slot]) => ({ id: Number(id), ...slot }))
)

const filtered = computed(() =>
  interviews.records.filter((r) => {
    if (onlyMine.value && r.interviewer !== auth.realName) return false
    if (interviewerFilter.value && r.interviewer !== interviewerFilter.value) return false
    if (statusFilter.value && r.status !== statusFilter.value) return false
    return true
  })
)

function isMine(row) {
  if (row.interviewerId) return row.interviewerId === myTeacherId.value
  return row.interviewer === auth.realName
}

function openReview() {
  if (stageClosed.value) return
  reviewForm.studentId = null
  reviewForm.interviewerId = null
  reviewDialog.value = true
}

function saveReview() {
  if (!reviewForm.studentId || !reviewForm.interviewerId) return
  const result = interviews.addEvaluation(reviewForm.studentId, reviewForm.interviewerId)
  if (!result.ok) {
    const reasons = {
      NO_TEACHER: '面试官不存在',
      NO_STUDENT: '学生不存在',
      EXISTS: '该面试官已经评价过这名学生',
      MAX_REACHED: '每名学生最多 2 位面试官评价'
    }
    ElMessage.warning(reasons[result.reason] || '添加失败')
    return
  }
  const teacher = directory.value.find((t) => t.id === Number(reviewForm.interviewerId))
  notifications.push({
    type: 'REVIEW',
    title: '新增复评任务',
    content: `${teacher?.name || '教师'} 需要评价 ${evaluatedStudents.find((s) => s.studentId === reviewForm.studentId)?.realName || '学生'}`,
    audience: { role: 'LAB_TEACHER', labId: labId.value, user: teacher?.name || '' },
    link: '/teacher/interviews'
  })
  logs.record('REVIEW', `添加复评：${teacher?.name || ''}`, String(reviewForm.studentId))
  reviewDialog.value = false
  ElMessage.success('已添加复评，请安排时间并录入评价')
}

function openSchedule() {
  if (stageClosed.value) return
  picked.value = []
  form.date = ''
  form.interviewer = directory.value.some((t) => t.name === auth.realName)
    ? auth.realName
    : directory.value[0]?.name || ''
  dialog.value = true
}

function onPick(rows) {
  picked.value = rows
}

function saveSchedule() {
  const result = interviews.scheduleStudents(
    picked.value.map((r) => r.studentId),
    { ...form }
  )
  const reasons = {
    NO_STUDENT: '请先选择学生',
    INVALID: '请完整填写日期、时间、地点与面试官',
    CONFLICT: '该面试官在这个时间已有安排，请错开时段',
    NO_PENDING: '所选学生已经评价或不在待评价状态',
    OUT_OF_SLOT: '超出该面试官的专属时段，请按提示时段安排'
  }
  if (!result.ok) {
    ElMessage.warning(reasons[result.reason] || '保存失败')
    return
  }
  dialog.value = false
  notifications.push({
    type: 'SCHEDULE',
    title: '面试安排已更新',
    content: `${form.interviewer} · ${form.date} ${form.time} · ${result.count} 人`,
    link: '/teacher/interviews'
  })
  logs.record('SCHEDULE', `排期 ${result.count} 人：${form.date} ${form.time}`, form.interviewer)
  ElMessage.success(`已为 ${result.count} 名学生安排面试`)
}

function goEvaluate(row) {
  router.push(`/teacher/interviews/${row.id}/evaluate`)
}

async function onAbsent(row) {
  if (stageClosed.value) return
  try {
    await ElMessageBox.confirm(`将 ${row.realName} 标记为面试缺勤？`, '记录面试状态', { type: 'warning' })
  } catch {
    return
  }
  const result = interviews.markAbsent(row.id)
  if (!result.ok) {
    ElMessage.warning('无法标记缺勤')
    return
  }
  ElMessage.error(`${row.realName} 已缺勤，本室除名，不能恢复、也不能进内部调剂`)
}

async function onCancelSchedule(schedule) {
  if (stageClosed.value) return
  try {
    await ElMessageBox.confirm(
      `取消 ${schedule.date} ${schedule.time} 的排期？该批 ${schedule.studentIds?.length || 0} 名学生将恢复为待排期。`,
      '取消排期批次',
      { type: 'warning' }
    )
  } catch {
    return
  }
  if (interviews.cancelSchedule(schedule.id)) {
    notifications.push({
      type: 'SCHEDULE',
      title: '面试批次已取消',
      content: `${schedule.date} ${schedule.time} · ${schedule.interviewer}`,
      link: '/teacher/interviews'
    })
    logs.record('SCHEDULE', `取消排期：${schedule.date} ${schedule.time}`, schedule.interviewer)
    ElMessage.success('已取消该批次排期')
  }
}

function onRestore(row) {
  if (stageClosed.value) return
  if (interviews.restorePending(row.id)) ElMessage.info(`${row.realName} 已恢复为待评价`)
  else ElMessage.warning('该学生已第二次缺勤，不能恢复')
}
</script>
