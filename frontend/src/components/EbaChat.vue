<template>
  <section
    class="eba-chat"
    :class="{ open }"
    role="dialog"
    aria-label="E宝 对话"
    :aria-hidden="!open"
    @keydown.esc="close"
  >
    <span class="eba-tail" aria-hidden="true"></span>

    <header class="eba-head">
      <span class="eba-avatar" aria-hidden="true">
        <span>E</span>
      </span>
      <div class="eba-id">
        <strong>E宝<em v-if="responder" class="badge">AI</em></strong>
        <em class="state">
          <i class="dot" :class="{ busy }" aria-hidden="true"></i>
          {{ statusText }}
        </em>
      </div>
      <button class="eba-close" type="button" aria-label="关闭对话" @click="close">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </header>

    <div ref="bodyRef" class="eba-body">
      <p v-for="(item, index) in history" :key="index" class="msg" :class="item.role">{{ item.text }}</p>
      <p v-if="typing" class="msg bot typing-text">{{ typing }}<span class="type-caret" aria-hidden="true"></span></p>
      <p v-else-if="thinking" class="msg bot thinking" aria-label="E宝 正在思考">
        <i></i><i></i><i></i>
      </p>
    </div>

    <div class="eba-chips">
      <button v-for="chip in chips" :key="chip" type="button" :disabled="busy" @click="ask(chip)">
        {{ chip }}
      </button>
    </div>

    <form class="eba-input" @submit.prevent="send()">
      <input
        v-model="draft"
        maxlength="120"
        :disabled="!open"
        :placeholder="busy ? 'E宝 正在回答…' : '和 E宝 说点什么…'"
        aria-label="输入内容"
      />
      <button class="send" type="submit" :disabled="!draft.trim() || busy" aria-label="发送">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5V4M4.2 7.4L8 3.6l3.8 3.8" /></svg>
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

type Role = 'bot' | 'me'
interface Line { role: Role; text: string }

/* responder 是给大模型预留的接入口：
   传了就用远端答案，返回 null / 抛错则自动回退到本地话术。
   这样后期接 AI 只需要在父组件传一个函数，卡片本身不用改。 */
type Responder = (text: string, history: Line[]) => Promise<string | null>

const props = defineProps<{ open: boolean; responder?: Responder }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void; (event: 'react'): void }>()

/* ---------------- 话术库 ----------------
   纯前端关键词匹配，不联网、不打接口：登录页要能秒回，
   而且访客还没登录，不该触发任何后端会话。
   匹配按「先命中先返回」，所以更具体的关键词放前面。 */
const REPLIES: Array<{ keys: string[]; text: string }> = [
  {
    keys: ['你好', '您好', 'hi', 'hello', '嗨', '在吗', '在么'],
    text: '你好呀，我是 E宝 👋 欢迎来到河北师范大学软件学院！这里是实训室进组选拔平台，想先了解哪一块？'
  },
  {
    keys: ['谢谢', '好的', '收到', '辛苦', '明白'],
    text: '不客气～ 需要的时候点我一下就行，E宝一直在这儿。'
  },
  {
    keys: ['再见', '拜拜', '走了', '88'],
    text: '拜拜！祝你顺利选到心仪的实训室 👋'
  },
  {
    keys: ['你能做什么', '你会', '能干嘛', '功能', '帮我', '你是谁'],
    text: '我会讲流程、说规则、帮你找入口。可以问我「怎么填志愿」「八阶段是什么」「调剂怎么算」「在哪登录」，我一条条说清楚。'
  },
  {
    keys: ['志愿', '填报', '几个'],
    text: '最多填 3 个平行志愿，志愿之间不分先后。另外要分别选择「是否服从实训室内部调剂」和「是否服从学院统筹调剂」——这两项是独立的钩子。'
  },
  {
    keys: ['八阶段', '流程', '阶段', '几步', '怎么走'],
    text: '八个阶段：集中宣讲 → 开放日 → 志愿填报 → 面试 → 拟录取确认 → 调剂补录 → 公示 → 入组。每个阶段的时间窗由学院统一配置，到点自动锁定。'
  },
  {
    keys: ['面试', '面试怎么'],
    text: '面试由实训室组织，按五个维度打分；面完后组长汇总名单报送，结果直接同步到学院端，不需要学院再点一次确认。'
  },
  {
    keys: ['调剂', '补录', '没选上', '落选', '没被录取'],
    text: '第一轮录取结束后会公布各实训室剩余名额，没被录取的同学可以重新填报、参加第二、第三轮补录；三轮之后剩余名额进入全院调剂池，按「本室内部 → 跨室统筹 → 未服从调剂安置」三级优先级安排。'
  },
  {
    keys: ['名额', '满了', '超额', '人数'],
    text: '名额在拟录取、调剂、最终录取三个环节都会校验。有人放弃就释放名额并按规则递补，不会超额录取。'
  },
  {
    keys: ['登录', '账号', '密码', '怎么进', '注册'],
    text: '点右上角「立即登录」，学生用学号、老师用工号登录。用初始密码登录后会强制改密，忘记密码可以联系学院管理员重置。'
  },
  {
    keys: ['老师', '联系', '咨询', '电话', '办公室', '找谁'],
    text: '具体事务可以联系学院教务办公室；登录后在「帮助说明」里也有各角色的问题清单，按你的身份看就行。'
  }
]

