<template>
  <div ref="dockRef" class="eba-dock" :class="{ open, 'has-hint': hintVisible, dragging }" :style="dockStyle">
    <!-- ---------- 对话面板 ---------- -->
    <transition name="dock-panel">
      <section
        v-if="open"
        class="dock-panel"
        :class="{ 'flip-x': panelLayout.flipX, 'flip-y': panelLayout.flipY }"
        :style="panelStyle"
        role="dialog"
        aria-label="和 E宝 对话"
        @keydown.esc="close"
      >
        <span class="lg-lens lg-lens--refract" aria-hidden="true"></span>
        <header class="panel-head">
          <span class="panel-avatar" aria-hidden="true">E</span>
          <div class="panel-id">
            <strong>E宝<em v-if="aiReady" class="badge">AI</em></strong>
            <em class="state" :title="statusHint">
              <i class="dot" :class="{ busy }" aria-hidden="true"></i>
              {{ statusText }}
            </em>
          </div>
          <button class="panel-btn" type="button" aria-label="清空对话" title="清空对话" @click="clearAll">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5h10M6.5 5V3.6h3V5M5 5l.6 8h4.8L11 5" /></svg>
          </button>
          <button class="panel-btn" type="button" aria-label="收起对话" @click="close">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </header>

        <div ref="bodyRef" class="panel-body">
          <p v-for="(line, index) in history" :key="index" class="line" :class="line.role">{{ line.text }}</p>
          <p v-if="typing" class="line bot typing">{{ typing }}<span class="caret" aria-hidden="true"></span></p>
          <p v-else-if="thinking" class="line bot waiting" aria-label="E宝 正在思考">
            <i></i><i></i><i></i>
          </p>
        </div>

        <div class="panel-chips">
          <button v-for="chip in chips" :key="chip" type="button" :disabled="busy" @click="ask(chip)">
            {{ chip }}
          </button>
        </div>

        <form class="panel-input" @submit.prevent="submit()">
          <input
            v-model="draft"
            maxlength="200"
            :disabled="!open"
            :placeholder="busy ? 'E宝 正在回答…' : '问 E宝 任何平台问题…'"
            aria-label="输入问题"
          />
          <button class="send" type="submit" :disabled="!draft.trim() || busy" aria-label="发送">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5V4M4.2 7.4L8 3.6l3.8 3.8" /></svg>
          </button>
        </form>
      </section>
    </transition>

    <!-- ---------- 桌宠本体 ---------- -->
    <button
      type="button"
      class="mascot"
      :class="{ poke: poking, hidden: open, dragging }"
      :aria-expanded="open"
      :aria-label="open ? '收起 E宝 对话（可拖动移动位置）' : '点我问问 E宝（可拖动移动位置）'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click="toggle"
    >
      <img class="mascot-img" :src="standee" alt="E宝" draggable="false" />
      <span class="mascot-ring" aria-hidden="true"></span>
      <span v-if="!seen && !open" class="mascot-dot" aria-hidden="true"></span>
    </button>

    <!-- ---------- 首次引导气泡 ---------- -->
    <transition name="dock-hint">
      <div v-if="hintVisible" class="dock-hint" :class="{ 'hint-right': panelLayout.flipX }" role="status">
        <p>{{ hintText }}</p>
        <button type="button" aria-label="知道了" @click="dismissHint">✕</button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useEbaChat } from '@/composables/useEbaChat'
import { assistantApi } from '@/api/assistant'
import { briefLine, greetingFor, quickQuestions, roleOf } from '@/utils/ebaKnowledge'

const auth = useAuthStore()
const standee = `${import.meta.env.BASE_URL}brand/ebao-standee.png`

const open = ref(false)
const poking = ref(false)
const seen = ref(false)
const hintVisible = ref(false)
const draft = ref('')
const bodyRef = ref<HTMLDivElement | null>(null)
const aiReady = ref(false)

/* ---------------- 桌宠位置：可拖动、可记忆 ---------------- */
const dockRef = ref<HTMLElement | null>(null)
const dragging = ref(false)
const pos = ref<{ x: number; y: number } | null>(null)
const box = ref({ w: 132, h: 144 })
const vw = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const vh = ref(typeof window === 'undefined' ? 800 : window.innerHeight)

