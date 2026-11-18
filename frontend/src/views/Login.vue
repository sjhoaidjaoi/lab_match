<template>
  <div
    ref="landingRef"
    class="landing"
    :class="{ ready: !booting, booting }"
    @scroll="onScroll"
    @wheel="onChapterWheel"
    @mousemove="onPointerMove"
  >
    <transition name="boot-exit">
      <aside v-if="booting" class="boot" aria-label="欢迎">
        <div class="boot-backdrop" aria-hidden="true">
          <span class="boot-glow glow-warm"></span>
          <span class="boot-glow glow-pink"></span>
          <span class="boot-grid"></span>
          <span class="boot-scan"></span>
          <!-- 时光塔：素材已在构建时调成淡剪影并三边羽化，页面侧只放一张图，零滤镜 -->
          <img class="boot-tower" :src="bootTower" alt="" aria-hidden="true" decoding="async" />
          <span class="boot-ghost">01</span>
          <span class="boot-tick tick-a">+</span>
          <span class="boot-tick tick-b">+</span>
          <span class="boot-tick tick-c">+</span>
          <span class="boot-tick tick-d">+</span>
        </div>

        <div class="boot-frame">
          <header class="boot-top">
            <span class="boot-chip"><i aria-hidden="true">&lt;/&gt;</i> LAB MATCH</span>
            <span class="boot-meta">SOFTWARE COLLEGE · 2026</span>
          </header>

          <div class="boot-core">
            <p class="boot-kicker"><b>00</b> WELCOME</p>
            <h1 class="boot-title" :aria-label="bootGreeting">
              <span class="boot-line"><span class="boot-word word-en">Hello<i class="boot-dot">.</i></span></span>
              <span class="boot-line"><span class="boot-word word-zh">软件人</span></span>
            </h1>
            <div class="boot-rule" aria-hidden="true"><i></i></div>
            <p class="boot-sub">河北师范大学软件学院 · 实训室双向选拔与统筹调剂平台</p>
          </div>

          <footer class="boot-foot">
            <span class="boot-progress" aria-hidden="true">
              <span class="boot-progress-label">BOOTING WORKSPACE</span>
              <span class="boot-progress-track"><i></i></span>
            </span>
            <button type="button" class="boot-skip" @click="finishBoot">
              跳过开场 <span aria-hidden="true">→</span>
            </button>
          </footer>
        </div>
      </aside>
    </transition>

    <!-- 校园实景背景：黄昏中的时光塔。虚化已在构建时烘焙进图片，页面侧零滤镜。 -->
    <div class="campus-bg" aria-hidden="true"></div>
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
            <div class="visual-frame" :class="{ 'bubble-on': bubbleVisible }">
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
              <div class="frame-stage">
                <RobotScene ref="robotRef" class="robot-3d" @poke="onPoke" />
              </div>
              <!-- 点击 E宝 时在头顶冒一朵云，再点换一句 -->
              <transition name="eba-cloud">
                <div v-if="bubbleVisible" class="eba-cloud" role="status" aria-live="polite">
                  <p :key="greetingIndex">{{ greeting }}</p>
                  <span class="cloud-tail" aria-hidden="true"></span>
                </div>
              </transition>
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules, InputInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import RobotScene from '@/components/RobotScene.vue'
import { stages, ROLE_HOME } from '@/config/stages'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const schoolLogo = `${import.meta.env.BASE_URL}brand/hebei-normal-software.png`
/* 开场页右侧的时光塔。窄屏换小图，解码像素只有六成。 */
const bootTower = window.innerWidth < 900
  ? `${import.meta.env.BASE_URL}images/tower-boot-sm.webp`
  : `${import.meta.env.BASE_URL}images/tower-boot.webp`
const loginError = ref('')