const FALLBACK = '这个问题我还答不上来… 你可以试试问我「怎么填志愿」「八阶段流程」「调剂怎么算」，或者往下翻一翻「常见问题」。'

const GREETINGS = [
  '你好呀，我是 E宝 👋 欢迎来到河北师范大学软件学院！',
  '嗨，我是 E宝～ 软件学院欢迎你！想知道怎么选实训室吗？',
  '你好！我是 E宝 🤖 这里是实训室进组选拔平台，我可以给你讲讲流程。'
]

const chips = ['你好', '你能做什么', '怎么填志愿', '八阶段流程', '调剂怎么算', '在哪登录']

const history = ref<Line[]>([])
const typing = ref('')
const thinking = ref(false)
const draft = ref('')
const bodyRef = ref<HTMLDivElement | null>(null)

const busy = computed(() => thinking.value || !!typing.value)
const statusText = computed(() => {
  if (thinking.value) return props.responder ? '正在思考…' : '正在组织语言…'
  if (typing.value) return '正在输入…'
  return '在线 · 随时问我'
})

const greeted = ref(false)
let lastCloseAt = 0
let typeTimer = 0
let thinkTimer = 0
let typeIndex = 0
let typeFull = ''
let replyToken = 0

function scrollToEnd() {
  nextTick(() => {
    const body = bodyRef.value
    if (body) body.scrollTop = body.scrollHeight
  })
}

/* 用户打断时，把正在逐字输出的那句话直接落库，避免半句话丢失 */
function flushTyping() {
  if (typeTimer) window.clearTimeout(typeTimer)
  typeTimer = 0
  if (typing.value) {
    history.value.push({ role: 'bot', text: typeFull || typing.value })
    typing.value = ''
    typeFull = ''
  }
}

function typeOut(text: string) {
  typeFull = text
  typeIndex = 0
  typing.value = ''
  const step = () => {
    typeIndex = Math.min(text.length, typeIndex + 2)
    typing.value = text.slice(0, typeIndex)
    scrollToEnd()
    if (typeIndex < text.length) {
      typeTimer = window.setTimeout(step, 26)
      return
    }
    typeTimer = 0
    history.value.push({ role: 'bot', text })
    typing.value = ''
    typeFull = ''
    emit('react')
  }
  step()
}

function speak(text: string) {
  flushTyping()
  if (thinkTimer) window.clearTimeout(thinkTimer)
  thinking.value = true
  const delay = 340 + Math.min(text.length * 12, 520)
  thinkTimer = window.setTimeout(() => {
    thinkTimer = 0
    thinking.value = false
    typeOut(text)
  }, delay)
}

function answerFor(input: string) {
  const text = input.toLowerCase()
  return REPLIES.find((item) => item.keys.some((key) => text.includes(key)))?.text ?? FALLBACK
}

async function respond(text: string) {
  const token = ++replyToken
  const handler = props.responder
  if (handler) {
    thinking.value = true
    try {
      const answer = await handler(text, history.value.slice())
      if (token !== replyToken) return
      thinking.value = false
      if (answer) {
        typeOut(answer)
        return
      }
    } catch {
      if (token !== replyToken) return
      thinking.value = false
    }
  }
  if (token !== replyToken) return
  speak(answerFor(text))
}

function send(raw?: string) {
  const text = (raw ?? draft.value).trim()
  if (!text) return
  flushTyping()
  if (thinkTimer) window.clearTimeout(thinkTimer)
  thinkTimer = 0
  thinking.value = false
  history.value.push({ role: 'me', text })
  draft.value = ''
  scrollToEnd()
  void respond(text)
}