/* 位置存的是视口绝对坐标，换页面、刷新都还在原地 */
const POS_KEY = 'lm_eba_pos'
const EDGE = 8
const PANEL_MAX = 560

const dockStyle = computed(() => (pos.value
  ? { left: `${pos.value.x}px`, top: `${pos.value.y}px`, right: 'auto', bottom: 'auto' }
  : undefined))

/* 面板跟着桌宠走：靠右侧就向左展开，靠顶部就向下展开，高度按可用空间收敛 */
const panelLayout = computed(() => {
  if (!pos.value) return { flipX: false, flipY: false, maxHeight: PANEL_MAX }
  const spaceAbove = pos.value.y - 14
  const spaceBelow = vh.value - (pos.value.y + box.value.h) - 14
  const flipY = spaceBelow > spaceAbove
  return {
    flipX: pos.value.x + box.value.w / 2 < vw.value / 2,
    flipY,
    maxHeight: Math.max(220, Math.min(PANEL_MAX, flipY ? spaceBelow : spaceAbove))
  }
})

const isMobile = computed(() => vw.value <= 600)
/* 小屏面板是贴底抽屉，交给 CSS 定位，不再跟随坐标 */
const panelStyle = computed(() => (isMobile.value ? undefined : { maxHeight: `${panelLayout.value.maxHeight}px` }))

const role = computed(() => roleOf(auth.currentRole, auth.roleName))
const chips = computed(() => quickQuestions(role.value))

const { history, typing, thinking, busy, online, send, say, reset } = useEbaChat({
  role: () => role.value,
  onSpoken: () => poke()
})

const statusText = computed(() => {
  if (thinking.value) return aiReady.value ? '正在查阅系统数据…' : '正在组织语言…'
  if (typing.value) return '正在输入…'
  return aiReady.value && online.value ? '在线 · 数据实时' : '在线 · 基础模式'
})

/* 明确告诉用户数据边界：查不到就会说查不到，不会编 */
const statusHint = computed(() => (aiReady.value && online.value
  ? '回答取自平台数据库的实时数据；数据库里没有的内容会直接说查不到'
  : '当前为基础模式（未连上大模型），只回答通用流程与规则，不给具体数字'))

const hintText = computed(() => `我是 E宝，${role.value === 'student' ? '志愿、流程' : '流程、规则'}不懂就问我～`)

let hintTimer = 0
let pokeTimer = 0

function scrollToEnd() {
  nextTick(() => {
    const body = bodyRef.value
    if (body) body.scrollTop = body.scrollHeight
  })
}

function poke() {
  poking.value = true
  if (pokeTimer) window.clearTimeout(pokeTimer)
  pokeTimer = window.setTimeout(() => { poking.value = false }, 520)
}

