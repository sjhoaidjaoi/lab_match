<template>
  <div
    ref="landingRef"
    class="landing"
    :class="{ ready: !booting }"
    @scroll="onScroll"
    @wheel="onChapterWheel"
    @mousemove="onPointerMove"
  >
    <transition name="boot-exit">
      <aside v-if="booting" class="boot" aria-label="欢迎">
        <div class="boot-panel">
          <div class="boot-caption"><span aria-hidden="true">&lt;/&gt;</span> LAB MATCH</div>
          <p class="boot-greeting" :aria-label="bootGreeting">
            <span class="boot-measure" aria-hidden="true">{{ bootGreeting }}&nbsp;</span>
            <span class="boot-typing" aria-hidden="true">{{ bootText }}<i></i></span>
          </p>
          <p class="boot-school">河北师范大学软件学院</p>
          <button type="button" class="boot-skip" @click="finishBoot">跳过开场</button>
        </div>
      </aside>
    </transition>

    <div class="grid-bg" aria-hidden="true"></div>
    <div class="spotlight" aria-hidden="true"></div>

    <!-- 顶部滚动通告 -->
    <div class="ticker" aria-hidden="true">
      <div class="ticker-track">
        <span v-for="(item, index) in tickerItems" :key="index">{{ item }}</span>
        <span v-for="(item, index) in tickerItems" :key="`dup-${index}`">{{ item }}</span>
      </div>
    </div>

    <header class="nav" :class="{ scrolled }">
      <div class="brand" @click="scrollToId('top')">
        <img class="school-logo nav-school-logo" :src="schoolLogo" width="4206" height="650" alt="河北师范大学软件学院" />
        <span class="brand-text">
          <strong>实训室进组选拔平台</strong>
          <em>LAB MATCH · 双向选择 / 统筹调剂</em>
        </span>
      </div>

      <nav class="nav-links">
        <button v-for="link in navLinks" :key="link.id" class="nav-link" @click="scrollToId(link.id)">
          {{ link.label }}
        </button>
      </nav>

      <div class="nav-actions">
        <span class="nav-status">
          <span class="nav-status-text">
            <b>软件工程</b>
            <em>实训室双向选拔</em>
          </span>
        </span>
        <button v-if="auth.isLoggedIn" class="launch-btn solid" @click="goWorkspace">
          进入工作台 <span>↗</span>
        </button>
        <button v-else class="launch-btn" @click="openLogin">
          登录平台 <span>↗</span>
        </button>
      </div>
    </header>

    <main class="main">
      <!-- Hero -->
      <section id="top" ref="heroRef" class="hero">
        <div class="hero-orb orb-warm" aria-hidden="true"></div>
        <div class="hero-orb orb-pink" aria-hidden="true"></div>

        <div class="engineering-backdrop" aria-hidden="true">
          <pre class="engineering-code"><span class="code-comment">// software engineering · lab match</span>
