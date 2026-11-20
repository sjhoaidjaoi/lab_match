<template>
  <section class="page">
    <header class="page-header">
      <h1 class="page-title">实训室学生汇总</h1>
      <p class="page-desc">按导师查看全室学生、录取确认和名单报送。</p>
    </header>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="按教师汇总" name="groups" lazy>
        <section v-loading="loading" class="group-list">
          <el-card v-if="progress" shadow="never">
            <div class="group-actions">
              <span>报名 {{ progress.applications }}</span><span>已预约 / 进行中 {{ progress.scheduled }}</span>
              <span>已完成 {{ progress.completed }}</span><span>待评价 {{ progress.pendingEvaluation }}</span>
              <span>已评价 {{ progress.evaluated }}</span><span>异常 {{ progress.abnormal }}</span>
              <router-link to="/leader/internal-allocation">内部调剂 · {{ progress.pendingAdjustment }} 条待确认 →</router-link>
            </div>
          </el-card>
          <div class="group-actions"><span>教师按姓氏拼音排列</span><el-button :loading="loading" @click="loadGroups">刷新</el-button></div>
          <div class="group-filters">
            <el-input v-model="search" clearable placeholder="搜索姓名、学号、导师或方向" />
            <el-select v-model="state" clearable placeholder="全部面试状态">
              <el-option v-for="(label, key) in appointments" :key="key" :label="label" :value="key" />
            </el-select>
            <el-input-number v-model="minimum" :min="0" :max="100" :controls="false" placeholder="最低汇总分" aria-label="最低汇总分" />
          </div>
          <el-alert v-if="failed" type="error" title="学生汇总加载失败" :closable="false" />
          <el-empty v-else-if="!loading && !filtered.length" description="没有匹配的教师学生名单" />
          <el-card v-for="group in filtered.slice((page - 1) * 8, page * 8)" :key="group.key" shadow="never">
            <template #header>{{ group.teacherName }} · {{ group.students.length }} 名学生</template>
            <el-table :data="group.students.slice(((studentPages[group.key] || 1) - 1) * 15, (studentPages[group.key] || 1) * 15)" row-key="studentId" empty-text="暂无学生报名">
              <el-table-column prop="studentName" label="姓名" min-width="100" />
              <el-table-column prop="studentNumber" label="学号" min-width="115" />
              <el-table-column label="面试状态" min-width="110">
                <template #default="{ row }">{{ appointments[row.appointmentStatus || 'UNSCHEDULED'] }}</template>
              </el-table-column>
              <el-table-column prop="direction" label="方向" min-width="120" />
              <el-table-column label="汇总分" min-width="100">
                <template #default="{ row }">{{ row.evaluationSummary?.total ?? '—' }}<el-tag v-if="row.evaluationSummary?.review" type="warning" size="small">需复核</el-tag></template>
              </el-table-column>
              <el-table-column label="面试结论" min-width="100">
                <template #default="{ row }">{{ row.recommendation === 'INTENDED' ? '通过' : RECOMMENDATION_LABELS[row.recommendation] || '—' }}</template>
              </el-table-column>
              <el-table-column label="邀请结果" min-width="115">
                <template #default="{ row }">{{ ADMISSION_STATUS_LABELS[row.invitationStatus] || '未发送' }}</template>
              </el-table-column>
              <el-table-column label="资料" min-width="170">
                <template #default="{ row }">
                  <InterviewEvaluationRead v-if="row.interviewId" :interview-id="row.interviewId" />
                  <router-link v-if="row.online" :to="{ path: '/leader/interview-archives', query: { interviewId: row.interviewId } }">档案 →</router-link>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination v-if="group.students.length > 15" v-model:current-page="studentPages[group.key]" :page-size="15" :total="group.students.length" layout="prev,pager,next" />
          </el-card>
          <el-pagination v-if="filtered.length > 8" v-model:current-page="page" :page-size="8" :total="filtered.length" layout="prev,pager,next" />
        </section>
      </el-tab-pane>
      <el-tab-pane label="名单与报送" name="lists" lazy>
        <RecruitmentLists embedded :candidate-category="route.query.tab === 'alternates' ? 'ALTERNATE' : undefined" />
      </el-tab-pane>
      <el-tab-pane label="录取确认" name="confirmation" lazy>
        <LeaderConfirmation v-if="activeTab === 'confirmation'" />
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { recruitmentApi, type LabStudentGroup } from '@/api/recruitment'
import RecruitmentLists from '@/views/common/RecruitmentLists.vue'
import InterviewEvaluationRead from '@/views/common/InterviewEvaluationRead.vue'
import { appointments, interviewSelection, type ProgressRow } from '@/api/interviewSelection'
import LeaderConfirmation from './LeaderConfirmation.vue'
import { ADMISSION_STATUS_LABELS, RECOMMENDATION_LABELS } from '../college/shared'

const route = useRoute()
const router = useRouter()
const groups = ref<LabStudentGroup[]>([])
const loading = ref(false)
const failed = ref(false)
const progress = ref<ProgressRow>()
const search = ref('')
const state = ref('')
const minimum = ref<number>()
const page = ref(1)
const studentPages = ref<Record<string, number>>({})
const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  const min = minimum.value
  return groups.value.map(group => ({ ...group, students: group.students.filter(row =>
    (!state.value || row.appointmentStatus === state.value) &&
    (min == null || (row.evaluationSummary?.total ?? -1) >= min) &&
    (!query || [group.teacherName, row.studentName, row.studentNumber, row.direction].some(value => value?.toLowerCase().includes(query)))
  ) })).filter(group => (!query && !state.value && min == null) || group.students.length)
})
watch([search, state, minimum], () => { page.value = 1; studentPages.value = {} })
const activeTab = computed({
  get: () => {
    const tab = route.query.tab
    if (tab === 'confirmation') return 'confirmation'
    if (tab === 'lists' || tab === 'alternates') return 'lists'
    return 'groups'
  },
  set: (tab: string) => {
    void router.replace({ query: { ...route.query, tab: tab === 'groups' ? undefined : tab } })
  }
})

async function loadGroups() {
  loading.value = true
  failed.value = false
  try {
    const [records, summary] = await Promise.all([recruitmentApi.labStudents(), interviewSelection.progress()])
    groups.value = records
    progress.value = summary.perLab[0]
  }
  catch { failed.value = true }
  finally { loading.value = false }
}

watch(activeTab, tab => { if (tab === 'groups') void loadGroups() }, { immediate: true })
</script>

<style scoped>
.group-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
.group-actions { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; color: var(--lm-text-secondary); }
.group-filters { display: grid; grid-template-columns: minmax(160px, 1fr) minmax(140px, 200px) max-content; gap: 10px; }
@media (max-width: 640px) { .group-filters { grid-template-columns: 1fr; } }
</style>
