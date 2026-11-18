import { http } from './request'

export type AssistantRole = 'user' | 'assistant'

export interface AssistantMessage {
  role: AssistantRole
  content: string
}

export interface AssistantReply {
  /** AI 不可用时为 null，调用方应回退本地话术 */
  reply: string | null
  source: 'ai' | 'fallback'
  /** 事实快照的取数时间（后端本地时区），用于向用户交代数据新鲜度 */
  dataAt?: string
}

export interface AssistantStatus {
  configured: boolean
  model: string | null
}

export const assistantApi = {
  status: () => http.get<AssistantStatus>('/assistant/status', undefined, { silent: true }),
  /** 推理可能需要十几秒，单独放大超时；错误不弹全局提示，交给卡片内部兜底 */
  chat: (messages: AssistantMessage[]) =>
    http.post<AssistantReply>('/assistant/chat', { messages }, { timeout: 40000, silent: true })
}
