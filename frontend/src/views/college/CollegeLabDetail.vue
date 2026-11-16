<template>
  <section class="page college-lab" v-loading="loading">
    <header class="page-header">
      <RouterLink to="/college/labs">← 返回实训室统筹</RouterLink>
      <h1 class="page-title">{{ lab?.name || '实训室详情' }}</h1>
      <p class="page-desc">查看本室资料、招生名额和教师名单，协调组长账号绑定。</p>
    </header>
    <el-empty v-if="!loading && !lab" description="实训室不存在或无法读取" />
    <template v-if="lab">
      <el-card shadow="never">
        <template #header>实训室资料</template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="项目方向">{{ lab.projectDirection || '—' }}</el-descriptions-item>
          <el-descriptions-item label="技术栈">{{ lab.technologyStack || '—' }}</el-descriptions-item>
          <el-descriptions-item label="计划招生 / 报名">{{ lab.recruitmentQuota }} / {{ lab.applicationCount ?? 0 }} 人</el-descriptions-item>
          <el-descriptions-item label="状态">{{ lab.status === 'ACTIVE' ? '启用' : '停用' }}</el-descriptions-item>
          <el-descriptions-item label="简介">{{ lab.description || '—' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>
      <el-card shadow="never">
        <template #header>组长绑定</template>
        <p>当前组长：{{ lab.leaderName || '未指定' }}</p>
        <div class="leader-coordination">
          <el-select v-model="leaderId" clearable :value-on-clear="null" placeholder="选择已绑定本室的组长账号" aria-label="组长账号">
            <el-option v-for="item in eligibleLeaders" :key="item.id" :label="item.realName + ' · ' + item.username" :value="item.id" />
          </el-select>
          <el-button type="primary" :loading="saving" :disabled="(leaderId ?? null) === (lab.leaderId ?? null)" @click="saveLeader">保存绑定</el-button>
        </div>
      </el-card>
      <el-card shadow="never">
        <template #header>本室教师</template>
        <el-table :data="members" empty-text="暂无教师账号">
          <el-table-column prop="realName" label="姓名" min-width="100" />
          <el-table-column prop="username" label="工号" min-width="120" />
          <el-table-column label="角色" min-width="110"><template #default="{ row }">{{ row.role === 'LAB_LEADER' ? '组长兼教师' : '教师' }}</template></el-table-column>
          <el-table-column label="状态" min-width="90"><template #default="{ row }">{{ row.status === 'ACTIVE' ? '启用' : '停用' }}</template></el-table-column>
        </el-table>
      </el-card>
      <el-card shadow="never">
        <template #header>导师分工与名额</template>
        <el-table :data="mentors" empty-text="暂无导师资料">
          <el-table-column prop="name" label="姓名" min-width="100" />
          <el-table-column prop="direction" label="研究方向" min-width="130" />
          <el-table-column label="名额" min-width="100"><template #default="{ row }">{{ row.recruitmentQuota ?? '本室统筹' }}</template></el-table-column>
        </el-table>
      </el-card>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { collegeApi, listOf } from '@/api/college'
import { http } from '@/api/request'
import type { LabTeacher } from '@/api/student'
import type { LabView, UserAccount } from '@/types'

const route = useRoute()
const labId = computed(() => Number(route.params.id))
const lab = ref<LabView | null>(null)
const members = ref<UserAccount[]>([])
const mentors = ref<LabTeacher[]>([])
const leaderId = ref<number | null>(null)
const loading = ref(false)
const saving = ref(false)
const eligibleLeaders = computed(() => members.value.filter(user => user.role === 'LAB_LEADER' && user.status === 'ACTIVE'))

async function load() {
  const id = labId.value
  loading.value = true
  try {
    const [labs, accounts, profiles] = await Promise.all([
      collegeApi.labs(), collegeApi.users({ laboratoryId: id }), http.get<LabTeacher[]>(`/laboratories/${id}/teachers`)
    ])
    if (labId.value !== id) return
    lab.value = labs.find(item => item.id === id) ?? null
    members.value = listOf(accounts).filter(item => ['LAB_TEACHER', 'LAB_LEADER'].includes(item.role))
    mentors.value = profiles
    leaderId.value = lab.value?.leaderId ?? null
  } catch { /* 请求层展示读取失败原因。 */ }
  finally { if (labId.value === id) loading.value = false }
}

async function saveLeader() {
  if (!lab.value || saving.value) return
  saving.value = true
  try {
    await collegeApi.updateLab(lab.value.id, { leaderId: leaderId.value ?? null })
    ElMessage.success('组长绑定已保存')
    await load()
  } catch { /* 请求层展示保存失败原因。 */ }
  finally { saving.value = false }
}

watch(labId, load, { immediate: true })
</script>

<style scoped>
.college-lab { display: grid; gap: 16px; }
.page-header { margin: 0; }
.page-title { margin-top: 10px; }
.leader-coordination { display: flex; flex-wrap: wrap; gap: 10px; }
.leader-coordination .el-select { width: min(100%, 280px); }
</style>