function ask(chip: string) {
  if (busy.value) return
  send(chip)
}

function close() {
  flushTyping()
  if (thinkTimer) window.clearTimeout(thinkTimer)
  thinkTimer = 0
  thinking.value = false
  replyToken += 1
  lastCloseAt = Date.now()
  emit('update:open', false)
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    nextTick(() => scrollToEnd())
    if (!greeted.value) {
      greeted.value = true
      speak(GREETINGS[Math.floor(Math.random() * GREETINGS.length)])
      return
    }
    /* 隔一会儿再打开，补一句招呼；连续开关则不刷屏 */
    if (Date.now() - lastCloseAt > 12000 && !typing.value && !thinking.value &&
      history.value[history.value.length - 1]?.role === 'bot') {
      const brief = ['我在～ 还想问点什么？', '还需要我讲哪一块？', '我还在这儿，随时问。']
      speak(brief[Math.floor(Math.random() * brief.length)])
    }
  }
)

onBeforeUnmount(() => {
  if (typeTimer) window.clearTimeout(typeTimer)
  if (thinkTimer) window.clearTimeout(thinkTimer)
})
</script>

<style scoped>
.eba-chat {
  position: absolute;
  left: 2.2%;
  top: 4%;
  bottom: 4%;
  z-index: 6;
  display: flex;
  flex-direction: column;
  width: 45%;
  border: 1px solid rgba(20, 22, 26, 0.09);
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #fdfbf8 100%);
  box-shadow:
    0 26px 56px -18px rgba(20, 22, 26, 0.26),
    0 10px 24px -12px rgba(255, 95, 158, 0.28),
    0 1px 0 rgba(255, 255, 255, 0.9) inset;
  backdrop-filter: blur(10px);
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px) scale(0.95);
  transform-origin: 100% 22%;
  transition:
    opacity 0.26s ease,
    transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0.26s;
}

.eba-chat.open {
  opacity: 1;
  visibility: visible;
  transform: none;
}

/* 小尾巴指向右侧的机器人 */
.eba-tail {
  position: absolute;
  right: -6px;
  top: 28%;
  width: 12px;
  height: 12px;
  border-top: 1px solid rgba(20, 22, 26, 0.09);
  border-right: 1px solid rgba(20, 22, 26, 0.09);
  border-radius: 2px;
  background: #ffffff;
  transform: rotate(45deg);
}

/* ---------- 头部 ---------- */
.eba-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 10px 9px 12px;
  border-bottom: 1px solid rgba(20, 22, 26, 0.06);
  border-radius: 19px 19px 0 0;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 178, 107, 0.22), transparent 62%),
    radial-gradient(circle at 92% 120%, rgba(255, 95, 158, 0.14), transparent 60%);
}

