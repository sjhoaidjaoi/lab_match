<template>
  <section class="page">
    <header class="page-header">
      <h1 class="page-title">实训室学生汇总</h1>
      <p class="page-desc">按导师查看全室学生、录取确认和名单报送。</p>
    </header>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="按教师汇总" name="groups" lazy>
        <section v-loading="loading" class="group-list">
          <div class="group-actions"><span>教师按姓氏拼音排列</span><el-button :loading="loading" @click="loadGroups">刷新</el-button></div>
          <el-alert v-if="failed" type="error" title="学生汇总加载失败" :closable="false" />
          <el-empty v-else-if="!loading && !groups.length" description="本实训室暂无教师学生名单" />
          <el-card v-for="group in groups" :key="group.key" shadow="never">
            <template #header>{{ group.teacherName }} · {{ group.students.length }} 名报名学生</template>
            <el-table :data="group.students" row-key="studentId" empty-text="暂无学生报名">
              <el-table-column prop="studentName" label="姓名" min-width="100" />
              <el-table-column prop="studentNumber" label="学号" min-width="115" />
              <el-table-column label="面试状态" min-width="110">
                <template #default="{ row }">{{ INTERVIEW_STATUS_LABELS[row.interviewStatus] || '未安排' }}</template>
              </el-table-column>
              <el-table-column label="面试结论" min-width="100">
                <template #default="{ row }">{{ row.recommendation === 'INTENDED' ? '通过' : RECOMMENDATION_LABELS[row.recommendation] || '—' }}</template>
              </el-table-column>
              <el-table-column label="邀请结果" min-width="115">
                <template #default="{ row }">{{ ADMISSION_STATUS_LABELS[row.invitationStatus] || '未发送' }}</template>
              </el-table-column>
            </el-table>
          </el-card>
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
import LeaderConfirmation from './LeaderConfirmation.vue'
import { ADMISSION_STATUS_LABELS, INTERVIEW_STATUS_LABELS, RECOMMENDATION_LABELS } from '../college/shared'

const route = useRoute()
const router = useRouter()
const groups = ref<LabStudentGroup[]>([])
const loading = ref(false)
const failed = ref(false)
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
  try { groups.value = await recruitmentApi.labStudents() }
  catch { failed.value = true }
  finally { loading.value = false }
}

watch(activeTab, tab => { if (tab === 'groups') void loadGroups() }, { immediate: true })
</script>

<style scoped>
.group-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
.group-actions { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; color: var(--lm-text-secondary); }
</style>