/* ---------------- 拖动 ---------------- */
let drag: { id: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null = null
/* 拖完会补发一个 click，用它吞掉，避免「拖到新位置顺手把对话打开」 */
let suppressClick = false

function clampPos(x: number, y: number) {
  const maxX = Math.max(EDGE, vw.value - box.value.w - EDGE)
  const maxY = Math.max(EDGE, vh.value - box.value.h - EDGE)
  return { x: Math.min(Math.max(EDGE, x), maxX), y: Math.min(Math.max(EDGE, y), maxY) }
}

function setPos(x: number, y: number) {
  pos.value = clampPos(x, y)
}

function measure() {
  vw.value = window.innerWidth
  vh.value = window.innerHeight
  const rect = dockRef.value?.getBoundingClientRect()
  if (rect && rect.width) box.value = { w: rect.width, h: rect.height }
  return rect || null
}

function savePos() {
  try {
    if (pos.value) localStorage.setItem(POS_KEY, JSON.stringify(pos.value))
  } catch { /* 隐私模式忽略 */ }
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  /* 首次拖动前先把 CSS 的 right/bottom 锚点换算成绝对坐标 */
  if (!pos.value) {
    const rect = measure()
    if (rect) setPos(rect.left, rect.top)
  }
  if (!pos.value) return
  drag = {
    id: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: pos.value.x,
    originY: pos.value.y,
    moved: false
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  const dx = event.clientX - drag.startX
  const dy = event.clientY - drag.startY
  if (!drag.moved) {
    /* 5px 内算点击，避免手抖把点击吃掉 */
    if (Math.hypot(dx, dy) < 5) return
    drag.moved = true
    dragging.value = true
    hintVisible.value = false
  }
  setPos(drag.originX + dx, drag.originY + dy)
}

function onPointerUp(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  const moved = drag.moved
  drag = null
  dragging.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
  if (!moved) return
  suppressClick = true
  window.setTimeout(() => { suppressClick = false }, 120)
  savePos()
}

function onResize() {
  const prevW = vw.value
  const prevH = vh.value
  const rect = measure()
  if (!pos.value) {
    if (rect) setPos(rect.left, rect.top)
    return
  }
  /* 按比例跟着缩放，窗口变小后不会跑到屏幕外 */
  const rx = prevW > 0 ? pos.value.x / prevW : 0
  const ry = prevH > 0 ? pos.value.y / prevH : 0
  setPos(rx * vw.value, ry * vh.value)
}

function dismissHint() {
  hintVisible.value = false
  seen.value = true
  try { sessionStorage.setItem('lm_eba_hint', '1') } catch { /* 隐私模式忽略 */ }
}

function toggle() {
  /* 拖动结束后浏览器会补一个 click，这里直接吞掉 */
  if (suppressClick) {
    suppressClick = false
    return
  }
  if (open.value) {
    close()
    return
  }
  open.value = true
  seen.value = true
  hintVisible.value = false
  poke()
  if (!history.value.length) say(greetingFor(role.value), scrollToEnd)
  else if (!busy.value) say(briefLine(), scrollToEnd)
  scrollToEnd()
}

function close() {
  open.value = false
  draft.value = ''
}

function clearAll() {
  reset()
  say(greetingFor(role.value), scrollToEnd)
}

function submit() {
  const text = draft.value.trim()
  if (!text || busy.value) return
  draft.value = ''
  void send(text, scrollToEnd)
}

function ask(chip: string) {
  if (busy.value) return
  void send(chip, scrollToEnd)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) close()
}

function onOutside(event: MouseEvent) {
  if (!open.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.eba-dock')) return
  close()
}

onMounted(() => {
  /* 首次进入且在别的交互之前，冒一个引导气泡；本会话不再重复 */
  let seenBefore = false
  try { seenBefore = sessionStorage.getItem('lm_eba_hint') === '1' } catch { /* 忽略 */ }
  seen.value = seenBefore
  if (!seenBefore) {
    hintTimer = window.setTimeout(() => { hintVisible.value = true }, 4200)
  }

  window.addEventListener('keydown', onKeydown)
  document.addEventListener('mousedown', onOutside)
  window.addEventListener('resize', onResize)

  /* 桌面端默认在右下角；拖动过就回到上次放置的位置 */
  nextTick(() => {
    let saved: { x: number; y: number } | null = null
    try {
      const raw = localStorage.getItem(POS_KEY)
      saved = raw ? JSON.parse(raw) : null
    } catch { saved = null }
    const rect = measure()
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) setPos(saved.x, saved.y)
    else if (rect) setPos(rect.left, rect.top)
  })

  /* 是否真的接了大模型，决定头部徽标与降级提示 */
  assistantApi.status().then((res) => { aiReady.value = Boolean(res?.configured) }).catch(() => { aiReady.value = false })
})

onBeforeUnmount(() => {
  if (hintTimer) window.clearTimeout(hintTimer)
  if (pokeTimer) window.clearTimeout(pokeTimer)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousedown', onOutside)
  window.removeEventListener('resize', onResize)
})

</script>

<style scoped>
.eba-dock {
  position: fixed;
  right: 26px;
  bottom: 26px;
  z-index: 1200;
  width: 132px;
  height: 144px;
  pointer-events: none;
}

/* ---------- 桌宠 ---------- */
.mascot {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 132px;
  height: 144px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: grab;
  pointer-events: auto;
  /* 拖动时不要触发页面滚动与长按菜单 */
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
  animation: mascotFloat 4.6s ease-in-out infinite;
}

/* 拖动中停掉漂浮动画，否则和手指/鼠标的位移打架，看起来"粘不住" */
.eba-dock.dragging .mascot,
.mascot.dragging {
  cursor: grabbing;
  animation: none;
}

.eba-dock.dragging {
  -webkit-user-select: none;
  user-select: none;
}

.mascot.hidden {
  opacity: 0.9;
}

.mascot.poke {
  animation: mascotPoke 0.52s cubic-bezier(0.3, 1.5, 0.4, 1);
}

.mascot-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 14px 22px rgba(20, 22, 26, 0.2));
  transition: filter 0.3s ease;
  user-select: none;
  -webkit-user-drag: none;
}