.eba-avatar {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 26%, #ffd7a6 0%, #ff8fb4 46%, #ff5f9e 100%);
  box-shadow:
    0 5px 12px rgba(255, 95, 158, 0.34),
    0 1px 0 rgba(255, 255, 255, 0.6) inset;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.eba-avatar::after {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 1px solid rgba(255, 95, 158, 0.4);
  animation: avatarPulse 3s ease-out infinite;
}

@keyframes avatarPulse {
  0% { transform: scale(0.8); opacity: 0.85; }
  72% { transform: scale(1.16); opacity: 0; }
  100% { transform: scale(1.16); opacity: 0; }
}

.eba-id {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.eba-id strong {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #1a1b1f;
}

.eba-id .badge {
  padding: 1px 5px;
  border-radius: 5px;
  background: linear-gradient(135deg, #1a1b1f, #43454d);
  color: #fff;
  font-size: 8.5px;
  font-style: normal;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.eba-id .state {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-style: normal;
  color: #918c83;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dot {
  width: 5px;
  height: 5px;
  flex: none;
  border-radius: 50%;
  background: #4ec78a;
  box-shadow: 0 0 0 3px rgba(78, 199, 138, 0.16);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.dot.busy {
  background: #ffb26b;
  box-shadow: 0 0 0 3px rgba(255, 178, 107, 0.2);
  animation: dotBlink 1s ease-in-out infinite;
}

@keyframes dotBlink {
  50% { opacity: 0.35; }
}

.eba-close {
  margin-left: auto;
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  color: #918c83;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.3s ease;
}

.eba-close svg {
  width: 11px;
  height: 11px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.eba-close:hover {
  background: rgba(20, 22, 26, 0.07);
  color: #1a1b1f;
  transform: rotate(90deg);
}

/* ---------- 消息区 ---------- */
.eba-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 10px 11px 8px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(20, 22, 26, 0.16) transparent;
}

.eba-body::-webkit-scrollbar {
  width: 4px;
}

.eba-body::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background: rgba(20, 22, 26, 0.16);
}

.msg {
  margin: 0;
  max-width: 92%;
  padding: 7px 10px;
  border-radius: 13px;
  font-size: 11.5px;
  line-height: 1.68;
  word-break: break-word;
  animation: msgIn 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* 正在逐字输出的气泡不做入场动画，否则打字时整块一直在半透明 */
.msg.typing-text {
  animation: none;
}

.msg.bot {
  align-self: flex-start;
  border: 1px solid rgba(20, 22, 26, 0.07);
  border-bottom-left-radius: 5px;
  background: #fff;
  color: #2c2b28;
  box-shadow: 0 2px 7px rgba(20, 22, 26, 0.045);
}

.msg.me {
  align-self: flex-end;
  border-bottom-right-radius: 5px;
  background: linear-gradient(135deg, #ff86ac 0%, #ff5f9e 100%);
  color: #fff;
  box-shadow: 0 5px 13px -5px rgba(255, 95, 158, 0.6);
}

.msg.thinking {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 10px 12px;
}

.msg.thinking i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #bdb7ae;
  animation: dotJump 1.1s ease-in-out infinite;
}

.msg.thinking i:nth-child(2) { animation-delay: 0.16s; }
.msg.thinking i:nth-child(3) { animation-delay: 0.32s; }

@keyframes dotJump {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-3px); opacity: 1; }
}

@keyframes msgIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

.type-caret {
  display: inline-block;
  width: 1.5px;
  height: 11px;
  margin-left: 1.5px;
  vertical-align: -1px;
  border-radius: 1px;
  background: #ff5f9e;
  animation: caretBlink 0.9s steps(1) infinite;
}

@keyframes caretBlink {
  50% { opacity: 0; }
}

/* ---------- 快捷问题 ---------- */
.eba-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 0 11px 8px;
}

.eba-chips button {
  padding: 3.5px 9px;
  border: 1px solid rgba(20, 22, 26, 0.1);
  border-radius: 999px;
  background: #fff;
  color: #57534c;
  font-size: 10.5px;
  line-height: 1.4;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.eba-chips button:hover:not(:disabled) {
  border-color: rgba(255, 95, 158, 0.45);
  background: rgba(255, 95, 158, 0.07);
  color: #d63c78;
  transform: translateY(-1px);
}

.eba-chips button:disabled {
  opacity: 0.45;
  cursor: default;
}

/* ---------- 输入区 ---------- */
.eba-input {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 9px 9px;
  border-top: 1px solid rgba(20, 22, 26, 0.06);
}

.eba-input input {
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(20, 22, 26, 0.11);
  border-radius: 999px;
  background: #f7f5f1;
  color: #1a1b1f;
  font-size: 11.5px;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.eba-input input::placeholder {
  color: #a8a39a;
}

.eba-input input:focus {
  border-color: rgba(255, 95, 158, 0.55);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(255, 95, 158, 0.12);
}

.eba-input .send {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff86ac, #ff5f9e);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 5px 12px -4px rgba(255, 95, 158, 0.65);
  transition: transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
}

.eba-input .send svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.eba-input .send:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.04);
  box-shadow: 0 8px 16px -5px rgba(255, 95, 158, 0.7);
}

.eba-input .send:disabled {
  opacity: 0.32;
  cursor: default;
  box-shadow: none;
}

/* 窄屏：画框拉高后对话落在下半屏，与上方机器人彻底分开 */
@media (max-width: 1080px) {
  .eba-chat {
    left: 4%;
    right: 4%;
    top: auto;
    bottom: 3%;
    width: auto;
    max-height: 47%;
    transform-origin: 50% 100%;
  }

  .eba-tail {
    display: none;
  }
}

@media (max-width: 600px) {
  .eba-chat {
    left: 3%;
    right: 3%;
    bottom: 2.5%;
    max-height: 47%;
    border-radius: 16px;
  }

  .eba-head {
    padding: 9px 9px 8px 10px;
  }

  .msg {
    font-size: 11.5px;
  }

  .eba-chips button {
    font-size: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .eba-chat,
  .msg,
  .msg.thinking i,
  .eba-avatar::after,
  .dot.busy,
  .type-caret {
    animation: none;
    transition: none;
  }
}
</style>
