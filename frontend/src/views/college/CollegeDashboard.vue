<template>
  <div class="portal-home page dash">
    <header class="page-header dash-head">
      <div class="head-main">
        <p class="kicker">学院工作台</p>
        <h1 class="dash-title">{{ dashboard?.batch?.batchName || (dashboard ? '暂无选拔批次' : '全院选拔总览') }}</h1>
        <p class="dash-sub">
          <template v-if="dashboard?.batch">
            {{ dashboard.batch.academicYear }} · {{ batchStatusText }}
            <template v-if="stopped">　停止原因：{{ dashboard.batch.stopReason || '未填写' }}</template>
          </template>
          <template v-else-if="dashboard">请先在「选拔批次」中创建本学年批次，再配置八阶段时间</template>
        </p>
      </div>
      <div class="head-actions">
        <el-tag v-if="stopped" type="danger" effect="plain" round>本次选拔已停止</el-tag>
        <el-button v-if="dashboard && !dashboard.batch" type="primary" @click="router.push('/college/batches')">去创建批次</el-button>
        <el-button text :loading="loading" @click="load()">刷新</el-button>
        <el-button v-if="dashboard?.batch" text @click="router.push('/college/batches')">批次管理</el-button>
      </div>
    </header>

    <!-- 一、待处理事项 -->
    <section class="todo-block" :class="{ 'todo-quiet': dashboard && !todos.length }">
      <div class="block-head">
        <span class="block-title">待处理事项</span>
        <el-tag v-if="todos.length" type="warning" effect="light" round>{{ todos.length }} 项待办</el-tag>
      </div>

      <div v-if="todos.length" class="todo-grid">
        <button
          v-for="item in todos"
          :key="item.key"
          type="button"
          class="todo-card"
          :class="`lv-${item.level}`"
          @click="router.push(item.path)"
        >
          <span class="todo-count">{{ item.count }}</span>
          <span class="todo-body">
            <span class="todo-title">{{ item.title }}</span>
            <span class="todo-desc">{{ item.desc }}</span>
          </span>
          <span class="todo-arrow" aria-hidden="true">→</span>
        </button>
      </div>

      <p v-else-if="!dashboard">{{ loading ? '正在读取待办事项…' : '待办事项加载失败，请点击刷新重试。' }}</p>
      <p v-else class="todo-empty">当前暂无待处理事项</p>
    </section>

    <section class="business-directory" aria-labelledby="college-business">
      <h2 id="college-business" class="block-title">学院业务</h2>
      <div class="module-grid">
        <section v-for="module in collegeModules" :key="module.title" class="business-module">
          <el-icon class="module-icon" aria-hidden="true"><component :is="module.icon" /></el-icon>
          <div>
            <h3>{{ module.title }}</h3>
            <nav class="module-links" :aria-label="module.title">
              <RouterLink v-for="link in module.links" :key="link.path" :to="link.path">{{ link.title }}</RouterLink>
            </nav>
          </div>
        </section>
      </div>
    </section>

    <details class="overview-details">
      <summary>查看全院统计与选拔进度</summary>
      <section class="metrics">
        <article v-for="metric in metrics" :key="metric.label" class="metric">
          <span class="metric-icon" :class="metric.tone" aria-hidden="true">
            <svg v-if="metric.key === 'students'" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="1.6" />
              <path d="M3.6 19c.7-3 2.9-4.6 5.4-4.6S13.7 16 14.4 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <path d="M15.6 5.4a3 3 0 0 1 0 5.6M17 14.6c2 .5 3.3 2 3.7 4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <svg v-else-if="metric.key === 'teachers'" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="12" rx="2.2" stroke="currentColor" stroke-width="1.6" />
              <path d="M7.5 9.5h6M7.5 13h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <path d="M8 20h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none">
              <path d="M4 20V9.2l8-4.2 8 4.2V20" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              <path d="M9.5 20v-5.4h5V20" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              <path d="M4 20h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </span>
          <span class="metric-body">
            <span class="metric-value">{{ metric.value }}<em>{{ metric.unit }}</em></span>
            <span class="metric-label">{{ metric.label }}</span>
          </span>
        </article>
      </section>

      <!-- 三、八阶段选拔进度（复用登录页机器人） -->
      <section class="panel">
        <div class="panel-head">
          <div>
            <span class="block-title">八阶段选拔进度</span>
            <p class="panel-note">
              <template v-if="currentStage">
                当前处于第 {{ currentStage.stageNumber }} 阶段「{{ currentStage.stageName }}」· {{ stageStatusText(currentStage.stageStatus) }}
                <template v-if="currentStage.endTime">，预计 {{ formatTime(currentStage.endTime) }} 结束</template>
              </template>
              <template v-else>尚未配置阶段时间窗</template>
            </p>
          </div>
          <el-button text type="primary" @click="router.push('/college/stages')">调整阶段时间</el-button>
        </div>
        <StageRobotTrack
          :stages="dashboard?.stages || []"
          :current-stage="dashboard?.currentStage || null"
          :stopped="stopped"
        />
      </section>

      <!-- 四、各实训室选拔进度 -->
      <section class="panel">
        <div class="panel-head">
          <div>
            <span class="block-title">各实训室选拔进度</span>
            <p class="panel-note">按当前批次统计报名、面试、拟录取与最终录取</p>
          </div>
        </div>
        <el-table v-loading="loading" :data="dashboard?.perLab || []" class="lab-table" empty-text="暂无实训室数据">
          <el-table-column prop="laboratoryName" label="实训室" min-width="180" />
          <el-table-column prop="quota" label="计划名额" width="92" align="center" />
          <el-table-column prop="applicationCount" label="报名" width="76" align="center" />
          <el-table-column label="面试 待/完成" width="118" align="center">
            <template #default="{ row }">{{ row.interviewScheduled }} / {{ row.interviewCompleted }}</template>
          </el-table-column>
          <el-table-column prop="intended" label="拟录取" width="86" align="center" />
          <el-table-column prop="alternate" label="递补" width="72" align="center" />
          <el-table-column prop="confirmed" label="已确认" width="86" align="center" />
          <el-table-column prop="rejected" label="放弃" width="72" align="center" />
          <el-table-column prop="admitted" label="最终录取" width="92" align="center" />
          <el-table-column label="剩余名额" width="96" align="center">
            <template #default="{ row }">
              <span class="remain" :class="{ zero: row.remaining === 0 }">{{ row.remaining }}</span>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </details>

    <nav class="utility-links" aria-label="统计与服务">
      <strong>统计与服务</strong>
      <RouterLink v-for="link in collegeTools" :key="link.path" :to="link.path">{{ link.title }}</RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { collegeModules, collegeTools } from '@/router/collegeModules'
