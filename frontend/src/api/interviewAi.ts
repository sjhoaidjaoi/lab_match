import { http } from './request'

export interface Segment {
  id: number
  text: string
  start: number
  end: number
  speaker: string | null
  speakerTag?: string | null
  unclear?: boolean
  revised?: boolean
}

export interface Point { text: string; refs: number[] }
export interface Question { question: string; answer: string; asker?: string; refs: number[] }
export interface Project { name: string; stack: string; role: string; outcome: string; refs: number[] }
export interface Summary { topics: Point[]; questions: Question[]; projects: Project[]; verify: Point[]; overview: Point[] }
export interface VersionMeta {
  id: number
  type: string
  createdAt: string
  authorName?: string
  model?: string
  sourceId?: number
}
export interface Version<T> extends VersionMeta { content: T }
export interface AiStatus {
  state: string
  approved: boolean
  canEdit: boolean
  canDelete: boolean
  canRead: boolean
  canRun: boolean
  recordingReady: boolean
  ready: boolean
  pendingConsents: number | null
  progress?: { phase: string; done: number; total: number | null; error?: string }
}
export interface AiDetail {
  transcript?: Version<Segment[]> | null
  draft?: Version<Summary> | null
  formal?: Version<Summary> | null
  selected?: Version<Summary | Segment[]> | null
  versions: VersionMeta[]
  evidence?: Pick<Segment, 'id' | 'start' | 'end'>[]
}

const base = (id: number) => `/interview-video/${id}/ai`
const quiet = { silent: true }
export const aiArchiveApi = {
  status: (id: number) => http.get<AiStatus>(`${base(id)}/status`, undefined, quiet),
  read: (id: number, versionId?: number, download = false) => http.post<AiDetail>(`${base(id)}/read`, { versionId, download }, quiet),
  action: (id: number, payload: Record<string, unknown>) => http.post(`${base(id)}/action`, payload, quiet)
}
