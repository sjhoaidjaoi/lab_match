<template>
  <div class="page-container labs-page">
    <div class="page-head">
      <h1>实训室</h1>
      <p class="subtitle">浏览全院实训室的研究方向、导师团队与招录名额</p>
    </div>

    <el-card shadow="never" class="filter-card">
      <div class="filters">
        <el-input
          v-model="keyword"
          class="keyword"
          placeholder="实训室名称关键词，回车搜索"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-input
          v-model="departmentFilter"
          class="department"
          placeholder="所属系部，回车搜索"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-select
          v-model="statusFilter"
          class="status"
          placeholder="招录状态"
          clearable
          @change="handleSearch"
        >
          <el-option label="招录中" :value="1" />
          <el-option label="未开放" :value="0" />
        </el-select>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </el-card>

    <div v-loading="loading" class="lab-grid-wrap">
      <div v-if="labs.length > 0" class="lab-grid">
        <LabCard v-for="lab in labs" :key="lab.id" :lab="lab" />
      </div>
      <el-empty v-else-if="!loading" description="暂无实训室信息" />
    </div>

    <div class="pagination">
      <el-pagination
        v-model:current-page="pageNum"
        :page-size="PAGE_SIZE"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="loadLabs"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import LabCard from '@/components/public/LabCard.vue'
import { listPublicLabs } from '@/api/public'
import type { PublicLabListItem } from '@/types/public'

const PAGE_SIZE = 12

const loading = ref(false)
const labs = ref<PublicLabListItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const keyword = ref('')
const departmentFilter = ref('')
const statusFilter = ref<number | undefined>(undefined)

async function loadLabs() {
  loading.value = true
  try {
    const page = await listPublicLabs({
      keyword: keyword.value.trim() || undefined,
      department: departmentFilter.value.trim() || undefined,
      status: statusFilter.value,
      pageNum: pageNum.value,
      pageSize: PAGE_SIZE
    })
    labs.value = page.list
    total.value = page.total
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pageNum.value = 1
  loadLabs()
}

function handleReset() {
  keyword.value = ''
  departmentFilter.value = ''
  statusFilter.value = undefined
  handleSearch()
}

onMounted(loadLabs)
</script>

<style scoped>
.labs-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-head h1 {
  margin: 0 0 6px;
  font-size: 24px;
  color: #1f2d3d;
}

.subtitle {
  margin: 0 0 20px;
  font-size: 14px;
  color: #909399;
}

.filter-card {
  margin-bottom: 16px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.keyword {
  width: 280px;
}

.department {
  width: 200px;
}

.status {
  width: 160px;
}

.lab-grid-wrap {
  min-height: 260px;
}

.lab-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

@media (max-width: 1000px) {
  .lab-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .lab-grid {
    grid-template-columns: 1fr;
  }

  .keyword,
  .department,
  .status {
    width: 100%;
  }
}
</style>
