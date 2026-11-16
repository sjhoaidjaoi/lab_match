<template>
  <div class="page dash">
    <header class="dash-head">
      <div class="head-main">
        <p class="kicker">COLLEGE OVERVIEW · 全院总览</p>
        <h2 class="dash-title">{{ dashboard?.batch?.batchName || '暂无选拔批次' }}</h2>
        <p class="dash-sub">
          <template v-if="dashboard?.batch">
            {{ dashboard.batch.academicYear }} · {{ batchStatusText }}
            <template v-if="stopped">　停止原因：{{ dashboard.batch.stopReason || '未填写' }}</template>
          </template>
          <template v-else>请先在「选拔批次」中创建本学年批次，再配置八阶段时间</template>
        </p>
      </div>
      <div class="head-actions">
        <el-tag v-if="stopped" type="danger" effect="plain" round>本次选拔已停止</el-tag>
        <el-button v-if="!dashboard?.batch" type="primary" @click="router.push('/college/batches')">去创建批次</el-button>
        <el-button text :loading="loading" @click="load">刷新</el-button>
        <el-button v-if="dashboard?.batch" text @click="router.push('/college/batches')">批次管理</el-button>
      </div>
    </header>

    <!-- 一、待处理事项 -->
    <section class="todo-block">
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

      <div v-else class="todo-empty">
        <span class="empty-mark" aria-hidden="true">✓</span>
        <div>
          <strong>暂无待办</strong>
          <p>当前没有需要学院层面处理的业务事项</p>
        </div>
      </div>
    </section>

    <!-- 二、全院数据总览（三个指标） -->
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
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
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
.dash {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---------- 头部 ---------- */
.dash-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px;
  border: 1px solid var(--lm-border);
  border-radius: 18px;
  background:
    radial-gradient(circle at 92% 10%, rgba(255, 178, 107, 0.24), transparent 52%),
    #fffaf4;
}

.kicker {
  margin: 0 0 8px;
  font: 600 10.5px/1 ui-monospace, Consolas, monospace;
  letter-spacing: 0.26em;
  color: #b5763f;
}

.dash-title {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #1f2328;
}

.dash-sub {
  margin: 0;
  font-size: 13px;
  color: var(--lm-text-secondary);
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ---------- 待办 ---------- */
.todo-block {
  padding: 18px 20px 20px;
  border: 1px solid var(--lm-border);
  border-radius: 18px;
  background: #fff;
}

.block-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.block-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2328;
}

.todo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(288px, 1fr));
  gap: 12px;
}

.todo-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #f0e4d8;
  border-radius: 14px;
  background: #fffdfa;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.todo-card:hover,
.todo-card:focus-visible {
  transform: translateY(-2px);
  border-color: #f3c39c;
  background: #fff8f1;
  box-shadow: 0 10px 24px rgba(196, 120, 60, 0.12);
  outline: none;
}

.todo-count {
  flex-shrink: 0;
  min-width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #fdeee0;
  color: #c2410c;
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.lv-danger .todo-count { background: #fdeaea; color: #b91c1c; }
.lv-info .todo-count { background: #f1eee9; color: #6b5b4b; }
.lv-success .todo-count { background: #eaf5ec; color: #2f7d4f; }

.todo-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.todo-title {
  font-size: 13.5px;
  font-weight: 600;
  color: #1f2328;
}

.todo-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--lm-text-secondary);
}

.todo-arrow {
  margin-left: auto;
  color: #c9b8a8;
  transition: transform 0.2s ease, color 0.2s ease;
}

.todo-card:hover .todo-arrow {
  transform: translateX(3px);
  color: #ea580c;
}

.todo-empty {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 4px 6px;
  color: var(--lm-text-secondary);
}

.empty-mark {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1f7f2;
  color: #2f7d4f;
  font-size: 18px;
  font-weight: 700;
}

.todo-empty strong {
  display: block;
  color: #1f2328;
  font-size: 13.5px;
  margin-bottom: 2px;
}

.todo-empty p {
  margin: 0;
  font-size: 12px;
}

/* ---------- 三指标 ---------- */
.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.metric {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid var(--lm-border);
  border-radius: 16px;
  background: #fff;
}

.metric-icon {
  width: 46px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  flex-shrink: 0;
}

.metric-icon svg { width: 24px; height: 24px; }

.tone-brand { background: #fdeee0; color: #ea580c; }
.tone-warm { background: #fdf1e4; color: #c2410c; }
.tone-sand { background: #f4efe7; color: #8a6a4b; }

.metric-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #1f2328;
  font-variant-numeric: tabular-nums;
}

.metric-value em {
  margin-left: 4px;
  font-size: 12.5px;
  font-weight: 500;
  font-style: normal;
  color: var(--lm-text-secondary);
}

.metric-label {
  font-size: 12.5px;
  color: var(--lm-text-secondary);
}

/* ---------- 面板 ---------- */
.panel {
  padding: 18px 20px 20px;
  border: 1px solid var(--lm-border);
  border-radius: 18px;
  background: #fff;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.panel-note {
  margin: 6px 0 0;
  font-size: 12.5px;
  color: var(--lm-text-secondary);
}

.lab-table { margin-top: 4px; }

.remain {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #c2410c;
}

.remain.zero { color: #9ca3af; }

@media (max-width: 900px) {
  .metrics { grid-template-columns: 1fr; }
  .dash-head { flex-direction: column; }
}
</style>