const landingRef = ref<HTMLElement | null>(null)
const robotRef = ref<InstanceType<typeof RobotScene> | null>(null)
const heroRef = ref<HTMLElement | null>(null)
const statsRef = ref<HTMLElement | null>(null)
const booting = ref(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
const bootGreeting = 'Hello 软件人'
let bootTimer = 0

/* ---------------- E宝 云朵问好 ----------------
   首页不做问答：点一下冒一句招呼，再点换一句。
   文案固定、无网络请求，纯交互氛围，别在这里接业务逻辑。 */
const GREETINGS = [
  '你好呀，我是 E宝 👋 欢迎来到软件学院！',
  '想进实训室？先去「八阶段流程」看看时间线吧～',
  '最多能填 3 个平行志愿，名额有限，别浪费哦',
  '面试结束后记得回来确认拟录取，逾期会释放名额',
  '没被录取也别慌，还有两轮补录和全院调剂',
  '点我一下，换句话给你听～'
]
const greetingIndex = ref(-1)
const bubbleVisible = ref(false)
const greeting = computed(() => GREETINGS[(greetingIndex.value + GREETINGS.length) % GREETINGS.length])
let bubbleTimer = 0

/* 每次点击先做小动作再换一句；云朵 5 秒后自动收起 */
function onPoke() {
  greetingIndex.value = (greetingIndex.value + 1) % GREETINGS.length
  bubbleVisible.value = true
  robotRef.value?.react()
  if (bubbleTimer) window.clearTimeout(bubbleTimer)
  bubbleTimer = window.setTimeout(() => { bubbleVisible.value = false }, 5000)
}
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
    /* 不再每帧 getBoundingClientRect()：.landing 自身就是视口尺寸的滚动容器，
       左上角恒在 (0,0)，直接取 client 坐标即可。原来的写法每帧强制一次布局，
       和滚动抢同一帧，是鼠标划过时掉帧的来源。 */
    el.style.setProperty('--mx', `${target.clientX}px`)
    el.style.setProperty('--my', `${target.clientY}px`)
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
  // 开场为整屏大字入场动画，进度条走完即自动进入首页。
  bootTimer = window.setTimeout(finishBoot, 2000)
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
  if (bubbleTimer) window.clearTimeout(bubbleTimer)
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
  /* 强调色收归品牌橙。这里原本是 #ea580c 品红，与工作台的 --workspace-accent
     (#ea580c) 是两套色系，登录页与内页放在一起看会像两个产品。 */
  --accent: #ea580c;
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
  isolation: isolate;
  overflow: hidden;
  background: #f4f0e9;
  color: #14161a;
  font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
}

.boot-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.boot-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);
  animation: bootFloat 16s ease-in-out infinite;
}

.glow-warm {
  top: -18%;
  right: -8%;
  width: min(46vw, 700px);
  height: min(46vw, 700px);
  background: radial-gradient(circle, rgba(255, 178, 107, 0.52), transparent 70%);
}

.glow-pink {
  bottom: -20%;
  left: -10%;
  width: min(42vw, 620px);
  height: min(42vw, 620px);
  background: radial-gradient(circle, rgba(255, 95, 158, 0.28), transparent 70%);
  animation-delay: -7s;
}

@keyframes bootFloat {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(24px, -18px, 0); }
}

/* 细网格：只在中间区域显影，避免满屏颗粒感 */
.boot-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(20, 22, 26, 0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(20, 22, 26, 0.07) 1px, transparent 1px);
  background-size: 76px 76px;
  -webkit-mask-image: radial-gradient(115% 85% at 46% 46%, #000 18%, transparent 76%);
  mask-image: radial-gradient(115% 85% at 46% 46%, #000 18%, transparent 76%);
  animation: bootFade 1.6s ease both;
}

/* 一次性扫光，强化"开场"仪式感 */
.boot-scan {
  position: absolute;
  top: -10%;
  bottom: -10%;
  left: 0;
  width: 42vw;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.62), transparent);
  transform: translateX(-55vw) skewX(-14deg);
  animation: bootScan 2.1s cubic-bezier(0.4, 0, 0.2, 1) 0.15s both;
}

@keyframes bootScan {
  to { transform: translateX(125vw) skewX(-14deg); }
}

/* 时光塔：开场页右半边的视觉锚点。
   素材 tower-boot.webp 已在构建时调成淡剪影、三边羽化并带 alpha，
   所以这里只是一个普通 <img> —— 没有 filter、没有 backdrop-filter，
   开场页的合成层数量不因为多了它而变化。底边齐平视口，塔像从纸里长出来。 */
.boot-tower {
  position: absolute;
  right: clamp(18px, 6vw, 120px);
  bottom: 0;
  height: min(86vh, 820px);
  width: auto;
  max-width: 42vw;
  object-fit: contain;
  object-position: bottom right;
  opacity: 0.84;
  pointer-events: none;
  transform-origin: 50% 100%;
  animation: bootTowerIn 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
}

@keyframes bootTowerIn {
  from { opacity: 0; transform: translate3d(0, 30px, 0) scale(0.985); }
  to { opacity: 0.84; transform: none; }
}

