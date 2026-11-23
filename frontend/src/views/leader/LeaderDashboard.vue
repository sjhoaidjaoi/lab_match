<template>
  <section class="portal-home page" v-loading="loading">
    <header class="page-header">
      <h1 class="page-title">组长工作台</h1>
      <p v-if="stats?.lab" class="page-desc">{{ stats.lab.name }}</p>
    </header>
    <el-empty v-if="!labId" description="当前账号未绑定实训室" />
    <WorkspaceShortcuts title="本室选拔办理" :items="shortcuts" />
    <el-alert v-if="labId && failed" type="error" title="实训室统计加载失败" :closable="false">
      <el-button link @click="load">重试</el-button>
    </el-alert>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import WorkspaceShortcuts from '@/components/WorkspaceShortcuts.vue'
import { labApi, type LabStats } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId)
const stats = ref<LabStats>()
const loading = ref(false)
const failed = ref(false)
const shortcuts = computed(() => [
  { path: '/leader/lab-selection', title: '汇总学生与报送名单', icon: 'List', detail: `报名 ${stats.value?.applicationCount ?? '—'} 人 · 最终录取 ${stats.value?.admitted ?? '—'} 人` },
  { path: '/leader/online-interviews', title: '进入线上面试', icon: 'VideoCamera', detail: '查看本室面试场次与安排' },
])

async function load() {
  if (!labId.value) return
  loading.value = true
  failed.value = false
  try { stats.value = await labApi.stats(labId.value) }
  catch { failed.value = true }
  finally { loading.value = false }
}

watch(labId, load, { immediate: true })
</script>