.mascot:hover .mascot-img {
  filter: drop-shadow(0 18px 26px rgba(255, 95, 158, 0.34));
}

.mascot:focus-visible {
  outline: 2px solid rgba(255, 95, 158, 0.6);
  outline-offset: 6px;
  border-radius: 50%;
}

/* 脚下的呼吸光圈，让桌宠"站在"页面上 */
.mascot-ring {
  position: absolute;
  left: 50%;
  bottom: 4px;
  width: 76px;
  height: 16px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(234, 88, 12, 0.24), transparent 72%);
  animation: ringPulse 4.6s ease-in-out infinite;
  pointer-events: none;
}

.mascot-dot {
  position: absolute;
  top: 12px;
  right: 10px;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #ea580c;
  box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.2);
}

@keyframes mascotFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}

@keyframes mascotPoke {
  0% { transform: translateY(0) scale(1); }
  38% { transform: translateY(-16px) scale(1.06); }
  68% { transform: translateY(2px) scale(0.97); }
  100% { transform: translateY(0) scale(1); }
}

@keyframes ringPulse {
  0%, 100% { opacity: 0.55; transform: translateX(-50%) scaleX(1); }
  50% { opacity: 0.9; transform: translateX(-50%) scaleX(1.08); }
}

/* ---------- 引导气泡 ---------- */
.dock-hint {
  position: absolute;
  right: 100%;
  bottom: 62px;
  margin-right: 14px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: max-content;
  max-width: 232px;
  padding: 10px 12px;
  border: 0;
  border-radius: 18px 18px 6px 18px;
  background-color: rgba(255, 255, 255, 0.78);
  background-image: linear-gradient(158deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.5));
  -webkit-backdrop-filter: blur(18px) saturate(175%);
  backdrop-filter: blur(18px) saturate(175%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 0 -1px 0 rgba(255, 255, 255, 0.7),
    0 2px 6px rgba(58, 41, 28, 0.06),
    var(--lg-shadow-float);
  pointer-events: auto;
}

.dock-hint p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #3c3a36;
}

/* 桌宠在左半边时气泡改到右侧，避免顶到屏幕外 */
.dock-hint.hint-right {
  right: auto;
  left: 100%;
  margin-right: 0;
  margin-left: 14px;
  border-radius: 18px 18px 18px 6px;
}

.dock-hint button {
  flex: none;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #a8a39a;
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
}

.dock-hint button:hover {
  background: rgba(20, 22, 26, 0.06);
  color: #1a1b1f;
}

/* ---------- 对话面板：液态玻璃 ---------- */
.dock-panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  display: flex;
  flex-direction: column;
  width: 360px;
  max-width: calc(100vw - 24px);
  max-height: min(560px, calc(100vh - 160px));
  border: 0;
  border-radius: 26px;
  background-color: rgba(255, 255, 255, 0.5);
  background-image:
    radial-gradient(120% 100% at 8% -14%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0) 54%),
    linear-gradient(158deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.1) 60%, rgba(255, 255, 255, 0.3));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 1px 0 0 rgba(255, 255, 255, 0.5),
    inset -1px 0 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(255, 255, 255, 0.7),
    0 2px 6px rgba(58, 41, 28, 0.05),
    var(--lg-shadow-float);
  pointer-events: auto;
  transform-origin: 100% 100%;
  overflow: hidden;
}

