import { computed, onBeforeUnmount, ref } from 'vue'
import { assistantApi, type AssistantMessage } from '@/api/assistant'
import { localAnswer, type EbaRole } from '@/utils/ebaKnowledge'

export interface ChatLine {
  role: 'bot' | 'me'
  text: string
}

interface Options {
  /** 当前角色，决定兜底话术口径 */
  role: () => EbaRole
  /** 逐字输出完成后回调，用来让桌宠做个小动作 */
  onSpoken?: () => void
}

/**
 * E宝 对话内核：桌宠与登录页卡片共用同一套「打字机 + 思考态 + 防竞态」。
 * 与登录页不同，这里会先请求后端大模型，失败或未配置时静默回退本地话术。
 */
export function useEbaChat(options: Options) {
  const history = ref<ChatLine[]>([])
  const typing = ref('')
  const thinking = ref(false)
  const online = ref(true)

  const busy = computed(() => thinking.value || Boolean(typing.value))

  let typeTimer = 0
  let typeFull = ''
  let typeIndex = 0
  let replyToken = 0

  function clearTimers() {
    if (typeTimer) window.clearTimeout(typeTimer)
    typeTimer = 0
  }

  /** 用户打断时把半句话直接落库，避免内容丢失 */
  function flushTyping() {
    if (typeTimer) window.clearTimeout(typeTimer)
    typeTimer = 0
    if (typing.value) {
      history.value.push({ role: 'bot', text: typeFull || typing.value })
      typing.value = ''
      typeFull = ''
    }
  }

  function typeOut(text: string, onTick?: () => void) {
    typeFull = text
    typeIndex = 0
    typing.value = ''
    const step = () => {
      typeIndex = Math.min(text.length, typeIndex + 2)
      typing.value = text.slice(0, typeIndex)
      onTick?.()
      if (typeIndex < text.length) {
        typeTimer = window.setTimeout(step, 24)
        return
      }
      typeTimer = 0
      history.value.push({ role: 'bot', text })
      typing.value = ''
      typeFull = ''
      options.onSpoken?.()
    }
    step()
  }

  /**
   * 发一条提问。onTick 用于滚动到底。
   * 顺序：先试大模型 → 空/失败回退本地话术，用户永远能立刻看到回答。
   */
  async function send(text: string, onTick?: () => void) {
    const content = String(text || '').trim()
    if (!content || busy.value) return

    flushTyping()
    history.value.push({ role: 'me', text: content })
    onTick?.()

    const token = ++replyToken
    thinking.value = true

    /* 上下文只带最近 3 轮，控制延迟与费用 */
    const context: AssistantMessage[] = history.value
      .slice(-7)
      .map((line) => ({
        role: line.role === 'me' ? 'user' : 'assistant',
        content: line.text
      }))

    let answer: string | null = null
    try {
      const result = await assistantApi.chat(context)
      if (token !== replyToken) return
      online.value = result.source === 'ai'
      answer = result.reply
    } catch {
      if (token !== replyToken) return
      online.value = false
      answer = null
    }

    thinking.value = false
    if (token !== replyToken) return
    typeOut(answer || localAnswer(content, options.role()), onTick)
  }

  function reset() {
    replyToken += 1
    clearTimers()
    typing.value = ''
    typeFull = ''
    thinking.value = false
    history.value = []
  }

  /** 本地开场的招呼语：不消耗大模型额度，也不用等网络 */
  function say(text: string, onTick?: () => void) {
    flushTyping()
    replyToken += 1
    thinking.value = false
    typeOut(text, onTick)
  }

  function stop() {
    flushTyping()
    replyToken += 1
    thinking.value = false
  }

  onBeforeUnmount(() => clearTimers())

  return { history, typing, thinking, busy, online, send, say, reset, stop }
}
