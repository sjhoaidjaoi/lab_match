<template>
  <div class="page-container mentor-detail">
    <div v-loading="loading" class="detail-body">
      <template v-if="mentor">
        <el-card shadow="never" class="profile-card">
          <div class="profile">
            <el-avatar :size="72" class="avatar">{{ avatarText }}</el-avatar>
            <div class="profile-main">
              <div class="name-row">
                <h1>{{ mentor.realName }}</h1>
                <span class="title">{{ mentor.title || '导师' }}</span>
                <el-tag v-if="mentor.remainQuota <= 0" type="danger" size="small">已满</el-tag>
              </div>
              <p class="direction">
                研究方向：{{ mentor.researchDirection || '暂未填写' }}
              </p>
              <p class="direction">
                所属实训室：
                <router-link :to="`/labs/${mentor.labId}`">{{ mentor.labName || '—' }}</router-link>
              </p>
            </div>
          </div>
        </el-card>

        <el-card shadow="never" class="section">
          <template #header><span class="section-title">在研项目</span></template>
          <p class="paragraph">{{ mentor.researchProjects || '暂未填写在研项目' }}</p>
        </el-card>

        <el-card shadow="never" class="section">
          <template #header><span class="section-title">名额情况</span></template>
          <div class="quota-grid">
            <div class="quota-item">
              <span class="label">个人名额</span>
              <b>{{ mentor.quota }}</b>
            </div>
            <div class="quota-item">
              <span class="label">已录</span>
              <b>{{ mentor.quotaUsed }}</b>
            </div>
            <div class="quota-item">
              <span class="label">剩余</span>
              <b :class="{ full: mentor.remainQuota <= 0 }">{{ mentor.remainQuota }}</b>
            </div>
          </div>
          <p v-if="mentor.remainQuota <= 0" class="full-tip">该导师名额已满</p>
        </el-card>

        <div class="back-bar">
          <el-button @click="handleBack">返回实训室</el-button>
        </div>
      </template>

      <el-empty v-else-if="!loading" description="导师不存在或已停用" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPublicMentor } from '@/api/public'
import type { PublicLabMentor } from '@/types/public'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const mentor = ref<PublicLabMentor | null>(null)

const avatarText = computed(() => mentor.value?.realName?.slice(0, 1) || '师')

async function loadMentor() {
  const id = Number(route.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    loading.value = false
    return
  }
  try {
    mentor.value = await getPublicMentor(id)
  } catch {
    mentor.value = null
  } finally {
    loading.value = false
  }
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/labs')
}

onMounted(loadMentor)
</script>

<style scoped>
.mentor-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.detail-body {
  min-height: 240px;
}

.profile-card {
  margin-bottom: 16px;
}

.profile {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar {
  flex-shrink: 0;
  background: #ecf5ff;
  color: #409eff;
  font-size: 26px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.name-row h1 {
  margin: 0;
  font-size: 24px;
  color: #1f2d3d;
}

.title {
  font-size: 13px;
  color: #909399;
}

.direction {
  margin: 10px 0 0;
  font-size: 14px;
  color: #606266;
}

.section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.paragraph {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
}

.quota-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.quota-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border-radius: 8px;
  background: #f7f9fc;
}

.quota-item .label {
  font-size: 13px;
  color: #909399;
}

.quota-item b {
  font-size: 22px;
  color: #303133;
}

.quota-item b.full {
  color: #f56c6c;
}

.full-tip {
  margin: 12px 0 0;
  font-size: 13px;
  color: #f56c6c;
}

.back-bar {
  display: flex;
  justify-content: flex-end;
}
</style>
