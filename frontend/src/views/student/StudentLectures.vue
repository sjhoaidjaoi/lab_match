<template>
  <section v-loading="loading" class="student-page">
    <header class="page-header">
      <h1>{{ openDay ? '实训室开放日' : '集中宣讲' }}</h1>
      <p>{{ openDay ? '选择实训室，观看组长发布的云游视频。' : '选择实训室，查看简介、宣讲文稿和介绍视频。' }}</p>
    </header>
    <el-input v-model="query" clearable placeholder="搜索实训室或研究方向" aria-label="搜索实训室" />
    <el-alert v-if="failed" title="实训室加载失败" type="error" :closable="false"><el-button text @click="load">重试</el-button></el-alert>
    <el-empty v-else-if="!loading && !filteredLabs.length" :description="labs.length ? '没有匹配的实训室，请更换名称或研究方向' : '暂无实训室资料'" />
    <ul v-else class="student-lab-list" aria-label="实训室列表">
      <li v-for="lab in filteredLabs" :key="lab.id">
        <RouterLink class="student-lab-link"
          :to="openDay ? '/student/labs/' + lab.id + '/tour' : '/student/announcement/' + lab.id">
          <div class="student-lab-summary">
            <h2>{{ lab.name }}</h2>
            <p v-if="lab.projectDirection">{{ lab.projectDirection }}</p>
          </div>
          <span class="student-lab-action">
            {{ openDay ? '进入开放日' : '查看宣讲资料' }} <span aria-hidden="true">→</span>
          </span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { LabView } from '@/types'
import { studentApi } from '@/api/student'

defineProps<{ openDay?: boolean }>()
const labs = ref<LabView[]>([])
const query = ref('')
const loading = ref(false)
const failed = ref(false)
const filteredLabs = computed(() => labs.value.filter(lab =>
  [lab.name, lab.projectDirection].some(value => value?.toLowerCase().includes(query.value.trim().toLowerCase()))
))
async function load() {
  loading.value = true
  failed.value = false
  try {
    labs.value = await studentApi.labs()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