/* 巨型描边序号，撑住右下角留白 */
.boot-ghost {
  position: absolute;
  right: -1.5vw;
  bottom: -9vh;
  font-size: min(50vw, 600px);
  font-weight: 800;
  line-height: 0.76;
  letter-spacing: -0.06em;
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(20, 22, 26, 0.075);
  animation: bootGhost 2.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes bootGhost {
  from { opacity: 0; transform: translate3d(28px, 22px, 0) scale(0.96); }
  to { opacity: 1; transform: none; }
}

.boot-tick {
  position: absolute;
  font: 400 15px/1 ui-monospace, Consolas, monospace;
  color: rgba(255, 95, 158, 0.55);
  animation: bootTwinkle 4.2s ease-in-out infinite;
}

.tick-a { top: 16%; left: 8%; }
.tick-b { top: 26%; right: 16%; animation-delay: -1.1s; }
.tick-c { bottom: 22%; left: 14%; animation-delay: -2.2s; }
.tick-d { bottom: 30%; right: 8%; animation-delay: -3.1s; }

@keyframes bootTwinkle {
  0%, 100% { opacity: 0.3; transform: scale(0.9); }
  50% { opacity: 0.95; transform: scale(1.12); }
}

.boot-frame {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: clamp(18px, 3.2vh, 38px) clamp(20px, 5vw, 76px) clamp(16px, 2.8vh, 32px);
}

.boot-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  animation: bootFade 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
}

.boot-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px 7px 8px;
  border: 1px solid #e2d5c9;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.66);
  color: #7a4437;
  font: 600 11px/1 ui-monospace, Consolas, monospace;
  letter-spacing: 0.18em;
}

.boot-chip i {
  padding: 4px 6px;
  border-radius: 5px;
  background: #faeae0;
  color: #a4402a;
  font-style: normal;
  letter-spacing: 0.02em;
}

.boot-meta {
  font-family: var(--font-grotesk);
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.28em;
  color: #8a8781;
  white-space: nowrap;
}

.boot-core {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

.boot-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 clamp(12px, 2.6vh, 26px);
  font-family: var(--font-grotesk);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.32em;
  color: #8a8781;
  animation: bootFade 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
}

.boot-kicker b {
  color: #ea580c;
  font-weight: 700;
}

.boot-title {
  display: grid;
  gap: 0;
  margin: 0;
}

/* 逐行遮罩上浮，制造"压上来"的视觉冲击。
   padding 加到 0.14em 再负 margin 抵消：宋体的撇、捺、勾会伸出字身框，
   overflow: hidden 只留 0.04em 时「软」的捺脚会被直接切平。 */
.boot-line {
  display: block;
  overflow: hidden;
  padding-bottom: 0.14em;
  margin-bottom: -0.1em;
}

