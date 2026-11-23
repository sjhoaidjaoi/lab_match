<template>
  <div class="portal-home page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">教师工作台</h2>
          <p class="page-desc">{{ stats?.lab?.name || '实训室选拔' }}</p>
        </div>
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <WorkspaceShortcuts title="教师业务" :items="shortcuts" />
    <el-card v-if="!labId" shadow="never">
      <el-empty description="未绑定实训室" />
    </el-card>

    <div v-else v-loading="loading">
      <el-alert v-if="failed" type="warning" title="部分工作台数据暂未读取" :closable="false">
        <el-button text @click="load">重新读取</el-button>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { labApi, type TeacherInvitationProgress, type LabStats } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'
import WorkspaceShortcuts from '@/components/WorkspaceShortcuts.vue'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const stats = ref<LabStats | null>(null)
const progress = ref<TeacherInvitationProgress>()
const loading = ref(false)
const failed = ref(false)

const shortcuts = computed(() => {
  const invitations = progress.value?.invitations
  const count = (status: string) => invitations?.filter(item => item.status === status).length ?? '—'
  return [
    { path: '/teacher/applications', title: '查看报名学生', icon: 'User', detail: `我的报名 ${stats.value?.applicationCount ?? '—'} 人` },
    { path: '/teacher/interviews', title: '安排与评价面试', icon: 'Calendar', detail: `已排期待面试 ${stats.value?.pendingInterview ?? '—'} 人 · 已面试 ${stats.value?.interviewed ?? '—'} 人` },
    { path: '/teacher/confirmation-status', title: '跟进入组邀请', icon: 'CircleCheck', detail: `待回复 ${count('PENDING')} · 已同意 ${count('CONFIRMED')} · 已放弃 ${count('REJECTED')}` }
  ]
})

async function load() {
  if (!labId.value || loading.value) return
  loading.value = true
  try {
    const [summary, invitations] = await Promise.allSettled([labApi.stats(labId.value), labApi.teacherInvitations()])
    stats.value = summary.status === 'fulfilled' ? summary.value : null
    progress.value = invitations.status === 'fulfilled' ? invitations.value : undefined
    failed.value = summary.status === 'rejected' || invitations.status === 'rejected'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
</style>