<span class="code-keyword">const</span> journey = [
  <span class="code-string">'explore'</span>, <span class="code-string">'collaborate'</span>, <span class="code-string">'build'</span>
];</pre>
          <span class="engineering-signature">DESIGN → CODE → TEST → BUILD</span>
          <div class="engineering-watermark">
            <span>01 &nbsp; git checkout -b lab-match</span>
            <span>02 &nbsp; interface Preference { labId: string }</span>
            <span>03 &nbsp; await review(application)</span>
            <span>04 &nbsp; expect(result).toBeDefined()</span>
            <span>05 &nbsp; git commit -m "match labs"</span>
            <span>06 &nbsp; npm run build</span>
          </div>
        </div>

        <div class="hero-deco" aria-hidden="true">
          <span class="deco-watermark">LAB MATCH</span>
          <span class="deco-corner corner-tl"></span>
          <span class="deco-corner corner-tr"></span>
          <span class="deco-corner corner-bl"></span>
          <span class="deco-corner corner-br"></span>
          <span class="deco-plus plus-a">+</span>
          <span class="deco-plus plus-b">+</span>
          <span class="deco-plus plus-c">+</span>
          <span class="deco-plus plus-d">+</span>
        </div>

        <div class="hero-inner">
          <div class="hero-copy">
            <p class="kicker">SOFTWARE ENGINEERING · LAB MATCH</p>
            <p class="hero-platform">河北师范大学软件学院 · 软件工程 · 实训室双向选拔与统筹调剂</p>
            <h1 class="hero-title">
              <span class="line"><span class="boxed">双向选择</span></span>
              <span class="line">透明<span class="grad">统筹调剂</span></span>
            </h1>
            <p class="hero-desc">
              从集中宣讲到正式入组，八个阶段全流程线上化。志愿、面试、拟录取、内部与跨室调剂、公示与入组
              全程留痕，名额与时间窗由系统统一约束。
            </p>
            <div class="hero-actions">
              <button class="cta" @click="openLogin">立即登录 <span>↗</span></button>
              <button class="ghost-btn" @click="scrollToId('stages')">查看八阶段流程 ↓</button>
            </div>
            <div class="terminal">
              <span class="prompt">&gt;</span>
              <span class="typed">{{ typed }}</span>
              <span class="caret"></span>
            </div>
          </div>

          <div class="hero-visual">
            <div class="visual-frame">
              <svg class="software-blueprint" viewBox="0 0 560 560" fill="none" aria-hidden="true" focusable="false">
                <!-- 静态版本分支与代码符号，作为机器人背后的专业纹理。 -->
                <path class="blueprint-path" d="M34 120V282C34 310 78 310 78 338V448H180M34 216C34 244 114 244 114 272V304M392 62H470C496 62 510 76 510 102V190M400 492H492V378" />
                <g class="blueprint-nodes">
                  <circle cx="34" cy="120" r="5" /><circle cx="34" cy="216" r="5" />
                  <circle cx="114" cy="304" r="5" /><circle cx="78" cy="388" r="5" />
                  <circle cx="180" cy="448" r="5" /><circle cx="392" cy="62" r="4" />
                  <circle cx="510" cy="190" r="4" /><circle cx="492" cy="378" r="4" />
                </g>
                <text x="356" y="108" class="blueprint-symbol">&lt;/&gt;</text>
                <text x="300" y="492" class="blueprint-label">git commit</text>
                <text x="110" y="480" class="blueprint-label">idea → code</text>
              </svg>
              <div class="ring ring-a" aria-hidden="true"></div>
              <div class="ring ring-b" aria-hidden="true"></div>
              <RobotScene class="robot-3d" />
              <div class="float-tag tag-a">名额实时约束</div>
              <div class="float-tag tag-b">时间窗自动锁定</div>
              <div class="float-tag tag-c">调剂去重校验</div>
            </div>
            <div class="visual-caption">
              <span>08 STAGES</span>
              <span>ONE CHAIN</span>
            </div>
          </div>
        </div>

        <!-- 数据条：固定留在第一页 -->
        <section ref="statsRef" class="stats reveal">
          <div v-for="(item, index) in stats" :key="item.label" class="stat">
            <strong>{{ statValues[index] }}<em>{{ item.suffix }}</em></strong>
            <span>{{ item.label }}</span>
          </div>
        </section>
      </section>

      <!-- 平台介绍 -->
      <section id="intro" class="section intro reveal">
        <div class="section-head">
          <p class="kicker">01 / OVERVIEW</p>
          <h2 class="section-title">一套平台，串起<br />从宣讲到入组的每一步</h2>
        </div>
        <div class="intro-body">
          <p class="lead">
            软件学院学生实训室双向选拔与统筹调剂管理平台，面向学生、实训室教师、实训室组长与学院总负责人四类角色，
            把原本分散在线下通知、表格与沟通中的选拔流程，收敛为一条可追踪的线上链路。
          </p>
          <ul class="feature-list">
            <li v-for="feature in features" :key="feature.title">
              <span class="feature-index">{{ feature.index }}</span>
              <div>
                <h3>{{ feature.title }}</h3>
                <p>{{ feature.desc }}</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- 八阶段 -->
      <section id="stages" class="section reveal">
        <div class="section-head">
          <p class="kicker">02 / PROCESS</p>
          <h2 class="section-title">八阶段透明选拔</h2>
          <p class="section-desc">阶段顺序与时间窗由学院统一配置，当前阶段在学生端与教师端同步高亮。</p>
        </div>
        <div class="stage-grid">
          <article
            v-for="(stage, index) in stages"
            :key="stage.key"
            class="stage-card"
            :style="{ transitionDelay: `${index * 60}ms` }"
          >
            <div class="stage-head">
              <span class="stage-no">{{ String(stage.no).padStart(2, '0') }}</span>
              <span class="stage-line"></span>
            </div>
            <h3>{{ stage.name }}</h3>
            <p>{{ stage.desc }}</p>
          </article>
        </div>
      </section>

      <!-- 角色 -->
      <section id="roles" class="section reveal">
        <div class="section-head">
          <p class="kicker">03 / ROLES</p>
          <h2 class="section-title">四类角色，各司其职</h2>
        </div>
        <div class="role-grid">
          <article v-for="role in roleCards" :key="role.code" class="role-card">
            <span class="role-code">{{ role.code }}</span>
            <h3>{{ role.name }}</h3>
            <p>{{ role.desc }}</p>
            <ul>
              <li v-for="point in role.points" :key="point">{{ point }}</li>
            </ul>
          </article>
        </div>
      </section>

      <!-- 常见问题 -->
      <section id="faq" class="section faq-screen reveal">
        <div class="section-head">
          <p class="kicker">04 / FAQ</p>
          <h2 class="section-title">常见问题</h2>
        </div>
        <div class="faq-list">
          <details v-for="(faq, index) in faqs" :key="faq.q" name="faq" class="faq-item">
            <summary>
              <span class="faq-no">{{ String(index + 1).padStart(2, '0') }}</span>
              <span>{{ faq.q }}</span>
              <i class="faq-toggle">+</i>
            </summary>
            <p>{{ faq.a }}</p>
          </details>
        </div>
      </section>

      <!-- 登录引导 -->
      <section id="cta" class="cta-band reveal">
        <span class="cta-watermark" aria-hidden="true">LAB MATCH</span>
        <span class="cta-rail rail-left" aria-hidden="true">SOFTWARE COLLEGE · LAB MATCH · 2026</span>
        <span class="cta-rail rail-right" aria-hidden="true">SELECT · MATCH · ADJUST · ENROLL</span>
        <p class="kicker">READY WHEN YOU ARE</p>
        <h2>准备好开始你的进组之旅了吗？</h2>
        <p>使用学号或工号登录，进入与你角色对应的工作台。</p>
        <button class="cta" @click="openLogin">登录平台 <span>↗</span></button>

        <footer class="footer">
          <span>© 2026 软件学院 · 实训室进组选拔项目组</span>
          <span class="footer-meta">数据存储：文件 / MySQL 可切换 · 仅限学院内部选拔使用</span>
        </footer>
      </section>
    </main>

    <div class="scroll-progress" :style="{ transform: `scaleX(${scrollProgress})` }" aria-hidden="true"></div>

    <nav class="section-rail" aria-label="页面章节导航">
      <button
        v-for="item in railSections"
        :key="item.id"
        type="button"
        class="rail-item"
        :class="{ active: activeSection === item.id }"
        @click="scrollToId(item.id)"
      >
        <span class="rail-label">{{ item.label }}</span>
        <span class="rail-dot"></span>
      </button>
    </nav>

    <!-- 登录弹窗 -->
    <el-dialog
      v-model="loginVisible"
      width="440px"
      align-center
      class="login-dialog"
      modal-class="login-modal"
      :close-on-click-modal="false"
      @opened="focusAccount"
    >
      <template #header>
        <div class="dialog-head">
          <img class="school-logo dialog-school-logo" :src="schoolLogo" width="4206" height="650" alt="河北师范大学软件学院" />
          <p class="kicker">SIGN IN</p>
          <h2>统一登录</h2>
          <p class="dialog-sub">学生、导师、组长与学院负责人使用同一入口</p>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <el-form-item label="学号 / 工号" prop="username">
          <el-input ref="accountRef" v-model="form.username" size="large" placeholder="请输入学号或工号"
            autocomplete="username" clearable>
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" size="large" type="password" show-password placeholder="请输入密码"
            autocomplete="current-password">
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>
        <p v-if="loginError" class="login-error" role="alert">{{ loginError }}</p>
        <button type="submit" class="cta dialog-submit" :disabled="auth.loading">
          {{ auth.loading ? '登录中…' : '登录' }}
        </button>
      </el-form>

      <p class="tip">学生和教师使用初始密码登录时须修改密码。账号异常请联系学院管理员。</p>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules, InputInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import RobotScene from '@/components/RobotScene.vue'
import { stages, ROLE_HOME } from '@/config/stages'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const schoolLogo = `${import.meta.env.BASE_URL}brand/hebei-normal-software.jpg`
const loginError = ref('')