.boot-word {
  display: block;
  animation: bootRise 1.15s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* 「Hello.」用几何无衬线：字腔小、笔画略怪，和下面的宋体形成明确对比。
   如果把两行塞进同一种字体，这四行字就会糊成一整块，失去节奏。 */
.word-en {
  font-family: var(--font-grotesk);
  font-size: clamp(64px, min(15.5vw, 23vh), 196px);
  font-weight: 700;
  line-height: 0.88;
  letter-spacing: -0.045em;
  animation-delay: 0.26s;
}

.word-en .boot-dot {
  color: #ea580c;
  font-style: normal;
}

/* 「软件人」用宋体：横细竖粗 + 收笔的锋芒，是大字号下唯一能撑住「质感」的字形。
   配色改成一路上行的暖墨渐变（近黑褐 → 焦糖 → 品牌橙），比纯渐变彩字更像
   印刷品上的烫印，也仍然落在品牌的暖色系里。 */
.word-zh {
  font-family: var(--font-display);
  font-size: clamp(72px, min(18.5vw, 27vh), 236px);
  font-weight: 900;
  /* 宋体的撇捺会向下出格，0.96 的行高会被 .boot-line 的 overflow 裁掉笔画 */
  line-height: 1.08;
  letter-spacing: 0.05em;
  background: linear-gradient(172deg, #17130f 0%, #6d3510 46%, #ea580c 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation-delay: 0.4s;
}

@keyframes bootRise {
  from { opacity: 0; transform: translateY(112%); }
  to { opacity: 1; transform: none; }
}

.boot-rule {
  position: relative;
  height: 1px;
  max-width: min(760px, 82vw);
  margin: clamp(18px, 3.4vh, 34px) 0 0;
  background: rgba(20, 22, 26, 0.14);
  transform-origin: left center;
  animation: bootRule 1s cubic-bezier(0.22, 1, 0.36, 1) 0.62s both;
}

.boot-rule i {
  position: absolute;
  left: 0;
  top: -1px;
  width: clamp(72px, 9vw, 132px);
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, #ffb26b, #ea580c);
}

@keyframes bootRule {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.boot-sub {
  margin: 16px 0 0;
  font-size: clamp(12.5px, 1.15vw, 15px);
  letter-spacing: 0.1em;
  color: #6b6862;
  animation: bootFade 1s cubic-bezier(0.22, 1, 0.36, 1) 0.78s both;
}

.boot-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-top: clamp(12px, 2vh, 20px);
  border-top: 1px solid rgba(20, 22, 26, 0.1);
  animation: bootFade 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.9s both;
}

.boot-progress {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  max-width: min(760px, 62vw);
}

.boot-progress-label {
  font: 600 10px/1 ui-monospace, Consolas, monospace;
  letter-spacing: 0.24em;
  color: #8a8781;
  white-space: nowrap;
}

.boot-progress-track {
  position: relative;
  flex: 1;
  height: 2px;
  border-radius: 2px;
  background: rgba(20, 22, 26, 0.12);
  overflow: hidden;
}

.boot-progress-track i {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background: linear-gradient(90deg, #ffb26b, #ea580c);
  transform-origin: left center;
  animation: bootBar 1.85s cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes bootBar {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.boot-skip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border: 1px solid rgba(20, 22, 26, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: #3b3a37;
  font: inherit;
  font-size: 12.5px;
  letter-spacing: 0.06em;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
}

.boot-skip span {
  color: #ea580c;
  transition: color 0.25s ease;
}

.boot-skip:hover,
.boot-skip:focus-visible {
  background: #14161a;
  border-color: #14161a;
  color: #fff;
  transform: translateX(2px);
}

.boot-skip:hover span,
.boot-skip:focus-visible span {
  color: #ffb26b;
}

.boot-skip:focus-visible {
  outline: 2px solid #ea580c;
  outline-offset: 3px;
}

@keyframes bootFade {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}

.boot-exit-leave-active { transition: opacity 0.34s ease, transform 0.34s ease; pointer-events: none; }
.boot-exit-leave-to { opacity: 0; transform: scale(1.015); }

/* 开场期间不渲染首屏 3D，避免画布盖到开场层之上 */
.landing.booting .hero-visual { opacity: 0; }

@media (max-width: 720px) {
  /* 窄屏两栏变一栏，右下的塔会顶到标题上，直接收起 */
  .boot-tower { display: none; }
  .boot-meta { display: none; }
  .boot-ghost { opacity: 0.6; }
  .boot-progress { max-width: none; }
  .boot-progress-label { display: none; }
  .boot-foot { justify-content: flex-end; }
}

@media (prefers-reduced-motion: reduce) {
  .boot-scan { display: none; }
}

/* 校园实景背景：黄昏 + 时光塔。
   虚化已在 .screenshots/tools/make-tower-bg.py 里烘焙进 JPEG（塔保持 60% 高度、
   落在水平 67% 处，四周是同图的高斯虚化）。页面侧只用一张固定图片：
   没有 filter、没有 backdrop-filter，轮播时这张图不会被重算，成本近乎为零。
   translateZ 把它提成独立合成层，正文滚动或换章都不会带着它一起重绘。 */
.campus-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url('/images/campus-tower-sm.jpg');
  background-position: 50% 50%;
  background-size: cover;
  background-repeat: no-repeat;
  transform: translateZ(0);
  will-change: transform;
}

/* 大屏才换 1920 版。1280 版只有 19KB、约 92 万像素要解码，是全尺寸版的四成；
   背景本来就做过高斯虚化，放大 1.25 倍看不出差别，但首帧解码省下的时间很实在。 */
@media (min-width: 1600px) {
  .campus-bg {
    background-image: url('/images/campus-tower.jpg');
  }
}

/* 遮罩：左侧压到 95% 白度保证文案可读，40% 之后迅速让开，把塔露出来。
   渐变在 42%~56% 之间刻意压陡 —— 文案实际排到 40% 左右，再往右就可以大胆透，
   这样塔既能看清，也不会有一片灰色糊到标题上。 */
.campus-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(100deg,
      rgba(247, 244, 239, 0.95) 0%,
      rgba(247, 244, 239, 0.88) 30%,
      rgba(247, 244, 239, 0.64) 42%,
      rgba(247, 244, 239, 0.3) 56%,
      rgba(247, 244, 239, 0.16) 74%,
      rgba(247, 244, 239, 0.1) 100%),
    linear-gradient(180deg,
      rgba(247, 244, 239, 0.56) 0%,
      rgba(247, 244, 239, 0.04) 24%,
      rgba(247, 244, 239, 0.02) 70%,
      rgba(247, 244, 239, 0.68) 100%);
}

.grid-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(20, 22, 26, 0.032) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(20, 22, 26, 0.032) 1px, transparent 1px),
    radial-gradient(120% 80% at 50% -12%, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0) 62%),
    radial-gradient(58% 52% at 86% 6%, rgba(255, 178, 107, 0.18), transparent 66%),
    radial-gradient(52% 55% at 8% 22%, rgba(234, 88, 12, 0.08), transparent 64%);
  background-size: 96px 96px, 96px 96px, 100% 100%, 100% 100%, 100% 100%;
}

