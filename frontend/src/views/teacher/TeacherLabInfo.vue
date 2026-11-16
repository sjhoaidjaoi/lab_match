<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">本实训室信息</h2>
      <p class="page-desc">查看本实训室的方向、名额与宣讲资料。</p>
    </div>

    <el-card v-if="!labId" shadow="never">
      <el-empty description="未绑定实训室" />
    </el-card>

    <el-card v-else v-loading="loading" shadow="never">
      <template v-if="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="实训室名称">{{ detail.name }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{ detail.leaderName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="项目方向">{{ detail.projectDirection || '—' }}</el-descriptions-item>
          <el-descriptions-item label="技术栈">{{ detail.technologyStack || '—' }}</el-descriptions-item>
          <el-descriptions-item label="计划名额">{{ detail.recruitmentQuota }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detail.status === 'ACTIVE' ? 'success' : 'info'" effect="light">
              {{ detail.status === 'ACTIVE' ? '正常' : detail.status }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="section">
          <div class="section-title">实训室简介</div>
          <p class="section-text">{{ detail.description || '暂无简介' }}</p>
        </div>

        <div class="section">
          <div class="section-title">宣讲文字</div>
          <p class="section-text">{{ detail.briefingText || '暂无宣讲文字' }}</p>
        </div>

        <div class="section">
          <div class="section-title">宣讲资源</div>
          <div class="resources">
            <el-button v-if="detail.briefingVideoUrl" type="primary" plain @click="openLink(detail.briefingVideoUrl)">
              打开宣讲视频
            </el-button>
            <span v-else class="muted">暂无宣讲视频</span>
            <el-button v-if="detail.panoramicResource" type="primary" plain @click="openLink(detail.panoramicResource)">
              打开全景资源
            </el-button>
            <span v-else class="muted">暂无全景资源</span>
          </div>
        </div>
        <BriefingMaterials v-if="labId" :lab-id="labId" />
      </template>
      <el-empty v-else-if="!loading" description="暂无实训室信息" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { labApi, type LabDetail } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'
import BriefingMaterials from '@/components/media/BriefingMaterials.vue'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const detail = ref<LabDetail | null>(null)
const loading = ref(false)

function openLink(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

async function load() {
  if (!labId.value) return
  loading.value = true
  try {
    detail.value = await labApi.detail(labId.value)
  } catch (err) {
    console.error('实训室信息加载失败', err)
    ElMessage.error('实训室信息加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.section { margin-top: 18px; }
.section-title { font-weight: 600; margin-bottom: 8px; }
.section-text { margin: 0; color: var(--lm-text-secondary); line-height: 1.8; white-space: pre-wrap; }
.resources { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.muted { color: var(--lm-text-secondary); }
</style>
