// ============ E宝 助手：大模型通道 ============
// 复用平台已配置的 DEEPSEEK_* 通道（与面试纪要同一供应商），但独立封装：
// 面试链路失败必须整单失败（不能产出假纪要），这里失败必须静默降级到本地话术，
// 所以统一抛 AssistantUnavailable，由路由层转成 source: 'fallback' 交前端兜底。

const ENDPOINT = 'https://api.deepseek.com/chat/completions'
const TIMEOUT_MS = 22 * 1000
const MAX_TOKENS = 460
// 温度压得很低：这个助手要照抄数据库里的数字，不是写文案。
// 调高会让它更爱「补一句看起来合理的话」，把查不到的内容说成事实。
const TEMPERATURE = 0.15
const TOP_P = 0.7

class AssistantUnavailable extends Error {}

function apiKey() {
  return String(process.env.DEEPSEEK_API_KEY || '').trim()
}

function modelName() {
  return String(process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim()
}

function isConfigured() {
  return apiKey().length > 0
}

/**
 * 单轮补全。messages 由调用方拼好（system + 历史 + 当前问题）。
 * 返回纯文本；任何异常都包成 AssistantUnavailable，不外泄上游细节。
 */
async function chat(messages) {
  if (!isConfigured()) throw new AssistantUnavailable('未配置大模型密钥')

  let response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey()}`
      },
      body: JSON.stringify({
        model: modelName(),
        messages,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        top_p: TOP_P,
        stream: false
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    throw new AssistantUnavailable(timeout ? '大模型响应超时' : '大模型连接失败')
  }

  if (!response.ok) {
    /* 401/403 是密钥问题，其余按上游故障处理；具体状态只进日志不影响用户 */
    throw new AssistantUnavailable(`大模型返回 HTTP ${response.status}`)
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new AssistantUnavailable('大模型返回了无效结果')
  }

  const text = String(payload?.choices?.[0]?.message?.content || '').trim()
  if (!text) throw new AssistantUnavailable('大模型返回了空内容')
  return text
}

module.exports = { chat, isConfigured, AssistantUnavailable, modelName }