import StageRobotTrack from '@/components/StageRobotTrack.vue'
import { collegeApi } from '@/api/college'
import type { CollegeDashboard, StageInfo } from '@/types'
import { formatTime } from './shared'

const router = useRouter()
const dashboard = ref<CollegeDashboard | null>(null)
const loading = ref(false)
let timer = 0

const stopped = computed(() => dashboard.value?.batch?.status === 'STOPPED')

const batchStatusText = computed(() => {
  const status = dashboard.value?.batch?.status
  const map: Record<string, string> = {
    IN_PROGRESS: '进行中',
    COMPLETED: '已结束',
    STOPPED: '已停止',
    NOT_STARTED: '未开始',
    DRAFT: '草稿'
  }
  return map[status || ''] || '未开始'
})

const currentStage = computed<StageInfo | null>(() => dashboard.value?.currentStage || null)

const todos = computed(() => dashboard.value?.todos || [])

// 只保留三个全院指标，口径：有效学生 / 有效实训室教师 / 有效实训室
const metrics = computed(() => [
  { key: 'students', label: '全院学生总人数', value: dashboard.value?.overview?.students ?? 0, unit: '人', tone: 'tone-brand' },
  { key: 'teachers', label: '实训室教师总人数', value: dashboard.value?.overview?.teachers ?? 0, unit: '人', tone: 'tone-warm' },
  { key: 'labs', label: '实训室总个数', value: dashboard.value?.overview?.laboratories ?? 0, unit: '个', tone: 'tone-sand' }
])