.dock-panel .lg-lens { border-radius: 26px; }

/* 桌宠被拖到左半边：面板改为向右展开，尾巴和投影方向一起翻 */
.dock-panel.flip-x {
  right: auto;
  left: 0;
  transform-origin: 0 100%;
}

/* 桌宠被拖到顶部：面板改为向下展开 */
.dock-panel.flip-y {
  bottom: auto;
  top: calc(100% + 6px);
  transform-origin: 100% 0;
}

.dock-panel.flip-x.flip-y {
  transform-origin: 0 0;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 10px 11px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.6);
  background:
    radial-gradient(circle at 8% -20%, rgba(255, 178, 107, 0.34), transparent 62%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0));
}

.panel-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 26%, #ffd7a6 0%, #ff9c58 44%, #ea580c 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 5px 14px -4px rgba(234, 88, 12, 0.5);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.panel-id {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.panel-id strong {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  color: #1a1b1f;
}

.panel-id .badge {
  padding: 1px 5px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffa163, #ea580c);
  color: #fff;
  font-size: 8.5px;
  font-style: normal;
  font-weight: 600;
  letter-spacing: 0.06em;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.panel-id .state {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-style: normal;
  color: #918c83;
  white-space: nowrap;
}

.dot {
  width: 5px;
  height: 5px;
  flex: none;
  border-radius: 50%;
  background: #4ec78a;
  box-shadow: 0 0 0 3px rgba(78, 199, 138, 0.16);
}

.dot.busy {
  background: #ffb26b;
  box-shadow: 0 0 0 3px rgba(255, 178, 107, 0.2);
  animation: dotBlink 1s ease-in-out infinite;
}

@keyframes dotBlink {
  50% { opacity: 0.35; }
}

.panel-btn {
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  margin-left: 2px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  color: #918c83;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.3s ease;
}

.panel-btn:first-of-type {
  margin-left: auto;
}

.panel-btn svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.panel-btn:hover {
  background: rgba(20, 22, 26, 0.07);
  color: #1a1b1f;
  transform: rotate(90deg);
}

.panel-btn:first-of-type:hover {
  transform: none;
}

.panel-body {
  flex: 1 1 auto;
  min-height: 120px;
  padding: 12px 13px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(20, 22, 26, 0.16) transparent;
}

.panel-body::-webkit-scrollbar {
  width: 4px;
}

.panel-body::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background: rgba(20, 22, 26, 0.16);
}

.line {
  margin: 0;
  max-width: 90%;
  padding: 8px 11px;
  border-radius: 13px;
  font-size: 12px;
  line-height: 1.7;
  word-break: break-word;
  white-space: pre-wrap;
  animation: lineIn 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.line.bot {
  align-self: flex-start;
  border-bottom-left-radius: 7px;
  background-color: rgba(255, 255, 255, 0.72);
  background-image: linear-gradient(160deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.5));
  color: #24262a;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 -1px 0 rgba(255, 255, 255, 0.6),
    0 2px 8px rgba(58, 41, 28, 0.06);
}

.line.me {
  align-self: flex-end;
  border-bottom-right-radius: 7px;
  background-image: linear-gradient(135deg, #ff9a5a 0%, #ea580c 100%);
  color: #fff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    0 6px 16px -6px rgba(234, 88, 12, 0.6);
}

.line.typing {
  animation: none;
}

.line.waiting {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 11px 13px;
}

.line.waiting i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #bdb7ae;
  animation: dotJump 1.1s ease-in-out infinite;
}

.line.waiting i:nth-child(2) { animation-delay: 0.16s; }
.line.waiting i:nth-child(3) { animation-delay: 0.32s; }

@keyframes dotJump {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-3px); opacity: 1; }
}

@keyframes lineIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

