<template>
  <div class="page-container lab-detail">
    <div v-loading="loading" class="detail-body">
      <template v-if="lab">
        <section class="detail-head">
          <div>
            <p class="lab-code">{{ lab.labCode }}</p>
            <h1>{{ lab.labName }}</h1>
            <p class="dept-line">
              {{ lab.department || '系部待补充' }} · 负责人：{{ lab.leaderName || '未设置' }}
            </p>
            <p class="direction-line">
              {{ directions.length > 0 ? directions.join(' · ') : '研究方向待补充' }}
            </p>
          </div>
          <div class="quota-box">
            <span class="quota-label">总名额 {{ lab.totalQuota }}</span>
            <span class="quota-remain" :class="{ full: lab.remainQuota <= 0 }">
              {{ lab.remainQuota <= 0 ? '已满' : `剩余 ${lab.remainQuota}` }}
            </span>
            <span class="quota-used">已录 {{ lab.quotaUsed }}</span>
          </div>
        </section>

        <el-card shadow="never" class="section">
          <template #header><span class="section-title">实训室简介</span></template>
          <p class="paragraph">{{ lab.introduction || '暂未填写简介' }}</p>
          <p class="paragraph">{{ lab.equipmentEnv || '设备与环境信息暂未填写' }}</p>
          <div v-if="directions.length > 0" class="tag-row">
            <el-tag v-for="item in directions" :key="item" size="small" type="info" effect="plain">
              {{ item }}
            </el-tag>
          </div>
        </el-card>

        <el-card shadow="never" class="section">
          <template #header>
            <span class="section-title">导师列表（{{ lab.mentors.length }} 人）</span>
          </template>
          <div v-if="lab.mentors.length > 0" class="mentor-list">
            <MentorCard v-for="mentor in lab.mentors" :key="mentor.id" :mentor="mentor" />
          </div>
          <el-empty v-else description="暂无导师信息" :image-size="60" />
        </el-card>

        <div class="two-column">
          <el-card shadow="never" class="section">
            <template #header><span class="section-title">培养安排</span></template>
            <p class="paragraph">{{ lab.trainingPlan || '暂未填写培养安排' }}</p>
          </el-card>
          <el-card shadow="never" class="section">
            <template #header><span class="section-title">考核要求</span></template>
            <p class="paragraph">{{ lab.assessmentRequirement || '暂未填写考核要求' }}</p>
          </el-card>
        </div>

        <el-card shadow="never" class="section">
          <template #header>
            <div class="section-header">
              <span class="section-title">开放日安排</span>
              <span v-if="openDayEnded" class="ended">开放日已结束</span>
            </div>
          </template>
          <el-empty v-if="!lab.openDayDate" description="暂未安排开放日" :image-size="60" />
          <el-descriptions v-else :column="2" border>
            <el-descriptions-item label="日期">{{ lab.openDayDate }}</el-descriptions-item>
            <el-descriptions-item label="时段">
              {{ lab.openDayStartTime || '—' }} 至 {{ lab.openDayEndTime || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="地点">{{ lab.openDayLocation || '—' }}</el-descriptions-item>
            <el-descriptions-item label="注意事项">{{ lab.openDayNote || '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </template>

      <el-empty v-else-if="!loading" description="实训室不存在或已下线" />
    </div>

    <div class="apply-bar">
      <div class="apply-hint">
        <span v-if="round">第 {{ round.roundNo }} 轮 · {{ round.roundName }}</span>
        <span v-else>当前暂无选拔轮次</span>
      </div>
      <el-button type="primary" size="large" :disabled="!canApply" @click="handleApply">
        {{ applyText }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MentorCard from '@/components/public/MentorCard.vue'
import { getCurrentRound, getPublicLabDetail } from '@/api/public'
import { useUserStore } from '@/store/user'
import type { PublicCurrentRound, PublicLabDetail } from '@/types/public'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const lab = ref<PublicLabDetail | null>(null)
const round = ref<PublicCurrentRound | null>(null)

const directions = computed(() =>
  (lab.value?.researchDirection || '')
    .split(/[、,，;；]/)
    .map((item) => item.trim())
    .filter(Boolean)
)

function toTimestamp(value: string): number {
  return new Date(value.replace(' ', 'T')).getTime()
}

function todayString(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const openDayEnded = computed(
  () => Boolean(lab.value?.openDayDate) && (lab.value?.openDayDate as string) < todayString()
)

const applyPhase = computed<'open' | 'before' | 'after' | 'unknown'>(() => {
  if (!round.value) {
    return 'unknown'
  }
  if (round.value.phase === 'APPLY') {
    return 'open'
  }
  const now = toTimestamp(round.value.serverTime)
  if (now < toTimestamp(round.value.applyStart)) {
    return 'before'
  }
  if (now > toTimestamp(round.value.applyEnd)) {
    return 'after'
  }
  return 'open'
})

const canApply = computed(() => applyPhase.value === 'open')

const applyText = computed(() => {
  if (applyPhase.value === 'after') {
    return '填报已截止'
  }
  return applyPhase.value === 'open' ? '我要报名' : '填报未开始'
})

async function loadDetail() {
  const id = Number(route.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    loading.value = false
    return
  }
  try {
    lab.value = await getPublicLabDetail(id)
  } catch {
    lab.value = null
  } finally {
    loading.value = false
  }
  round.value = await getCurrentRound().catch(() => null)
}

function handleApply() {
  if (!canApply.value) {
    return
  }
  if (!userStore.isLoggedIn) {
    router.push({ path: '/student/login', query: { redirect: route.fullPath } })
    return
  }
  if (!userStore.isStudent) {
    ElMessage.warning('请使用学生账号登录后报名')
    return
  }
  router.push('/student/intention')
}

onMounted(loadDetail)
</script>

<style scoped>
.lab-detail {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 24px 96px;
}

.detail-body {
  min-height: 320px;
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ecf5ff, #f7fbff);
}

.lab-code {
  margin: 0 0 6px;
  font-size: 12px;
  color: #909399;
}

.detail-head h1 {
  margin: 0 0 8px;
  font-size: 26px;
  color: #1f2d3d;
}

.direction-line {
  margin: 0;
  font-size: 14px;
  color: #606266;
}

.dept-line {
  margin: 0 0 6px;
  font-size: 13px;
  color: #909399;
}

.quota-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.quota-label,
.quota-used {
  font-size: 13px;
  color: #909399;
}

.quota-remain {
  font-size: 24px;
  font-weight: 600;
  color: #67c23a;
}

.quota-remain.full {
  color: #f56c6c;
}

.section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.ended {
  font-size: 13px;
  color: #909399;
}

.paragraph {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mentor-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.apply-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 32px;
  background: #ffffff;
  border-top: 1px solid #e4e7ed;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}

.apply-hint {
  font-size: 14px;
  color: #606266;
}

@media (max-width: 800px) {
  .mentor-list,
  .two-column {
    grid-template-columns: 1fr;
  }

  .detail-head {
    flex-direction: column;
  }

  .quota-box {
    align-items: flex-start;
  }
}
</style>