.spotlight {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(560px circle at var(--mx) var(--my), rgba(234, 88, 12, 0.08), transparent 62%);
}

.ticker,
.nav,
.main,
.footer {
  position: relative;
  z-index: 1;
}

/* ---------- 顶部通告 ---------- */
/* 顶部通告：和导航连成同一条玻璃带，只是更薄 */
.ticker {
  display: flex;
  align-items: center;
  height: var(--ticker-height);
  overflow: hidden;
  border-bottom: 0;
  background-color: rgba(255, 255, 255, 0.3);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.08));
  -webkit-backdrop-filter: blur(18px) saturate(175%);
  backdrop-filter: blur(18px) saturate(175%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    inset 0 -1px 0 rgba(255, 255, 255, 0.5);
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
  background: linear-gradient(135deg, #ff8a5c, #ea580c);
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
  /* 抬到背景层之上：.campus-bg / .grid-bg / .spotlight 都是 z-index:0 的固定层，
     普通流的 section 会被它们盖住，这里显式声明层级，避免依赖 DOM 顺序的巧合。 */
  position: relative;
  z-index: 1;
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

/* 光斑本身就是 radial-gradient，边缘已经软了，不需要再叠 filter: blur()。
   blur(60px) 作用在 320px 的元素上会拖出一大块需要每帧重新栅格化的区域，
   而这层只是装饰——把渐变的透明截止从 70% 拉到 90% 就能得到同样的弥散感。 */
.hero-orb {
  position: absolute;
  border-radius: 50%;
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
  background: radial-gradient(circle,
    rgba(255, 178, 107, 0.55) 0%, rgba(255, 178, 107, 0.28) 45%, rgba(255, 178, 107, 0) 90%);
}

.orb-pink {
  width: 260px;
  height: 260px;
  bottom: 4%;
  left: -50px;
  background: radial-gradient(circle,
    rgba(234, 88, 12, 0.4) 0%, rgba(234, 88, 12, 0.2) 45%, rgba(234, 88, 12, 0) 90%);
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
  font-family: var(--font-grotesk);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--muted);
}

/* 主标题用宋体：这里是整页的第一视觉落点，黑体在这个字号下会显得"平"。
   行高从 1.02 放到 1.16 —— 宋体的字身框比黑体高，行高太紧会让上下两行撞在一起。 */
.hero-title {
  font-family: var(--font-display);
  margin: 0;
  font-size: clamp(44px, 6vw, 82px);
  line-height: 1.16;
  font-weight: 900;
  letter-spacing: 0.01em;
}

.hero-title .line {
  display: block;
}

/* 方框改用双线：外粗内细，是印刷版面上"强调框"的做法，
   比单根 1px 边线更像一个被认真排过的标题，而不是随手加的边框。 */
.boxed {
  display: inline-block;
  padding: 0.02em 0.24em 0.1em;
  border: 1px solid rgba(29, 26, 23, 0.78);
  border-radius: 3px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.72),
    0 10px 26px -18px rgba(58, 41, 28, 0.6);
}

