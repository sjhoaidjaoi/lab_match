<template>
  <div class="stage-track" :class="{ 'is-stopped': stopped }">
    <div class="track-scroll">
      <div class="track-inner">
        <div class="track-rail" aria-hidden="true">
          <span class="rail-base"></span>
          <span class="rail-progress" :style="{ width: progress + '%' }"></span>
        </div>

        <!-- 复用登录页 3D 机器人：位置由真实当前阶段决定 -->
        <div class="track-robot" :style="{ left: progress + '%' }" :class="{ running }" aria-hidden="true">
          <span class="robot-glow"></span>
          <RobotScene class="robot-canvas" />
          <span class="robot-shadow"></span>
        </div>

        <el-tooltip
          v-for="(stage, index) in stages"
          :key="stage.id"
          placement="top"
          effect="light"
          :show-after="120"
          popper-class="stage-tip"
        >
          <template #content>
            <div class="tip-box">
              <div class="tip-title">第 {{ stage.stageNumber }} 阶段 · {{ stage.stageName }}</div>
              <div class="tip-time">{{ formatRange(stage) }}</div>
              <div class="tip-status" :class="statusClass(stage)">{{ statusLabel(stage) }}</div>
            </div>
          </template>
          <button
            type="button"
            class="track-node"
            :class="[statusClass(stage), { active: isCurrent(stage) }]"
            :style="{ left: nodeLeft(index) + '%' }"
            :aria-label="`第${stage.stageNumber}阶段 ${stage.stageName}，${statusLabel(stage)}`"
          >
            <span class="node-dot"></span>
            <span class="node-index">{{ String(stage.stageNumber).padStart(2, '0') }}</span>
            <span class="node-name">{{ stage.stageName }}</span>
          </button>
        </el-tooltip>
      </div>
    </div>

    <div class="track-legend">
      <span class="legend-item"><i class="dot done"></i>已完成</span>
      <span class="legend-item"><i class="dot running"></i>进行中</span>
      <span class="legend-item"><i class="dot pending"></i>未开始</span>
      <span class="legend-item"><i class="dot paused"></i>已暂停</span>
      <span class="legend-spacer"></span>
      <span class="legend-current" v-if="currentStage">
        当前：{{ currentStage.stageName }} · {{ statusLabel(currentStage) }}
      </span>
      <span class="legend-current" v-else>尚未配置阶段时间</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import RobotScene from '@/components/RobotScene.vue'
import type { StageInfo } from '@/types'

const props = defineProps<{
  stages: StageInfo[]
  currentStage?: StageInfo | null
  stopped?: boolean
}>()

const running = ref(false)
let timer = 0

const total = computed(() => Math.max(props.stages.length, 1))

/** 当前阶段在轨道上的位置（百分比，取节点中心） */
const currentIndex = computed(() => {
  const list = props.stages
  if (!list.length) return 0
  const target = props.currentStage
  const index = target ? list.findIndex((s) => s.stageNumber === target.stageNumber) : -1
  return index >= 0 ? index : 0
})

const progress = computed(() => ((currentIndex.value + 0.5) / total.value) * 100)

function nodeLeft(index: number) {
  return ((index + 0.5) / total.value) * 100
}

function isCurrent(stage: StageInfo) {
  return props.currentStage ? stage.stageNumber === props.currentStage.stageNumber : false
}

function statusClass(stage: StageInfo) {
  switch (stage.stageStatus) {
    case 'COMPLETED': return 'done'
    case 'IN_PROGRESS': return 'running'
    case 'PAUSED': return 'paused'
    default: return 'pending'
  }
}

function statusLabel(stage: StageInfo) {
  const map: Record<string, string> = {
    NOT_STARTED: '未开始',
    IN_PROGRESS: '进行中',
    COMPLETED: '已结束',
    PAUSED: '已暂停'
  }
  return map[stage.stageStatus] || stage.stageStatus
}

function formatRange(stage: StageInfo) {
  const fmt = (value: string) => {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return `${fmt(stage.startTime)} ~ ${fmt(stage.endTime)}`
}

// 阶段切换时触发一次“跑动”过渡（位移平滑 + 轻微抬升）
watch(currentIndex, () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  running.value = true
  window.clearTimeout(timer)
  timer = window.setTimeout(() => { running.value = false }, 900)
})

defineOptions({ name: 'StageRobotTrack' })
</script>

<style scoped>
.stage-track {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.track-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 2px 0;
  scrollbar-width: thin;
}

