<template>
  <section :class="{ page: !embedded }" v-loading="loading">
    <h1 v-if="!embedded" class="page-title">{{ college ? '实训室名单审核' : leader ? '实训室学生汇总' : '选拔名单' }}</h1>
    <el-alert v-if="failed" title="名单数据加载失败" type="error" :closable="false"><el-button text @click="load">重试</el-button></el-alert>
    <el-card v-if="!college" shadow="never">
      <p>实训室总名额 {{ quota }}。{{ leader ? '整理教师已发出的入组邀请和面试通过名单。' : '保存草稿或提交组长审核。' }}</p>
      <p v-if="mentors.length">导师名额：{{ mentors.map(item => item.name + ' ' + (item.recruitmentQuota ?? '由本室统筹')).join(' · ') }}</p>
      <el-radio-group v-if="leader" v-model="candidateTab" aria-label="学生名单类别">
        <el-radio-button value="INTENDED">面试通过（{{ candidateCounts.INTENDED }}）</el-radio-button>
        <el-radio-button value="ALTERNATE">递补建议（{{ candidateCounts.ALTERNATE }}）</el-radio-button>
      </el-radio-group>
      <el-table :data="visibleCandidates" :empty-text="leader ? '暂无此类学生' : '暂无已完成面试的学生'">
        <el-table-column prop="studentName" label="学生" min-width="110" />
        <el-table-column prop="studentNumber" label="学号" min-width="110" />
        <el-table-column prop="labTeacherName" label="导师" min-width="110" />
        <el-table-column v-if="leader" label="名单来源" min-width="130">
          <template #default="{row}">{{ row.source === 'INVITATION' ? '导师已发邀请' : row.source === 'LEADER' ? '组长本人面试' : '教师已提交' }}</template>
        </el-table-column>
        <el-table-column label="面试评价" min-width="140"><template #default="{row}">{{ row.interview?.evaluation || '—' }}</template></el-table-column>
        <el-table-column label="建议" min-width="130"><template #default="{row}"><el-select v-model="draft[row.studentId].type" clearable :disabled="locked"><el-option label="拟录取" value="INTENDED" /><el-option v-if="row.source !== 'INVITATION'" label="递补" value="ALTERNATE" /></el-select></template></el-table-column>
        <el-table-column label="原因" min-width="210"><template #default="{row}"><el-input v-model="draft[row.studentId].reason" maxlength="1000" :disabled="locked" /></template></el-table-column>
        <el-table-column label="简历" width="85"><template #default="{row}"><el-button v-if="row.resume" link @click="download(row.resume)">下载</el-button><span v-else>未上传</span></template></el-table-column>
      </el-table>
      <div class="review-actions">
        <el-button v-if="!leader" :disabled="locked || !candidates.length" :loading="busy" @click="save(false)">保存草稿</el-button>
        <el-button type="primary" :disabled="locked || !candidates.length" :loading="busy" @click="save(true)">{{ leader ? '提交学院' : '提交组长' }}</el-button>
        <el-button v-if="leader" :loading="busy" @click="submitInternal">提交内部调剂情况</el-button>
      </div>
    </el-card>
    <el-card shadow="never" class="review-history">
      <template #header>提交记录</template>
      <el-empty v-if="!reviews.length && !loading" description="暂无名单" />
      <details v-for="row in reviews" :key="row.id">
        <summary>{{ row.laboratoryName }} · {{ kinds[row.kind] }}<template v-if="row.authorName"> · {{ row.authorName }}</template> · {{ statuses[row.status] }} · 第 {{ row.version }} 版 · {{ formatDateTime(row.submittedAt) }}</summary>
        <p v-if="row.labStatus">本室报送状态：{{ statuses[row.labStatus] }}</p>
        <p v-if="row.returnReason">退回原因：{{ row.returnReason }}</p>
        <ul v-if="row.entries?.length"><li v-for="entry in row.entries" :key="entry.studentId">{{ entry.studentName || entry.studentId }} · {{ entry.type === 'INTENDED' ? '拟录取' : '递补' }} · {{ entry.reason }}
          <el-button v-if="entry.resume" link @click="download(entry.resume)">下载简历</el-button>
        </li></ul>
        <ul v-if="row.adjustments?.length"><li v-for="item in row.adjustments" :key="item.id">{{ item.studentId }} · {{ item.status }} · {{ item.reason }}</li></ul>
        <div v-if="row.status === 'SUBMITTED'" class="review-actions">
          <el-button v-if="leader && row.kind === 'TEACHER'" :disabled="locked" :loading="busy" @click="importEntries(row)">采纳建议</el-button>
          <el-button v-if="college || (leader && row.kind === 'TEACHER')" :loading="busy" @click="returnList(row)">退回</el-button>
          <el-button v-if="college" type="primary" :loading="busy" @click="approve(row)">{{ row.kind === 'LAB' ? '审核并发布学生通知' : '审核通过' }}</el-button>
        </div>
      </details>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { recruitmentApi, type LabReviewCandidate, type RecruitmentReview, type Resume, type ReviewEntry } from '@/api/recruitment'