/* 关键词去掉原来的品红渐变（那是早期留下的色），收进品牌橙的明暗区间 */
.grad {
  background: linear-gradient(96deg, #f97316 0%, #ea580c 48%, #b8420a 100%);
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
  justify-content: flex-end;
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

/* 舞台层：包住 3D 画布，保持独立定位上下文 */
.frame-stage {
  position: absolute;
  inset: 0;
}

.robot-3d {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.software-blueprint,
.ring {
  transition: opacity 0.34s ease;
}

/* ---------- E宝 头顶的云朵问好 ---------- */
.eba-cloud {
  position: absolute;
  left: 50%;
  /* 压在头顶、但不盖脸：E宝 立绘顶部约占画框 17.5%，云朵底边停在 20% 处 */
  bottom: 80%;
  z-index: 4;
  width: max-content;
  max-width: 74%;
  padding: 13px 18px 14px;
  border-radius: 22px;
  background: linear-gradient(180deg, #ffffff 0%, #fbf8f3 100%);
  box-shadow:
    0 20px 40px -18px rgba(20, 22, 26, 0.34),
    0 2px 0 rgba(255, 255, 255, 0.9) inset;
  transform: translateX(-50%);
  /* 点云朵等于点 E宝，继续换下一句 */
  pointer-events: none;
}

/* 两个圆鼓包把矩形撑成云；底边压在 E宝 头顶，靠投影和头部拉开层次 */
.eba-cloud::before,
.eba-cloud::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: #fff;
}

.eba-cloud::before {
  left: 18px;
  top: -17px;
  width: 42px;
  height: 42px;
}

.eba-cloud::after {
  right: 24px;
  top: -13px;
  width: 30px;
  height: 30px;
}

.eba-cloud p {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  letter-spacing: 0.01em;
  color: #2c2b28;
  text-align: center;
  /* 换句时文字重新入场（p 带 key，会被重建，动画自然重播） */
  animation: cloudTextIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes cloudTextIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: none; }
}

/* 指向头顶的小尾巴 */
.cloud-tail {
  position: absolute;
  left: 50%;
  bottom: -7px;
  width: 15px;
  height: 15px;
  margin-left: -7.5px;
  border-radius: 2px;
  background: #fff;
  transform: rotate(45deg);
}

.eba-cloud-enter-active {
  transition: opacity 0.26s ease, transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.eba-cloud-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.eba-cloud-enter-from,
.eba-cloud-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px) scale(0.82);
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

/* 区块标题同样走宋体，与 hero 形成同一套排版语言。
   负字距在这里反而有害：宋体的横画细，挤在一起会失去呼吸感。 */
.section-title {
  font-family: var(--font-display);
  margin: 0;
  font-size: clamp(30px, 3vw, 46px);
  font-weight: 900;
  letter-spacing: 0.01em;
  line-height: 1.3;
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
  background-color: rgba(255, 255, 255, 0.7);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    0 18px 40px -26px rgba(58, 41, 28, 0.5);
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
  background-color: rgba(255, 255, 255, 0.72);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    0 20px 44px -28px rgba(58, 41, 28, 0.5);
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
  background: linear-gradient(135deg, #ffb26b, #ea580c);
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
  font-family: var(--font-display);
  margin: 0 0 14px;
  font-size: clamp(30px, 3.4vw, 50px);
  font-weight: 900;
  letter-spacing: 0.01em;
  line-height: 1.28;
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
  background: linear-gradient(90deg, #ffb26b, #ea580c 55%, #2f6fed);
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
  background: linear-gradient(180deg, #ffb26b, #ea580c);
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

/* 入场不再做模糊渐显。
   原因：fill-mode: both 会把结束态永久留在元素上，而 filter 列表的插值规则里
   none 与 blur() 互算都会落在 blur(0)，浏览器照样为每个元素单独开一层离屏合成。
   首屏 hero-copy 有六七个这样的子元素，全是白开的图层。
   改成位移 + 轻微缩放，观感更接近「抬上来」，也不再产生任何滤镜。 */
@keyframes softRise {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
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
  font-family: var(--font-display);
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 0.02em;
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
  background:
    radial-gradient(circle at 78% 8%, rgba(255, 178, 107, 0.22), transparent 58%),
    rgba(42, 32, 26, 0.24);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  backdrop-filter: blur(10px) saturate(140%);
}

:global(.login-dialog) {
  border-radius: 28px;
  overflow: hidden;
  max-width: calc(100vw - 32px);
  border: 0;
  background-color: rgba(255, 255, 255, 0.6);
  background-image:
    radial-gradient(120% 100% at 10% -12%, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0) 54%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.12) 60%, rgba(255, 255, 255, 0.32));
  -webkit-backdrop-filter: blur(24px) saturate(175%);
  backdrop-filter: blur(24px) saturate(175%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 1px 0 0 rgba(255, 255, 255, 0.5),
    inset -1px 0 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(255, 255, 255, 0.68),
    0 2px 6px rgba(58, 41, 28, 0.06),
    var(--lg-shadow-float);
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
  border-top: 0;
}

.dialog-head .kicker { color: #a75437; }
.dialog-head h2 { font-size: 26px; }
.dialog-sub { color: #6f625d; }
.dialog-submit { background: linear-gradient(110deg, #a4402a, #a53660); }
.login-error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 226, 222, 0.62);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  color: #8e3027;
  font-size: 13px;
}

:global(.login-dialog .el-input__wrapper) { border-radius: 9px; }
:global(.login-dialog .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px rgba(234, 88, 12, 0.5) inset, 0 0 0 4px rgba(234, 88, 12, 0.14);
}

@media (max-width: 860px) {
  .engineering-watermark { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}


/* ============================================================================
   液态玻璃覆盖层（Landing）
   首页保留米白纸感，但所有浮起来的东西都变成玻璃：导航胶囊、E宝 画框、阶段卡、
   角色卡、弹窗。底色里补四团柔光，玻璃才有可折射的内容。
   ========================================================================== */
.landing {
  background:
    radial-gradient(ellipse 62% 44% at 10% 4%, rgba(255, 208, 171, 0.34), transparent 62%),
    radial-gradient(ellipse 46% 38% at 94% 2%, rgba(255, 194, 210, 0.3), transparent 64%),
    radial-gradient(ellipse 64% 46% at 84% 96%, rgba(185, 212, 240, 0.32), transparent 60%),
    radial-gradient(ellipse 52% 40% at 4% 88%, rgba(255, 226, 196, 0.5), transparent 62%),
    var(--cream);
}

/* 导航：通栏覆盖式液态玻璃带
   上一版把它收成了悬浮胶囊，但整站是通栏排版，胶囊反而把上沿切成碎块。
   现在回到「一整条铺满」的形态：贴边、无圆角、无缝盖住页面顶部，
   材质仍走液态玻璃 —— 上下各一道高光描边，中间有一道缓慢游走的折光。 */
.nav {
  height: var(--nav-height);
  margin: 0;
  padding: 0 clamp(20px, 5vw, 64px);
  border: 0;
  border-radius: 0;
  /* 让折光带被裁在条内，不会溢出到页面 */
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.14);
  background-image:
    linear-gradient(180deg,
      rgba(255, 255, 255, 0.44) 0%,
      rgba(255, 255, 255, 0.02) 52%,
      rgba(255, 255, 255, 0.2) 100%);
  -webkit-backdrop-filter: blur(24px) saturate(185%);
  backdrop-filter: blur(24px) saturate(185%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 1px 0 0 rgba(255, 255, 255, 0.4),
    inset -1px 0 0 rgba(255, 255, 255, 0.4),
    inset 0 -1px 0 rgba(255, 255, 255, 0.62),
    0 10px 26px -20px rgba(58, 44, 30, 0.3);
  transition: box-shadow 0.45s var(--lg-ease), background-color 0.45s var(--lg-ease);
}

.nav.scrolled {
  background-color: rgba(255, 255, 255, 0.34);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    inset 1px 0 0 rgba(255, 255, 255, 0.48),
    inset -1px 0 0 rgba(255, 255, 255, 0.48),
    inset 0 -1px 0 rgba(255, 255, 255, 0.72),
    0 12px 28px -18px rgba(58, 44, 30, 0.34);
}

/* 导航内容必须压在折光之上，否则光带扫过时文字会被冲淡 */
.brand,
.nav-links,
.nav-actions {
  position: relative;
  z-index: 1;
}

/* 游走的折光带：只做 transform，全程走合成层，不触发重绘 */
.nav::before {
  content: "";
  position: absolute;
  top: -60%;
  bottom: -60%;
  left: 0;
  z-index: 0;
  width: 40%;
  pointer-events: none;
  background: linear-gradient(100deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.5) 40%,
    rgba(255, 214, 176, 0.36) 56%,
    rgba(255, 255, 255, 0) 100%);
  transform: translate3d(-120%, 0, 0) skewX(-12deg);
  animation: navLiquid 16s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

@keyframes navLiquid {
  0%, 10% { transform: translate3d(-120%, 0, 0) skewX(-12deg); }
  66%, 100% { transform: translate3d(360%, 0, 0) skewX(-12deg); }
}

/* 顶部主反光 + 底沿一道液态光缝（原先右下的点阵纹理已被这条光缝取代） */
.nav::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 0;
  width: auto;
  height: auto;
  pointer-events: none;
  opacity: 1;
  background-image:
    radial-gradient(44% 128% at 13% 0%, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0) 66%),
    linear-gradient(90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.85) 16%,
      rgba(96, 74, 52, 0.16) 34%,
      rgba(234, 88, 12, 0.34) 52%,
      rgba(96, 74, 52, 0.16) 70%,
      rgba(255, 255, 255, 0.85) 86%,
      rgba(255, 255, 255, 0) 100%);
  background-size: 100% 100%, 100% 1px;
  background-position: 0 0, 0 100%;
  background-repeat: no-repeat;
  -webkit-mask-image: none;
  mask-image: none;
}

.nav-status {
  border: 0;
  background-color: rgba(255, 255, 255, 0.55);
  background-image: linear-gradient(152deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.24));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 -1px 0 rgba(255, 255, 255, 0.62);
}

/* E宝 展台：什么都不留
   原来是一块玻璃卡，后来拆成「只留一圈白色柔光」，但那圈白光仍然在浅色背景上
   显出一个柔和的白团，像垫了张纸。现在底色、渐变、投影、描边全部撤掉 ——
   E宝 自己带着模型的投影，直接站在校园背景前面，周围没有任何容器。 */
.visual-frame {
  width: 100%;
  /* 原来 560 见方：E宝 本身只占其中 57%，四周全是空地，看起来像浮在半空。
     收到 486 并靠右对齐，右边缘与页面内容边线对齐，视觉上才「站」在版面里。 */
  max-width: 486px;
  margin: 0 0 0 auto;
  border: 0;
  border-radius: 0;
  background: transparent;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  box-shadow: none;
}

/* 首屏的 E宝 坐低一档：画布里模型本来是上下居中（头顶留 91px、脚下留 105px），
   落到页面上就是「浮在半空」。这里把画布整体下移 13.4%（约 65px），
   脚下只剩 40px，正好踩到 caption 那条线附近。
   只作用于首屏，StageRobotTrack 里的同一组件不受影响。 */
.visual-frame .robot-3d {
  transform: translateY(13.4%);
}

/* 接地投影：场景里的 ShadowMaterial 只收模型自投影，落在脚正下方，
   从正面几乎看不见（实测脚底以下 4 级以上差异为 0）。E宝 因此看起来是「浮」的。
   这里补一颗贴地的柔光椭圆，压在画布之下（::before 排在 .frame-stage 之前），
   脚底正好踩在它的上沿，人才站得住。纯径向渐变，不产生滤镜层。 */
.visual-frame::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 3.6%;
  width: 34%;
  height: 7.4%;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(closest-side,
    rgba(56, 42, 30, 0.19) 0%,
    rgba(56, 42, 30, 0.09) 52%,
    rgba(56, 42, 30, 0) 100%);
  pointer-events: none;
}

/* 撤掉画框后，背后的蓝图线条和圆环成为唯一的「框」，
   淡化一档，让它们退成纹理而不是边界。 */
.visual-frame .software-blueprint,
.visual-frame .ring {
  opacity: 0.55;
}

/* 八阶段卡 / 四角色卡
   这些卡片不再做 backdrop-filter：它们背后的背景图已经是高斯虚化过的色块，
   再模糊一遍得到的还是同一片色块，肉眼分辨不出，却要每张卡各开一个采样层。
   八张阶段卡 + 四张角色卡在同一个章节里，一次性就是 12 个 —— 这是轮播换页时
   最集中的一笔开销。用提高染色不透明度来补足厚度，观感一致。 */
.stage-card {
  border-color: rgba(255, 255, 255, 0.7);
  background-color: rgba(255, 255, 255, 0.52);
  background-image: linear-gradient(152deg, rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.14));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -1px 0 rgba(255, 255, 255, 0.55),
    0 10px 26px -20px rgba(58, 41, 28, 0.22);
  transition: box-shadow 0.42s var(--lg-ease), background-color 0.42s var(--lg-ease);
}

.role-card {
  border: 0;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.54);
  background-image: linear-gradient(152deg, rgba(255, 255, 255, 0.66), rgba(255, 255, 255, 0.14));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 1px 0 0 rgba(255, 255, 255, 0.45),
    inset -1px 0 0 rgba(255, 255, 255, 0.45),
    inset 0 -1px 0 rgba(255, 255, 255, 0.58),
    var(--lg-shadow);
  transition: box-shadow 0.42s var(--lg-ease), background-color 0.42s var(--lg-ease);
}

.boot-chip {
  border: 0;
  background-color: rgba(255, 255, 255, 0.6);
  background-image: linear-gradient(152deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.3));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 0 -1px 0 rgba(255, 255, 255, 0.6);
}