.track-inner {
  position: relative;
  min-width: 760px;
  height: 168px;
  padding: 0 8px;
}

/* 轨道 */
.track-rail {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 104px;
  height: 4px;
}

.rail-base {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #f0e6dc;
}

.rail-progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffb26b, #ff7a4d);
  transition: width 0.75s cubic-bezier(0.22, 1, 0.36, 1);
}

/* 机器人 */
.track-robot {
  position: absolute;
  top: 6px;
  width: 96px;
  height: 96px;
  margin-left: -48px;
  z-index: 3;
  transition: left 0.75s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.robot-canvas {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
}

.robot-glow {
  position: absolute;
  inset: 14px 8px 8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 150, 90, 0.4), transparent 68%);
  filter: blur(6px);
}

.robot-shadow {
  position: absolute;
  left: 50%;
  bottom: 2px;
  width: 46px;
  height: 9px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: rgba(20, 22, 26, 0.16);
  filter: blur(3px);
}

.track-robot.running {
  animation: robotRun 0.9s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes robotRun {
  0% { transform: translateY(0) rotate(0deg); }
  35% { transform: translateY(-12px) rotate(-5deg); }
  65% { transform: translateY(-4px) rotate(4deg); }
  100% { transform: translateY(0) rotate(0deg); }
}

/* 节点 */
.track-node {
  position: absolute;
  top: 98px;
  width: 108px;
  margin-left: -54px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: center;
  cursor: pointer;
  color: inherit;
  font: inherit;
}

.node-dot {
  display: block;
  width: 16px;
  height: 16px;
  margin: 0 auto;
  border-radius: 50%;
  border: 2px solid #e6d8cb;
  background: #fff;
  box-sizing: border-box;
  transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}

.track-node.done .node-dot { border-color: #ff9a5c; background: #ff9a5c; }
.track-node.running .node-dot {
  border-color: #ff6b35;
  background: #fff;
  box-shadow: 0 0 0 5px rgba(255, 122, 77, 0.16);
}
.track-node.paused .node-dot { border-color: #c9b8a8; background: #efe6dc; }

.track-node:hover .node-dot,
.track-node:focus-visible .node-dot { transform: scale(1.18); }
.track-node:focus-visible { outline: none; }
.track-node:focus-visible .node-dot { box-shadow: 0 0 0 4px rgba(255, 122, 77, 0.32); }

.node-index {
  display: block;
  margin-top: 8px;
  font: 600 10.5px/1 ui-monospace, Consolas, monospace;
  letter-spacing: 0.1em;
  color: #b6a99b;
}

.node-name {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.35;
  color: var(--lm-text-secondary, #6b7280);
  max-width: 108px;
  margin-inline: auto;
}

.track-node.done .node-name,
.track-node.running .node-name { color: #3b3a37; }

.track-node.active .node-name {
  color: #c2410c;
  font-weight: 600;
}

.track-node.active .node-index { color: #ff7a4d; }

/* 图例 */
.track-legend {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--lm-text-secondary, #6b7280);
}

.legend-item { display: inline-flex; align-items: center; gap: 6px; }

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.dot.done { background: #ff9a5c; }
.dot.running { background: #fff; border: 2px solid #ff6b35; }
.dot.pending { background: #fff; border: 2px solid #e6d8cb; }
.dot.paused { background: #efe6dc; border: 2px solid #c9b8a8; }

.legend-spacer { flex: 1; }

.legend-current {
  font-weight: 600;
  color: #c2410c;
}

.is-stopped .rail-progress { background: linear-gradient(90deg, #d8d2cb, #b9b1a7); }
.is-stopped .legend-current { color: #8a8781; }

:deep(.robot-loading) { display: none; }

.tip-box { min-width: 168px; }
.tip-title { font-weight: 600; color: #1f2937; margin-bottom: 4px; }
.tip-time { font-size: 12px; color: #6b7280; }
.tip-status { margin-top: 6px; font-size: 12px; font-weight: 600; }
.tip-status.done { color: #d97706; }
.tip-status.running { color: #ea580c; }
.tip-status.pending { color: #6b7280; }
.tip-status.paused { color: #7c6f64; }

@media (max-width: 900px) {
  .track-inner { min-width: 720px; }
}

@media (prefers-reduced-motion: reduce) {
  .track-robot,
  .rail-progress { transition: none; }
  .track-robot.running { animation: none; }
}
</style>
