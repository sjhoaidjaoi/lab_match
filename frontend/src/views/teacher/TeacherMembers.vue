<template>
  <section class="page">
    <header class="page-header member-header">
      <div>
        <h1 class="page-title">小组成员</h1>
        <p class="page-desc">学生接受你的入组邀请或确认调剂到你的名下后，会自动显示在这里。</p>
      </div>
      <el-button v-if="labId" :loading="loading" @click="load">刷新</el-button>
    </header>
    <el-empty v-if="!labId" description="当前账号未绑定实训室" />
    <el-alert v-else-if="failed" type="error" title="小组名单加载失败" :closable="false">
      <el-button link @click="load">重试</el-button>
    </el-alert>
    <el-card v-else v-loading="loading" shadow="never">
      <template #header>本组成员 · {{ members.length }} 人</template>
      <el-table :data="members" row-key="studentId" stripe empty-text="暂无已同意入组的学生">
        <el-table-column prop="studentName" label="姓名" min-width="110" />
        <el-table-column prop="studentNumber" label="学号" min-width="120" />
        <el-table-column label="加入方式" min-width="115">
          <template #default="{ row }">{{ row.source === 'INVITATION' ? '接受邀请' : '确认调剂' }}</template>
        </el-table-column>
        <el-table-column label="加入时间" min-width="160">
          <template #default="{ row }">{{ formatTime(row.joinedAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { labApi, type TeacherGroupMember } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'
import { formatTime } from '../college/shared'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId)
const members = ref<TeacherGroupMember[]>([])
const loading = ref(false)
const failed = ref(false)

async function load() {
  if (!labId.value) return
  loading.value = true
  failed.value = false
  try { members.value = await labApi.teacherMembers() }
  catch { failed.value = true }
  finally { loading.value = false }
}

watch(labId, load, { immediate: true })
</script>

<style scoped>
.member-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
</style>