.boot-chip i {
  background: color-mix(in srgb, #ea580c 16%, rgba(255, 255, 255, 0.5));
  color: #a4402a;
  border-radius: 999px;
}

@media (prefers-reduced-motion: reduce) {
  .landing {
    scroll-snap-type: none;
  }

  .ticker-track,
  .ring,
  .caret {
    animation: none;
  }

  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .eba-cloud-enter-active,
  .eba-cloud-leave-active,
  .eba-cloud p {
    transition: none;
    animation: none;
  }
}

/* 云朵在小画框里要缩小，否则会压到 E宝 脸上 */
@media (max-width: 1080px) {
  .eba-cloud {
    bottom: 81%;
    max-width: 84%;
    padding: 11px 15px 12px;
    border-radius: 19px;
  }

  .eba-cloud p {
    font-size: 12.5px;
  }
}

@media (max-width: 600px) {
  .eba-cloud {
    bottom: 82%;
    max-width: 90%;
    padding: 10px 13px 11px;
  }

  .eba-cloud p {
    font-size: 12px;
    line-height: 1.55;
  }

  .eba-cloud::before {
    left: 12px;
    top: -14px;
    width: 34px;
    height: 34px;
  }

  .eba-cloud::after {
    right: 16px;
    width: 24px;
    height: 24px;
  }
}
</style>
