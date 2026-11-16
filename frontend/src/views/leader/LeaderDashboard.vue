<template>
  <section class="page" v-loading="loading">
    <header class="page-header">
      <h1 class="page-title">组长工作台</h1>
      <p v-if="stats?.lab" class="page-desc">{{ stats.lab.name }}</p>
    </header>
    <el-empty v-if="!labId" description="当前账号未绑定实训室" />
    <el-alert v-else-if="failed" type="error" title="实训室统计加载失败" :closable="false">
      <el-button link @click="load">重试</el-button>
    </el-alert>
    <el-row v-else-if="stats" :gutter="14">
      <el-col v-for="card in cards" :key="card.label" :xs="24" :sm="8">
        <div class="stat-card">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}<small>{{ card.unit }}</small></strong>
        </div>
      </el-col>
    </el-row>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { labApi, type LabStats } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId)
const stats = ref<LabStats>()
const loading = ref(false)
const failed = ref(false)
const cards = computed(() => [
  { label: '总报名人数', value: stats.value?.applicationCount, unit: '人' },
  { label: '计划名额', value: stats.value?.quota, unit: '个' },
  { label: '最终录取人数', value: stats.value?.admitted, unit: '人' }
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

<style scoped>
.stat-card { padding: 17px 19px; margin-bottom: 12px; color: var(--lm-text-secondary); }
.stat-card strong { display: block; margin-top: 6px; color: var(--lm-text); font-size: 27px; }
.stat-card small { margin-inline-start: 4px; color: var(--lm-text-secondary); font-size: 13px; font-weight: 400; }
</style>