const landingRef = ref<HTMLElement | null>(null)
const heroRef = ref<HTMLElement | null>(null)
const statsRef = ref<HTMLElement | null>(null)
const booting = ref(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
const bootGreeting = 'Hello 软件人'
const bootText = ref('')
let bootTimer = 0
const formRef = ref<FormInstance>()
const accountRef = ref<InputInstance>()

const tickerItems = [
  '河北师范大学软件学院 · 实训室进组选拔平台',
  '八阶段全流程线上化 · 志愿 / 面试 / 拟录取 / 调剂 / 公示',
  '最多 3 个平行志愿 · 内部与跨室调剂独立选择',
  '名额与时间窗由系统统一约束，操作全程留痕'
]

const navLinks = [
  { id: 'intro', label: '平台介绍' },
  { id: 'stages', label: '八阶段流程' },
  { id: 'roles', label: '角色权限' },
  { id: 'faq', label: '常见问题' }
]

const stats = [
  { value: 8, suffix: '', label: '选拔阶段' },
  { value: 4, suffix: '', label: '核心角色' },
  { value: 3, suffix: '', label: '平行志愿' },
  { value: 100, suffix: '%', label: '操作留痕' }
]
const statValues = ref([0, 0, 0, 0])

const features = [
  {
    index: '01',
    title: '全流程线上闭环',
    desc: '宣讲、开放日、意向填报、面试、拟录取、调剂、公示、入组，八个阶段在同一平台内推进。'
  },
  {
    index: '02',
    title: '名额与规则双重约束',
    desc: '拟录取、调剂与最终录取三个环节校验名额；学生在确认期内选择一份拟录取邀请。'
  },
  {
    index: '03',
    title: '按实训室的数据隔离',
    desc: '教师与组长只能看到本实训室数据，学院总负责人掌握全院视图，角色权限来自账号本身。'
  },
  {
    index: '04',
    title: '结果可追溯',
    desc: '关键操作写入审计日志，公示期支持异议登记与处理，入组结果可导出留档。'
  }
]

const roleCards = [
  {
    code: 'STUDENT',
    name: '学生',
    desc: '了解实训室方向，完成志愿填报与结果确认。',
    points: ['查看宣讲与 720° 全景', '填报最多 3 个平行志愿', '确认拟录取与调剂结果', '公示期提交异议']
  },
  {
    code: 'LAB_TEACHER',
    name: '实训室教师',
    desc: '负责本实训室的初选、面试与拟录取建议。',
    points: ['报名学生名单', '面试排期与五维评分', '提交拟录取 / 递补建议', '维护导师团队信息']
  },
  {
    code: 'LAB_LEADER',
    name: '实训室组长',
    desc: '统筹本实训室选拔进度与内部调剂。',
    points: ['本室选拔汇总', '确认进度跟踪', '内部调剂与补录统筹', '剩余名额上报']
  },
  {
    code: 'COLLEGE_ADMIN',
    name: '学院总负责人',
    desc: '配置批次阶段，统筹全院调剂与公示入组。',
    points: ['批次与八阶段配置', '跨实训室调剂与安置', '最终名单审核与公示', '统计分析与操作日志']
  }
]

const faqs = [
  {
    q: '一个学生可以填报几个志愿？',
    a: '最多 3 个平行志愿，志愿之间不设先后优先级；是否服从实训室内部调剂、是否服从学院统筹调剂为两项独立意愿，需要分别选择。'
  },
  {
    q: '拟录取是怎么确认的？',
    a: '学生需在截止时间前确认一份拟录取邀请。确认后，其余待确认的邀请将释放名额。'
  },
  {
    q: '名额满了还能被录取吗？',
    a: '系统在拟录取、调剂和最终录取三个环节都会校验名额。若前面有学生放弃，名额释放后按规则递补，不允许超额录取。'
  },
  {
    q: '调剂会重复或者越权吗？',
    a: '内部调剂只能在本实训室范围内进行，跨实训室调剂由学院统一发起且要求学生服从全院调剂；已确认录取或已入组的学生不会再进入调剂池。'
  },
  {
    q: '在哪里查看结果并提出异议？',
    a: '阶段八公示期间，学生端会展示最终名单，可在公示期内提交异议并查看处理结果；学院端可登记、处理并跟踪异议状态。'
  }
]

const form = reactive({
  username: '',
  password: ''
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入学号或工号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const loginVisible = ref(false)
const scrolled = ref(false)
const activeSection = ref('top')
const scrollProgress = ref(0)

const railSections = [
  { id: 'top', label: 'HOME' },
  { id: 'intro', label: 'INTRO' },
  { id: 'stages', label: 'PROCESS' },
  { id: 'roles', label: 'ROLES' },
  { id: 'faq', label: 'FAQ' },
  { id: 'cta', label: 'SIGN IN' }
]

/* ---------- 打字动画 ---------- */
const phrases = [
  '探索实训室 · 了解项目方向',
  '最多三个平行志愿 · 两项调剂意愿',
  '查看面试安排 · 确认选拔结果'
]
const typed = ref('')
let phraseIndex = 0
let charIndex = 0
let deleting = false
let typeTimer: number | undefined

function typeLoop() {
  const current = phrases[phraseIndex]
  if (!deleting) {
    charIndex += 1
    typed.value = current.slice(0, charIndex)
    if (charIndex >= current.length) {
      deleting = true
      typeTimer = window.setTimeout(typeLoop, 1800)
      return
    }
    typeTimer = window.setTimeout(typeLoop, 72)
  } else {
    charIndex -= 1
    typed.value = current.slice(0, charIndex)
    if (charIndex <= 0) {
      deleting = false
      phraseIndex = (phraseIndex + 1) % phrases.length
      typeTimer = window.setTimeout(typeLoop, 320)
      return
    }
    typeTimer = window.setTimeout(typeLoop, 26)
  }
}

/* ---------- 数字滚动 ---------- */
let statsPlayed = false
function runStats() {
  if (statsPlayed) return
  statsPlayed = true
  const start = performance.now()
  const duration = 1200
  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    statValues.value = stats.map((item) => Math.round(item.value * eased))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/* ---------- 滚动进场 ---------- */
let revealObserver: IntersectionObserver | undefined

let scrollFrame = 0
let wheelLockedUntil = 0
const chapterWheel = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')

function chapterTop(el: HTMLElement, target: HTMLElement) {
  if (target.id === 'top') return 0
  const navOffset = Number.parseFloat(getComputedStyle(el).scrollPaddingTop) || 0
  return target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - navOffset
}

function scrollToId(id: string) {
  const el = landingRef.value
  const target = document.getElementById(id)
  if (!el || !target) return
  const top = chapterTop(el, target)
  el.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}

function onChapterWheel(event: WheelEvent) {
  const el = landingRef.value
  if (!el || !chapterWheel.matches || booting.value || loginVisible.value || event.ctrlKey ||
    !event.cancelable || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

  const now = performance.now()
  if (now < wheelLockedUntil) {
    event.preventDefault()
    wheelLockedUntil = Math.max(wheelLockedUntil, now + 120)
    return
  }

  const edgeTolerance = 24
  const chapters = [...el.querySelectorAll<HTMLElement>('.main > section')]
  const positions = chapters.map(chapter => chapterTop(el, chapter))
  const firstAhead = positions.findIndex(top => top > el.scrollTop + 2)
  const current = (firstAhead === -1 ? positions.length : firstAhead) - 1
  if (current < 0) return

  const down = event.deltaY > 0
  const next = chapters[current + (down ? 1 : -1)]
  if (!next) return
  const sectionEnd = chapters[current]!.getBoundingClientRect().bottom
  const viewportEnd = el.getBoundingClientRect().bottom
  if (down ? sectionEnd > viewportEnd + edgeTolerance : el.scrollTop > positions[current]! + edgeTolerance) return

  event.preventDefault()
  wheelLockedUntil = now + 440
  scrollToId(next.id)
}

function onScroll() {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0
    updateScrollState()
  })
}

function updateScrollState() {
  const el = landingRef.value
  if (!el) return
  const scrollTop = el.scrollTop
  scrolled.value = scrollTop > 12

  const maxScroll = el.scrollHeight - el.clientHeight
  scrollProgress.value = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0
  // 章节高亮：取最后一个已越过视口上沿 40% 的区块
  const containerTop = el.getBoundingClientRect().top
  const line = scrollTop + el.clientHeight * 0.4
  let current = 'top'
  railSections.forEach((item) => {
    const target = document.getElementById(item.id)
    if (!target) return
    const relTop = target.getBoundingClientRect().top - containerTop + scrollTop
    if (relTop <= line) current = item.id
  })
  activeSection.value = current
}

/* ---------- 鼠标光晕 ---------- */
let pointerFrame = 0
let lastPointer: MouseEvent | null = null
function onPointerMove(event: MouseEvent) {
  lastPointer = event
  if (pointerFrame) return
  pointerFrame = window.requestAnimationFrame(() => {
    pointerFrame = 0
    const el = landingRef.value
    const target = lastPointer
    if (!el || !target) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${target.clientX - rect.left}px`)
    el.style.setProperty('--my', `${target.clientY - rect.top}px`)
  })
}

function openLogin() {
  loginError.value = ''
  loginVisible.value = true
}

function focusAccount() {
  nextTick(() => accountRef.value?.focus())
}

function goWorkspace() {
  router.push(ROLE_HOME[auth.currentRole] || '/')
}

async function submit() {
  if (auth.loading) return
  loginError.value = ''
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    const data = await auth.login({ username: form.username, password: form.password })
    loginVisible.value = false
    if (data.user.mustChangePassword) {
      await router.replace('/change-password')
    } else {
      ElMessage.success(`欢迎回来，${data.user.realName}`)
      await router.replace(ROLE_HOME[data.activeRole] || '/')
    }
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
  }
}

function finishBoot() {
  window.clearTimeout(bootTimer)
  booting.value = false
}

function runBoot() {
  if (!booting.value) return
  let length = 0
  function typeGreeting() {
    length += 1
    bootText.value = bootGreeting.slice(0, length)
    bootTimer = length < bootGreeting.length
      ? window.setTimeout(typeGreeting, 90)
      : window.setTimeout(finishBoot, 300)
  }
  bootTimer = window.setTimeout(typeGreeting, 140)
}

onMounted(() => {
  runBoot()
  typeLoop()
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('in')
        if (entry.target === statsRef.value) runStats()
        revealObserver?.unobserve(entry.target)
      })
    },
    { threshold: 0.18 }
  )
  document.querySelectorAll('.landing .reveal').forEach((el) => revealObserver?.observe(el))
  updateScrollState()
})

onBeforeUnmount(() => {
  if (typeTimer) window.clearTimeout(typeTimer)
  window.clearTimeout(bootTimer)
  window.cancelAnimationFrame(scrollFrame)
  revealObserver?.disconnect()
})
</script>

<style scoped>
.landing {
  --nav-height: 68px;
  --ticker-height: 32px;
  --cream: #f1efe9;
  --ink: #14161a;
  --muted: #6b6862;
  --line: rgba(20, 22, 26, 0.14);
  --accent: #ff5f9e;
  --accent-warm: #ffb26b;

  position: relative;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scroll-padding-top: var(--nav-height);
  scroll-snap-type: y mandatory;
  background: var(--cream);
  color: var(--ink);
  font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  --mx: 50%;
  --my: 30%;
}

.main > section {
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

/* 首屏停在页面顶部，保留导航上方的通告条。 */
.main > .hero {
  scroll-margin-top: var(--ticker-height);
}

/* ---------- 登录开场 ---------- */
.boot {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 18px;
  background:
    radial-gradient(ellipse at 72% 77%, #f3ded7, transparent 58%),
    #f4f0e9;
}
.boot-panel {
  position: relative;
  width: min(100%, 650px);
  padding: clamp(24px, 6vw, 68px);
  border: 1px solid #dfd4cb;
  border-radius: 20px;
  background:
    linear-gradient(90deg, #98725a12 1px, transparent 1px),
    linear-gradient(#98725a12 1px, transparent 1px),
    #fffaf5;
  background-size: 32px 32px;
  box-shadow: 0 24px 72px #51352d16;
}
.boot-caption {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #7a4437;
  font: 600 13px var(--workspace-mono, Consolas, monospace);
  letter-spacing: .14em;
}
.boot-caption span {
  padding: 4px 6px;
  border: 1px solid #e7d3c8;
  border-radius: 5px;
  background: #faeae0;
}
.boot-greeting {
  display: inline-grid;
  margin: 18px 0 8px;
  color: #292321;
  font: 750 clamp(26px, 6vw, 63px)/1.18 Consolas, "Microsoft YaHei", monospace;
  letter-spacing: -.045em;
  white-space: nowrap;
}
.boot-greeting > span { grid-area: 1 / 1; }
.boot-measure { visibility: hidden; }
.boot-typing i {
  display: inline-block;
  width: .09em;
  height: .82em;
  margin-inline-start: .15em;
  vertical-align: -.03em;
  border-radius: 1px;
  background: #a4402a;
}
.boot-school { margin: 0; color: #64534a; font-size: 13px; letter-spacing: .06em; }
.boot-skip {
  display: block;
  margin: 20px 0 0 auto;
  padding: 7px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #7a4437;
  cursor: pointer;
  font: inherit;
}
.boot-skip:hover, .boot-skip:focus-visible { background: #faeae0; }
.boot-skip:focus-visible { outline: 2px solid #a4402a; outline-offset: 2px; }
.boot-exit-leave-active { transition: opacity .26s ease; pointer-events: none; }
.boot-exit-leave-to { opacity: 0; }

.grid-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(20, 22, 26, 0.055) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(20, 22, 26, 0.055) 1px, transparent 1px),
    radial-gradient(120% 80% at 50% -12%, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0) 62%),
    radial-gradient(58% 52% at 86% 6%, rgba(255, 178, 107, 0.22), transparent 66%),
    radial-gradient(52% 55% at 8% 22%, rgba(255, 95, 158, 0.13), transparent 64%);
  background-size: 96px 96px, 96px 96px, 100% 100%, 100% 100%, 100% 100%;
  will-change: transform;
}

.spotlight {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(560px circle at var(--mx) var(--my), rgba(255, 95, 158, 0.1), transparent 62%);
}

.ticker,
.nav,
.main,
.footer {
  position: relative;
  z-index: 1;
}

/* ---------- 顶部通告 ---------- */
.ticker {
  display: flex;
  align-items: center;
  height: var(--ticker-height);
  overflow: hidden;
  border-bottom: 1px solid var(--line);
  background: rgba(241, 239, 233, 0.9);
}

.ticker-track {
  display: flex;
  gap: 40px;
  width: max-content;
  animation: marquee 36s linear infinite;
}

.ticker-track span {
  display: inline-flex;
  align-items: center;
  gap: 40px;
  font-family: ui-monospace, "JetBrains Mono", Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}

.ticker-track span::after {
  content: "◆";
  color: var(--accent);
  font-size: 8px;
}

@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

/* ---------- 导航 ---------- */
.nav {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  height: var(--nav-height);
  padding: 0 clamp(20px, 5vw, 64px);
  border-bottom: 1px solid var(--line);
  background: rgba(241, 239, 233, 0.94);
  transition: box-shadow 0.3s ease;
}

.nav.scrolled {
  box-shadow: 0 10px 30px rgba(20, 22, 26, 0.06);
}

/* 导航右侧点阵纹理：弱化右侧整块留白 */
.nav::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  width: 460px;
  pointer-events: none;
  background-image: radial-gradient(rgba(20, 22, 26, 0.16) 1px, transparent 1px);
  background-size: 12px 12px;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 72%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 72%);
  opacity: 0.5;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.06em;
  color: #fff;
  background: linear-gradient(135deg, #ff8a5c, #ff5f9e);
  box-shadow: 0 6px 18px rgba(255, 95, 158, 0.35);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.brand-text strong {
  font-size: 14px;
  letter-spacing: 0.02em;
}

.brand-text em {
  font-family: ui-monospace, Consolas, monospace;
  font-style: normal;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--muted);
}

.nav-links {
  display: flex;
  gap: 6px;
}

.nav-link {
  padding: 8px 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-link:hover {
  background: rgba(20, 22, 26, 0.06);
  color: var(--ink);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.nav-status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.56);
}

.nav-status-text {
  display: flex;
  flex-direction: column;
  line-height: 1.32;
}

.nav-status-text b {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.nav-status-text em {
  font-family: ui-monospace, Consolas, monospace;
  font-style: normal;
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.launch-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: 1px solid var(--ink);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease, color 0.25s ease;
}

.launch-btn span {
  color: var(--accent);
}

.launch-btn:hover {
  background: var(--ink);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(20, 22, 26, 0.18);
}

.launch-btn.solid {
  background: var(--ink);
  color: #fff;
}

.launch-btn.solid:hover {
  background: #000;
}

/* ---------- Hero ---------- */
.main {
  max-width: none;
  margin: 0 auto;
  padding: 0 clamp(24px, 4.5vw, 96px);
}

.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(18px, 4vh, 40px);
  min-height: calc(100vh - 100px);
  padding: clamp(24px, 4vh, 48px) 0 clamp(18px, 3vh, 30px);
  overflow: hidden;
}

.hero-inner {
  display: grid;
  grid-template-columns: minmax(320px, 1.08fr) minmax(300px, 0.92fr);
  align-items: center;
  gap: clamp(28px, 5vw, 72px);
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1560px;
  margin: 0 auto;
}

.hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
  opacity: 0.55;
  animation: orbDrift 14s ease-in-out infinite;
}

.orb-warm {
  width: 320px;
  height: 320px;
  top: -70px;
  right: 16%;
  background: radial-gradient(circle, rgba(255, 178, 107, 0.55), transparent 70%);
}

.orb-pink {
  width: 260px;
  height: 260px;
  bottom: 4%;
  left: -50px;
  background: radial-gradient(circle, rgba(255, 95, 158, 0.4), transparent 70%);
  animation-delay: -6s;
}

@keyframes orbDrift {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(26px, -20px, 0); }
}

/* Hero 装饰层：背景水印 + 散落十字标记 */
.hero-deco {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.deco-watermark {
  position: absolute;
  left: 50%;
  bottom: -0.14em;
  transform: translateX(-50%);
  font-size: clamp(96px, 15vw, 208px);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: 0.02em;
  white-space: nowrap;
  color: transparent;
  -webkit-text-stroke: 1px rgba(20, 22, 26, 0.07);
}

/* 首屏四角装饰线 */
.deco-corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 0 solid rgba(20, 22, 26, 0.22);
}

.corner-tl {
  top: 10px;
  left: 0;
  border-top-width: 1px;
  border-left-width: 1px;
}

.corner-tr {
  top: 10px;
  right: 0;
  border-top-width: 1px;
  border-right-width: 1px;
}

.corner-bl {
  bottom: 10px;
  left: 0;
  border-bottom-width: 1px;
  border-left-width: 1px;
}

.corner-br {
  bottom: 10px;
  right: 0;
  border-bottom-width: 1px;
  border-right-width: 1px;
}

.deco-plus {
  position: absolute;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 15px;
  line-height: 1;
  color: rgba(255, 95, 158, 0.5);
  animation: decoTwinkle 4.6s ease-in-out infinite;
}

.plus-a {
  top: 8%;
  left: 52.6%;
}

.plus-b {
  top: 32%;
  left: 56.4%;
  animation-delay: -1.2s;
}

.plus-c {
  bottom: 30%;
  left: 52.6%;
  animation-delay: -2.4s;
}

.plus-d {
  bottom: 12%;
  left: 56.4%;
  animation-delay: -3.4s;
}

@keyframes decoTwinkle {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(0.9);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.1);
  }
}

.hero-platform {
  margin: -8px 0 18px;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: #8a8781;
}

.kicker {
  margin: 0 0 18px;
  font-family: ui-monospace, "JetBrains Mono", Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--muted);
}

.hero-title {
  margin: 0;
  font-size: clamp(46px, 6.4vw, 88px);
  line-height: 1.02;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.hero-title .line {
  display: block;
}

.boxed {
  display: inline-block;
  padding: 0 16px 6px;
  border: 1px solid var(--ink);
  border-radius: 4px;
}

.grad {
  background: linear-gradient(100deg, #ff8a5c 0%, #ff5f9e 70%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-desc {
  max-width: 520px;
  margin: 26px 0 0;
  font-size: 15px;
  line-height: 1.95;
  color: var(--muted);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px 26px;
  border: 0;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.cta span {
  color: var(--accent-warm);
}

.cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(20, 22, 26, 0.24);
}

.cta:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.ghost-btn {
  padding: 13px 22px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.ghost-btn:hover {
  border-color: var(--ink);
  background: rgba(20, 22, 26, 0.04);
}

.terminal {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 520px;
  margin-top: 34px;
  padding: 13px 18px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
  font-family: ui-monospace, "JetBrains Mono", Consolas, monospace;
  font-size: 12px;
  color: #3b3a37;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.terminal .prompt {
  color: var(--accent);
  font-weight: 700;
}

.caret {
  width: 7px;
  height: 14px;
  background: var(--accent);
  animation: blink 1s steps(1) infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

/* ---------- Hero 视觉 ---------- */
.hero-visual {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.visual-frame {
  position: relative;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  aspect-ratio: 1 / 1;
  border: 1px solid var(--line);
  border-radius: 20px;
  background:
    radial-gradient(circle at 70% 20%, rgba(255, 178, 107, 0.28), transparent 55%),
    radial-gradient(circle at 25% 80%, rgba(255, 95, 158, 0.16), transparent 55%),
    #eeece6;
  overflow: hidden;
}

.robot-3d {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ring {
  position: absolute;
  border: 1px dashed rgba(20, 22, 26, 0.18);
  border-radius: 50%;
}

.ring-a {
  inset: 12%;
  animation: spin 40s linear infinite;
}

.ring-b {
  inset: 22%;
  animation: spin 26s linear infinite reverse;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.float-tag {
  position: absolute;
  padding: 7px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #3b3a37;
  animation: floaty 5s ease-in-out infinite;
}

.tag-a {
  top: 9%;
  left: 6%;
}

.tag-b {
  top: 24%;
  right: 4%;
  animation-delay: 1.2s;
}

.tag-c {
  bottom: 12%;
  left: 10%;
  animation-delay: 2.4s;
}

@keyframes floaty {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.visual-caption {
  display: flex;
  justify-content: space-between;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--muted);
}

/* ---------- 数据条 ---------- */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  position: relative;
  z-index: 1;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.stat {
  padding: 26px 20px;
  border-right: 1px solid var(--line);
  text-align: center;
}

.stat:last-child {
  border-right: 0;
}

.stat strong {
  display: block;
  font-size: clamp(30px, 3.4vw, 46px);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.stat strong em {
  font-style: normal;
  font-size: 0.5em;
  color: var(--accent);
}

.stat span {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--muted);
}

/* ---------- 通用区块 ---------- */
.section {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(18px, 3vh, 36px);
  min-height: calc(100vh - 68px);
  padding: clamp(24px, 4vh, 48px) 0;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
}

.section-head {
  margin-bottom: 0;
}

.section-title {
  margin: 0;
  font-size: clamp(32px, 3.2vw, 52px);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.section-desc {
  max-width: 720px;
  margin: 16px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--muted);
}

/* ---------- 平台介绍 ---------- */
.intro {
  display: grid;
  grid-template-columns: minmax(280px, 0.86fr) minmax(360px, 1.14fr);
  gap: clamp(36px, 5vw, 110px);
  align-content: center;
  align-items: center;
}

.intro .section-head {
  margin-bottom: 0;
}

.lead {
  max-width: 82ch;
  margin: 0 0 26px;
  font-size: 17px;
  line-height: 1.95;
  color: #3b3a37;
}

.feature-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.feature-list li {
  display: flex;
  gap: 16px;
  padding: clamp(12px, 1.8vh, 20px) 0;
  border-top: 1px solid var(--line);
}

.feature-index {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.14em;
  color: var(--accent);
  padding-top: 4px;
}

.feature-list h3 {
  margin: 0 0 6px;
  font-size: 16.5px;
}

.feature-list p {
  max-width: 68ch;
  margin: 0;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--muted);
}

/* ---------- 八阶段 ---------- */
.stage-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(0, 1fr);
  border-top: 1px solid var(--line);
  border-left: 1px solid var(--line);
}

.stage-card {
  padding: clamp(18px, 2.6vh, 32px) clamp(20px, 1.8vw, 34px) clamp(20px, 2.8vh, 34px);
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.35);
  overflow: hidden;
  transition: background 0.3s ease, transform 0.3s ease;
}

.stage-card:hover {
  background: #fff;
  transform: translateY(-3px);
}

.stage-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: clamp(12px, 2.4vh, 28px);
}

.stage-no {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.16em;
  color: var(--accent);
}

.stage-line {
  flex: 1;
  height: 1px;
  background: var(--line);
}

.stage-card h3 {
  margin: 0 0 10px;
  font-size: 17px;
  letter-spacing: 0.01em;
}

.stage-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.85;
  color: var(--muted);
}

/* ---------- 角色 ---------- */
.role-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: clamp(16px, 1.6vw, 28px);
}

.role-card {
  display: flex;
  flex-direction: column;
  padding: clamp(22px, 3vh, 32px) clamp(20px, 1.8vw, 32px);
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.5);
  transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
}

.role-card:hover {
  transform: translateY(-4px);
  background: #fff;
  box-shadow: 0 16px 36px rgba(20, 22, 26, 0.08);
}

.role-code {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--accent);
}

.role-card h3 {
  margin: 12px 0 8px;
  font-size: 18px;
}

.role-card > p {
  margin: 0 0 16px;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--muted);
}

.role-card ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 9px;
}

.role-card li {
  position: relative;
  padding-left: 14px;
  font-size: 13.5px;
  color: #3b3a37;
}

.role-card li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffb26b, #ff5f9e);
}

/* ---------- FAQ ---------- */
.faq-screen {
  display: grid;
  grid-template-columns: minmax(220px, 0.6fr) minmax(380px, 1.4fr);
  gap: clamp(36px, 5vw, 96px);
  align-content: center;
  align-items: center;
}

.faq-list {
  border-top: 1px solid var(--line);
}

.faq-item {
  border-bottom: 1px solid var(--line);
}

.faq-item summary {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: clamp(14px, 2.1vh, 24px) 4px;
  font-size: 16px;
  cursor: pointer;
  list-style: none;
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-no {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--muted);
}

.faq-toggle {
  margin-left: auto;
  font-style: normal;
  font-size: 18px;
  color: var(--accent);
  transition: transform 0.25s ease;
}

.faq-item[open] .faq-toggle {
  transform: rotate(45deg);
}

.faq-item p {
  margin: 0;
  padding: 0 4px 24px 43px;
  max-width: 900px;
  font-size: 14px;
  line-height: 1.9;
  color: var(--muted);
}

/* ---------- 登录引导 ---------- */
.cta-band {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 68px);
  padding: 0 0 84px;
  overflow: hidden;
  text-align: center;
  border-bottom: 1px solid var(--line);
}

/* 大号描边水印 + 两侧竖排信息，填满首尾页留白 */
.cta-band::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(circle at 50% 46%, rgba(255, 95, 158, 0.1), transparent 62%);
}

.cta-watermark {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: clamp(120px, 18vw, 280px);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: 0.04em;
  white-space: nowrap;
  color: transparent;
  -webkit-text-stroke: 1px rgba(20, 22, 26, 0.09);
  pointer-events: none;
  user-select: none;
  z-index: 0;
}

.cta-rail {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.32em;
  white-space: nowrap;
  color: rgba(20, 22, 26, 0.24);
  pointer-events: none;
  z-index: 0;
}

.rail-left {
  left: clamp(10px, 2vw, 40px);
}

.rail-right {
  right: clamp(10px, 2vw, 40px);
  transform: translateY(-50%) rotate(180deg);
}

.cta-band > .kicker,
.cta-band > h2,
.cta-band > p,
.cta-band > .cta {
  position: relative;
  z-index: 1;
}

.cta-band .footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  text-align: left;
}

.cta-band h2 {
  margin: 0 0 14px;
  font-size: clamp(30px, 3.6vw, 54px);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.cta-band p {
  max-width: 760px;
  margin: 0 0 30px;
  font-size: 16px;
  line-height: 1.8;
  color: var(--muted);
}

.cta-band .kicker {
  margin-bottom: 18px;
  font-size: 11px;
  letter-spacing: 0.24em;
  color: var(--muted);
}

/* ---------- 页脚 ---------- */
.footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  padding: 28px clamp(20px, 5vw, 64px);
  font-size: 12px;
  color: var(--muted);
}

.footer-meta {
  font-family: ui-monospace, Consolas, monospace;
  letter-spacing: 0.06em;
}

/* ---------- 滚动指引 ---------- */
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 60;
  pointer-events: none;
  transform-origin: 0 50%;
  background: linear-gradient(90deg, #ffb26b, #ff5f9e 55%, #2f6fed);
}

.section-rail {
  position: fixed;
  right: 22px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 14px;
  z-index: 30;
}

.rail-item {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: rgba(20, 22, 26, 0.42);
  cursor: pointer;
  transition: color 0.3s ease;
}

.rail-label {
  opacity: 0.5;
  transform: translateX(4px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.rail-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  transition: height 0.3s ease, background 0.3s ease;
}

.rail-item:hover,
.rail-item.active {
  color: var(--ink);
}

.rail-item:hover .rail-label,
.rail-item.active .rail-label {
  opacity: 1;
  transform: none;
}

.rail-item.active .rail-dot {
  height: 22px;
  background: linear-gradient(180deg, #ffb26b, #ff5f9e);
}

/* ---------- 章节渐显，保持滚动停靠位置固定 ---------- */
.reveal {
  opacity: 0;
  transition: opacity .4s ease;
}

.reveal.in {
  opacity: 1;
}

/* 首屏文案逐条渐显（启动动画结束后才开始） */
.landing.ready .hero-copy > * {
  animation: softRise 1s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.landing.ready .hero-copy > :nth-child(1) {
  animation-delay: 0.04s;
}

.landing.ready .hero-copy > :nth-child(2) {
  animation-delay: 0.12s;
}

.landing.ready .hero-copy > :nth-child(3) {
  animation-delay: 0.2s;
}

.landing.ready .hero-copy > :nth-child(4) {
  animation-delay: 0.3s;
}

.landing.ready .hero-copy > :nth-child(5) {
  animation-delay: 0.4s;
}

.landing.ready .hero-copy > :nth-child(6) {
  animation-delay: 0.5s;
}

.landing.ready .hero-visual {
  animation: softRise 1.15s cubic-bezier(0.22, 1, 0.36, 1) 0.24s both;
}

@keyframes softRise {
  from {
    opacity: 0;
    transform: translateY(28px);
    filter: blur(9px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: blur(0);
  }
}

/* ---------- 登录弹窗内容 ---------- */
.dialog-head {
  text-align: left;
}

.dialog-head .kicker {
  margin-bottom: 8px;
}

.dialog-head h2 {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: #14161a;
}

.dialog-sub {
  margin: 0;
  font-size: 12.5px;
  color: #8a8781;
}

.dialog-submit {
  width: 100%;
  justify-content: center;
  margin-top: 4px;
}

.tip {
  margin: 18px 0 0;
  font-size: 11.5px;
  color: #a5a19a;
  line-height: 1.7;
}

/* 弹窗外壳（teleport 到 body，需全局选择器） */
:global(.login-modal) {
  background: linear-gradient(
    158deg,
    rgba(241, 239, 233, 0.86) 0%,
    rgba(250, 236, 224, 0.7) 46%,
    rgba(255, 95, 158, 0.26) 100%
  );
}

:global(.login-dialog) {
  border-radius: 18px;
  overflow: hidden;
  max-width: calc(100vw - 32px);
  background: linear-gradient(165deg, #fffdfa 0%, #ffffff 46%, #fdf4ee 100%);
  box-shadow: 0 32px 90px rgba(20, 22, 26, 0.2);
}

:global(.login-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 26px 26px 6px;
}

:global(.login-dialog .el-dialog__body) {
  padding: 12px 26px 26px;
}

:global(.login-dialog .el-dialog__headerbtn) {
  top: 14px;
  right: 10px;
}

:global(.login-dialog .el-form-item__label) {
  color: #4a4842;
  font-size: 12.5px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 1440px) {
  .section-rail {
    right: 12px;
    gap: 10px;
    padding: 10px 6px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: rgba(241, 239, 233, 0.78);
  }

  .rail-label {
    display: none;
  }
}

@media (max-width: 1366px) {
  .brand-text em {
    display: none;
  }
}

@media (max-width: 1240px) {
  .nav-status {
    padding: 8px 13px;
  }

  .nav-status-text em {
    display: none;
  }
}

@media (max-width: 1180px) {
}

/* 大屏：内容两列铺开，避免左右两侧大片留白 */
@media (min-width: 1500px) {
  .feature-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: clamp(40px, 4vw, 80px);
  }

  .lead {
    max-width: 98ch;
  }

  .stage-card {
    padding: 34px 36px;
  }
}

@media (max-width: 1080px) {
  .nav-status {
    display: none;
  }

  .hero {
    padding-top: 20px;
    padding-bottom: 14px;
  }

  .hero-title {
    font-size: clamp(38px, 5vw, 62px);
  }

  .hero-desc {
    margin-top: 18px;
    font-size: 14px;
  }

  .stat {
    padding: 18px 12px;
  }
}

@media (max-width: 860px) {
  .nav-links {
    display: none;
  }

  .cta-rail {
    display: none;
  }

  .hero-deco {
    display: none;
  }

  .brand-text em {
    display: none;
  }

  .nav {
    gap: 12px;
  }

  .brand-text strong {
    font-size: 13px;
    white-space: nowrap;
  }

  /* 窄屏改为自然流式，避免内容被压缩 */
  .hero {
    height: auto;
    min-height: calc(100vh - 100px);
    padding-top: 28px;
  }

  .hero-inner {
    grid-template-columns: 1fr;
  }

  .hero-visual {
    max-width: 440px;
    margin: 8px auto 0;
    width: 100%;
  }

  .section {
    height: auto;
    min-height: calc(100vh - 68px);
  }

  .intro,
  .faq-screen {
    grid-template-columns: 1fr;
    align-content: start;
  }

  .stage-grid,
  .role-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat:nth-child(2) {
    border-right: 0;
  }

  .stat:nth-child(-n + 2) {
    border-bottom: 1px solid var(--line);
  }
}

@media (max-width: 600px) {
  .hero-title {
    font-size: clamp(38px, 11vw, 52px);
  }

  .boxed {
    padding: 0 10px 4px;
  }

  .hero-desc {
    font-size: 14px;
  }

  .stage-grid,
  .role-grid {
    grid-template-columns: 1fr;
  }

  .footer {
    flex-direction: column;
  }
}

@media (max-height: 820px) {
  .hero {
    padding-top: 14px;
    padding-bottom: 12px;
    gap: 14px;
  }

  .hero-title {
    font-size: clamp(38px, 5.2vw, 64px);
  }

  .hero-desc {
    margin-top: 16px;
    font-size: 14px;
    line-height: 1.8;
  }

  .hero-actions {
    margin-top: 20px;
  }

  .visual-frame {
    width: min(100%, 340px);
    margin: 0 auto;
  }

  .stat {
    padding: 14px 12px;
  }

  .stat strong {
    font-size: clamp(24px, 2.8vw, 36px);
  }

  .section-title {
    font-size: clamp(24px, 3vw, 34px);
  }

  .lead {
    margin-bottom: 16px;
    font-size: 14.5px;
    line-height: 1.85;
  }

  .stage-card p,
  .role-card li {
    font-size: 12px;
  }

  .role-card > p {
    margin-bottom: 10px;
  }

  .faq-item p {
    padding-bottom: 14px;
    font-size: 12.5px;
    line-height: 1.75;
  }
}

/* 学院原标志：保留原图比例与颜色，白底自然融入暖色表面。 */
.school-logo {
  display: block;
  height: auto;
  object-fit: contain;
  mix-blend-mode: multiply;
}

.nav-school-logo {
  flex: 0 0 auto;
  width: clamp(150px, 48vw, 240px);
}

.brand {
  flex-shrink: 0;
}

.brand-text {
  padding-left: 16px;
  border-left: 1px solid var(--line);
}

.dialog-school-logo {
  width: min(280px, 100%);
  margin: 0 0 22px;
}

:global(.login-dialog) {
  max-height: calc(100dvh - 24px);
  overflow-y: auto;
}

/* 专业元素只作为静态底纹，不参与鼠标或键盘交互。 */
.engineering-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}

.engineering-code {
  position: absolute;
  top: 16px;
  right: 32px;
  margin: 0;
  color: #786d64;
  opacity: 0.28;
  font: 11px/1.8 ui-monospace, Consolas, monospace;
  letter-spacing: 0.03em;
}

.code-comment {
  color: #82776f;
}

.code-keyword {
  color: #9f4963;
}

.code-string {
  color: #aa6439;
}

.engineering-signature {
  position: absolute;
  right: 0;
  bottom: 4px;
  color: rgba(102, 81, 67, 0.3);
  font: 9px/1.5 ui-monospace, Consolas, monospace;
  letter-spacing: 0.18em;
}

.software-blueprint {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.blueprint-path,
.blueprint-nodes {
  stroke: #ac775f;
  stroke-width: 1;
  opacity: 0.24;
}

.blueprint-nodes {
  fill: #eeece6;
}

.blueprint-symbol {
  fill: #9a6e59;
  opacity: 0.15;
  font: 52px ui-monospace, Consolas, monospace;
  letter-spacing: -0.06em;
}

.blueprint-label {
  fill: #806b60;
  opacity: 0.3;
  font: 11px ui-monospace, Consolas, monospace;
  letter-spacing: 0.08em;
}

@media (max-width: 1600px) {
  .brand-text {
    display: none;
  }
}

@media (max-width: 1366px) {
}

@media (max-width: 860px), (max-height: 760px) {
  .engineering-code {
    display: none;
  }
}

@media (max-width: 600px) {
  .launch-btn {
    padding-right: 12px;
    padding-left: 12px;
    white-space: nowrap;
    font-size: 12px;
  }

  .engineering-signature {
    font-size: 8px;
    letter-spacing: 0.08em;
  }
}

.engineering-watermark {
  position: absolute;
  inset: auto 0 26px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 20px;
  padding: 0 12px;
  color: rgba(105, 76, 63, 0.29);
  font: clamp(9px, 1vw, 12px)/1.7 ui-monospace, Consolas, monospace;
}

.engineering-watermark span { overflow-wrap: anywhere; }

:global(.login-modal) {
  background: rgba(54, 37, 32, 0.32);
  backdrop-filter: blur(5px);
}

:global(.login-dialog) {
  border-top: 3px solid #ff9862;
  background: linear-gradient(160deg, #fffaf6, #fff 48%, #fff1eb);
}

.dialog-head .kicker { color: #a75437; }
.dialog-head h2 { font-size: 26px; }
.dialog-sub { color: #6f625d; }
.dialog-submit { background: linear-gradient(110deg, #a4402a, #a53660); }
.login-error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fcece8;
  color: #8e3027;
  font-size: 13px;
}

:global(.login-dialog .el-input__wrapper) { border-radius: 9px; }
:global(.login-dialog .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #bf694f inset;
}

@media (max-width: 860px) {
  .engineering-watermark { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (prefers-reduced-motion: reduce) {
  .landing {
    scroll-snap-type: none;
  }

  .ticker-track,
  .float-tag,
  .ring,
  .caret {
    animation: none;
  }

  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