.caret {
  display: inline-block;
  width: 1.5px;
  height: 11px;
  margin-left: 1.5px;
  vertical-align: -1px;
  border-radius: 1px;
  background: #ea580c;
  animation: caretBlink 0.9s steps(1) infinite;
}

@keyframes caretBlink {
  50% { opacity: 0; }
}

.panel-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 0 13px 9px;
}

.panel-chips button {
  padding: 5px 11px;
  border: 0;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.6);
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.3));
  color: #514d47;
  font-size: 11px;
  line-height: 1.4;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 -1px 0 rgba(255, 255, 255, 0.6),
    0 1px 2px rgba(58, 41, 28, 0.05);
  transition: box-shadow 0.28s var(--lg-ease), background-color 0.28s var(--lg-ease), color 0.2s ease;
}

.panel-chips button:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.85);
  color: #c2410c;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    inset 0 0 0 1px rgba(234, 88, 12, 0.24),
    0 6px 14px -8px rgba(58, 41, 28, 0.3);
}

.panel-chips button:disabled {
  opacity: 0.45;
  cursor: default;
}

.panel-input {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 11px 11px;
  border-top: 1px solid rgba(255, 255, 255, 0.6);
}

.panel-input input {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.56);
  color: #24262a;
  font-size: 12px;
  outline: none;
  box-shadow:
    inset 0 1px 2px rgba(58, 41, 28, 0.07),
    inset 0 -1px 0 rgba(255, 255, 255, 0.8);
  transition: box-shadow 0.3s var(--lg-ease), background-color 0.3s var(--lg-ease);
}

.panel-input input::placeholder {
  color: #9c968d;
}

.panel-input input:focus {
  background: rgba(255, 255, 255, 0.82);
  box-shadow:
    inset 0 0 0 1px rgba(234, 88, 12, 0.5),
    0 0 0 3px rgba(234, 88, 12, 0.14);
}

.panel-input .send {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background-image: linear-gradient(140deg, #ffa163, #ea580c 62%, #d34a06);
  color: #fff;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    0 6px 16px -6px rgba(234, 88, 12, 0.7);
  transition: box-shadow 0.3s var(--lg-ease), filter 0.24s ease;
}

.panel-input .send svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.panel-input .send:hover:not(:disabled) {
  filter: brightness(1.06);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    0 10px 22px -8px rgba(234, 88, 12, 0.8);
}

.panel-input .send:disabled {
  opacity: 0.32;
  cursor: default;
  box-shadow: none;
}

/* ---------- 动画 ---------- */
.dock-panel-enter-active,
.dock-panel-leave-active {
  transition: opacity 0.24s ease, transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.dock-panel-enter-from,
.dock-panel-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.94);
}

.dock-hint-enter-active,
.dock-hint-leave-active {
  transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.dock-hint-enter-from,
.dock-hint-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

/* ---------- 小屏 ---------- */
@media (max-width: 1080px) {
  .eba-dock {
    right: 16px;
    bottom: 16px;
    width: 104px;
    height: 116px;
  }

  .mascot {
    width: 104px;
    height: 116px;
  }

  .mascot-ring {
    width: 60px;
  }

  .dock-panel {
    width: min(360px, calc(100vw - 32px));
  }

  .dock-hint {
    max-width: 200px;
  }
}

@media (max-width: 600px) {
  .eba-dock {
    right: 11px;
    bottom: 11px;
    width: 84px;
    height: 96px;
  }

  .mascot {
    width: 84px;
    height: 96px;
  }

  /* 窄屏：面板做成贴底抽屉，跟着坐标走会必然出屏 */
  .dock-panel,
  .dock-panel.flip-x,
  .dock-panel.flip-y {
    position: fixed;
    left: 11px;
    right: 11px;
    top: auto;
    bottom: 11px;
    width: auto;
    max-width: none;
    max-height: calc(100vh - 22px);
    transform-origin: 50% 100%;
  }

  .dock-hint {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mascot,
  .mascot.poke,
  .mascot-ring,
  .line,
  .caret,
  .dock-panel-enter-active,
  .dock-hint-enter-active {
    animation: none;
    transition: none;
  }
}
</style>