import { labApi, type PreferenceRow } from '@/api/lab'
import { formatDateTime, studentApi, type LabTeacher } from '@/api/student'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const props = defineProps<{ embedded?: boolean; candidateCategory?: ReviewEntry['type'] }>()
const leader = computed(() => auth.currentRole === 'LAB_LEADER')
const college = computed(() => auth.currentRole === 'COLLEGE_ADMIN')
const reviews = ref<RecruitmentReview[]>([])
type Candidate = Pick<PreferenceRow, 'studentId' | 'studentName' | 'labTeacherName' | 'interview'> &
  Partial<Pick<LabReviewCandidate, 'studentNumber' | 'source' | 'suggestedType' | 'reason' | 'resume'>>
const candidates = ref<Candidate[]>([])
const candidateTab = ref<ReviewEntry['type']>(props.candidateCategory ?? 'INTENDED')
watch(() => props.candidateCategory, category => {
  if (category) candidateTab.value = category
})
const candidateCounts = computed(() => ({
  INTENDED: candidates.value.filter(item => item.suggestedType === 'INTENDED').length,
  ALTERNATE: candidates.value.filter(item => item.suggestedType === 'ALTERNATE').length
}))
const visibleCandidates = computed(() => leader.value
  ? candidates.value.filter(item => item.suggestedType === candidateTab.value)
  : candidates.value)
const draft = reactive<Record<number, { type: ReviewEntry['type'] | ''; reason: string }>>({})
const quota = ref(0)
const mentors = ref<LabTeacher[]>([])
const busy = ref(false)
const loading = ref(false)
const failed = ref(false)
const kinds = { TEACHER: '教师建议', LAB: '实训室名单', INTERNAL: '内部调剂' }
const statuses = { DRAFT: '草稿', SUBMITTED: '已提交', RETURNED: '已退回', APPROVED: '已通过' }
const own = computed(() => reviews.value.filter(row =>
  row.kind === (leader.value ? 'LAB' : 'TEACHER') && (leader.value || row.authorId === auth.user?.id))
  .sort((a, b) => b.version - a.version)[0])
const locked = computed(() => own.value?.status === 'SUBMITTED' || own.value?.status === 'APPROVED')

function importEntries(row: RecruitmentReview) {
  for (const item of row.entries ?? []) {
    if (draft[item.studentId]) draft[item.studentId] = { type: item.type, reason: item.reason }
  }
}
async function load() {
  loading.value = true
  failed.value = false
  try {
    reviews.value = await recruitmentApi.reviews()
    const id = auth.user?.laboratoryId
    if (id && !college.value) {
      const [rows, lab] = await Promise.all([
        leader.value ? recruitmentApi.labCandidates() : labApi.preferences(id),
        studentApi.labDetail(id)
      ])
      quota.value = lab.recruitmentQuota
      mentors.value = lab.teachers ?? []
      candidates.value = rows.filter(row => row.interview?.interviewStatus === 'COMPLETED')
      for (const row of candidates.value) {
        draft[row.studentId] = own.value
          ? { type: '', reason: '' }
          : { type: row.suggestedType ?? '', reason: row.reason ?? '' }
      }
      if (own.value) importEntries(own.value)
    }
  } catch { failed.value = true }
  finally { loading.value = false }
}
async function act(action: () => Promise<unknown>) {
  if (busy.value) return
  busy.value = true
  try { await action(); ElMessage.success('名单状态已更新'); await load() }
  catch { /* 请求层显示错误。 */ }
  finally { busy.value = false }
}
function save(submit: boolean) {
  const entries = candidates.value.flatMap(row => {
    const item = draft[row.studentId]
    return item.type ? [{ studentId: row.studentId, type: item.type, reason: item.reason.trim() }] : []
  })
  if (!entries.length || (submit && entries.some(item => !item.reason))) return ElMessage.warning('请选择候选学生，正式提交时须填写每人的原因')
  void act(() => leader.value ? recruitmentApi.submitLab(entries) : recruitmentApi.saveTeacher(entries, submit))
}
async function returnList(row: RecruitmentReview) {
  try {
    const { value } = await ElMessageBox.prompt('请填写退回原因', '退回名单', { inputValidator: value => Boolean(value?.trim()) })
    const reason = String(value).trim()
    await act(() => college.value ? recruitmentApi.review(row, false, reason) : recruitmentApi.returnTeacher(row.id, reason))
  } catch { /* 用户取消退回。 */ }
}
async function approve(row: RecruitmentReview) {
  const accepted = await ElMessageBox.confirm('确认审核通过此版本？', '审核名单').then(() => true, () => false)
  if (accepted) await act(() => recruitmentApi.review(row, true))
}
async function submitInternal() {
  const accepted = await ElMessageBox.confirm('提交本室内部调剂最终情况？阶段结束时仍未确认的通知将失效。', '提交内部调剂').then(() => true, () => false)
  if (accepted) await act(() => recruitmentApi.submitInternal())
}
function download(item: Resume) { void recruitmentApi.download(item).catch(() => undefined) }
onMounted(load)
</script>

<style scoped>
.review-history, .review-actions { margin-top: 16px; }
.review-history details { padding: 12px 0; border-bottom: 1px solid #eaded4; }
.review-history summary { cursor: pointer; }
</style>