function stageStatusText(status?: string) {
  const map: Record<string, string> = {
    NOT_STARTED: '未开始',
    IN_PROGRESS: '进行中',
    COMPLETED: '已结束',
    PAUSED: '已暂停'
  }
  return map[status || ''] || '未开始'
}

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    dashboard.value = await collegeApi.dashboard()
  } catch {
    if (!silent) ElMessage.error('总览数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  // 阶段状态由服务端按时间推导，前端每 30 秒同步一次，保证到点自动变化
  timer = window.setInterval(() => load(true), 30000)
})

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<style scoped>
.dash { display: grid; gap: 22px; }
.dash-head, .block-head, .panel-head, .head-actions { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; }
.kicker, .dash-sub, .todo-empty, .todo-desc, .panel-note, .metric-label { color: var(--workspace-muted); }
.kicker, .dash-sub { margin: 0; font-size: 13px; }
.dash-title { margin: 4px 0; font-size: clamp(24px, 2.2vw, 32px); }
.block-title { font-weight: 700; font-size: 18px; }
.todo-block { border-block: 1px solid var(--portal-line); padding-block: 16px; }
.todo-empty { margin: 8px 0 0; }
.todo-quiet { display: flex; align-items: baseline; gap: 12px; border-top: 0; padding-block: 4px 12px; }
.todo-quiet .block-title { font-size: 15px; }
.todo-quiet .todo-empty { margin: 0; font-size: 14px; }
.business-directory h2 { margin: 0 0 8px; }
.module-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: clamp(16px, 2.6vw, 48px); }
.business-module { display: flex; align-items: flex-start; gap: 12px; padding: 20px 0 18px; border-top: 1px solid var(--portal-line); }
.module-icon { flex: none; margin-top: 2px; font-size: 21px; color: var(--lm-primary-dark); }
.business-module h3 { margin: 0 0 8px; font-size: 17px; color: var(--workspace-ink); }
.module-links, .utility-links { display: flex; flex-wrap: wrap; align-items: baseline; gap: 3px 16px; }
.module-links a, .utility-links a { padding-block: 4px; font-size: 14px; line-height: 1.5; color: var(--workspace-muted); text-decoration: underline; text-decoration-color: var(--portal-line); text-underline-offset: 4px; }
.module-links a:hover, .utility-links a:hover { color: var(--lm-primary-dark); text-decoration-color: currentColor; }
.utility-links { border-top: 1px solid var(--portal-line); padding-top: 12px; }
.utility-links strong { font-size: 14px; margin-right: 4px; }
@media (max-width: 1000px) { .module-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) {
  .module-grid { grid-template-columns: 1fr; }
  .business-module { padding-block: 12px; }
  .utility-links strong { flex-basis: 100%; }
}
.todo-grid { margin-top: 8px; }
.todo-card { display: flex; align-items: center; width: 100%; gap: 12px; background: transparent; border: 0; padding: 12px 0; text-align: left; font: inherit; color: inherit; cursor: pointer; }
.todo-card + .todo-card { border-top: 1px solid var(--portal-line); }
.todo-count, .todo-arrow { color: var(--lm-primary-dark); font-weight: 700; }
.todo-card:hover { background: #fff4e9; }
.todo-body { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 12px; }
.todo-title { font-weight: 650; }
.todo-arrow { margin-inline-start: auto; }
.overview-details { min-width: 0; }
.overview-details summary { font-weight: 550; }
.overview-details > section { margin-top: 24px; }
.metrics { display: flex; flex-wrap: wrap; gap: 16px 40px; }
.metric { display: flex; align-items: center; gap: 10px; }
.metric-icon svg { width: 24px; color: var(--lm-primary-dark); }
.metric-body { display: grid; gap: 3px; }
.metric-value { font-size: 24px; font-weight: 700; }
.metric-value em { font-size: 13px; font-weight: 400; font-style: normal; margin-inline-start: 4px; }
.panel { min-width: 0; padding-top: 16px; border-top: 1px solid var(--portal-line); }
.panel-head { margin-bottom: 12px; }
.panel-note { margin: 6px 0 0; }
.remain { font-weight: 650; color: var(--lm-primary-dark); }
.remain.zero { color: var(--workspace-muted); }
</style>
