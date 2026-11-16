<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">{{ stats?.lab?.name || '教师工作台' }}</h2>
          <p class="page-desc">你的报名学生、面试与入组邀请进度。</p>
        </div>
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <el-card v-if="!labId" shadow="never">
      <el-empty description="未绑定实训室" />
    </el-card>

    <div v-else v-loading="loading">
      <el-row v-if="stats" :gutter="14" class="stat-row">
        <el-col v-for="card in statCards" :key="card.label" :xs="12" :sm="6" :lg="3">
          <div class="stat-card">
            <div class="stat-label">{{ card.label }}</div>
            <div class="stat-value">
              {{ card.value }}<span v-if="card.unit" class="stat-unit">{{ card.unit }}</span>
            </div>
          </div>
        </el-col>
      </el-row>
      <el-empty v-else-if="!loading" description="暂无统计数据" />

      <el-card shadow="never">
        <template #header><span>快捷入口</span></template>
        <WorkspaceShortcuts :items="shortcuts" />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { labApi, type TeacherInvitationProgress, type LabStats } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'
import WorkspaceShortcuts from '@/components/WorkspaceShortcuts.vue'
import { menus } from '@/router/menus'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const stats = ref<LabStats | null>(null)
const progress = ref<TeacherInvitationProgress>()
const loading = ref(false)

const statCards = computed(() => [
  { label: '我的报名', value: stats.value?.applicationCount ?? 0, unit: '人' },
  { label: '待面试', value: stats.value?.pendingInterview ?? 0, unit: '人' },
  { label: '已面试', value: stats.value?.interviewed ?? 0, unit: '人' },
  { label: '待回复', value: progress.value?.invitations.filter(item => item.status === 'PENDING').length ?? 0, unit: '人' },
  { label: '已同意', value: progress.value?.invitations.filter(item => item.status === 'CONFIRMED').length ?? 0, unit: '人' },
  { label: '已放弃', value: progress.value?.invitations.filter(item => item.status === 'REJECTED').length ?? 0, unit: '人' }
])

const shortcuts = menus.LAB_TEACHER.filter(item => !['/teacher/dashboard', '/teacher/help'].includes(item.path))

async function load() {
  if (!labId.value) return
  loading.value = true
  try {
    const [s, a] = await Promise.all([labApi.stats(labId.value), labApi.teacherInvitations()])
    stats.value = s
    progress.value = a
  } catch (err) {
    console.error('教师工作台数据加载失败', err)
    ElMessage.error('工作台数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.stat-row { margin-bottom: 14px; }
.stat-card { padding: 14px 16px; margin-bottom: 12px; }
.stat-label { color: var(--lm-text-secondary); font-size: 12.5px; }
.stat-value { font-size: 24px; font-weight: 600; margin-top: 6px; color: #1f2937; }
.stat-unit { font-size: 12px; font-weight: 400; color: var(--lm-text-secondary); margin-left: 3px; }
</style>
