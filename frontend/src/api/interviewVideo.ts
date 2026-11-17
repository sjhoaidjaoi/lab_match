import { http } from './request'

export type MeetingStatus = 'UPCOMING' | 'WAITING' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'ENDED'
export type MeetingRole = 'HOST' | 'CANDIDATE' | 'PANEL' | 'OBSERVER'

export const meetingStatusLabels: Record<MeetingStatus, string> = {
  UPCOMING: '待开始', WAITING: '等待主持人', OPEN: '进行中', CLOSED: '入会时段已关闭', CANCELLED: '已取消', ENDED: '已结束'
}

export interface MeetingSummary {
  id: number
  laboratoryName: string
  studentName: string
  interviewTime: string
  durationMinutes: number
  instructions?: string
  status: MeetingStatus
  role: MeetingRole
  opensAt: string
  closesAt: string
  startsAt: string | null
  endsAt: string | null
}

export interface MeetingDetails extends MeetingSummary {
  participants: MeetingPerson[]
}

export interface MeetingPerson { identity: string; name: string; role: MeetingRole; handOrder: number | null; removed: boolean }
export interface MeetingMessage { id: number; senderId: number; senderName: string; content: string; createdAt: string }
export interface MeetingState {
  status: MeetingStatus
  locked: boolean
  startsAt: string | null
  endsAt: string | null
  waitingStatus: 'WAITING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | null
  removed: boolean
  removalReason: string | null
  muteRequestedAt: string | null
  waiting: { identity: string; name: string; studentNumber: string; requestedAt: string }[]
  participants: MeetingPerson[]
  canReadChat: boolean
  messages: MeetingMessage[]
  hasMore: boolean
  recording: RecordingView
  aiConsent?: { notice: string; version: string; key: string; decision: boolean | null; ready: boolean } | null
}
export const recordingLabels = {
  NONE: '未录制', WAITING: '等待录制授权', STARTING: '录制启动中', RECORDING: '正在录制',
  STOPPING: '正在停止录制', PROCESSING: '正在校验录像', COMPLETE: '录像已保存',
  FAILED: '录像失败', CANCELLED: '录制已取消', DELETING: '录像删除中', DELETED: '录像已删除'
}
export interface RecordingView {
  id?: string
  state: keyof typeof recordingLabels
  available: boolean
  policy?: { version: string; notice: string; days: number }
  decision?: 'ACCEPTED' | 'DECLINED' | null
  durationSeconds?: number
  savedAt?: string
  expiresAt?: string
  holdReason?: string
  failureReason?: string
}
export interface ArchiveRow {
  id: number; batchId: number; laboratoryId: number
  studentName: string; studentNumber: string; laboratoryName: string; batchName: string
  interviewTime: string; startsAt?: string; endsAt?: string; status: MeetingStatus; examiners: string[]
  recording: RecordingView
  access: { play: boolean; download: boolean; manage: boolean }
}
export interface InterviewArchive extends ArchiveRow {
  application?: { mentorName?: string; direction?: string; introduction?: string } | null
  messages: MeetingMessage[]
  hasMore: boolean
  sessions: { id: number; name: string; role: MeetingRole; joinedAt?: string; leftAt?: string; onlineSeconds?: number;
    disconnectReason?: string; removed: boolean; rejoined: boolean }[]
  logs: { id: number; occurredAt: string; operator?: string; text: string; result: string }[]
  score: { attitudeScore?: number; logicScore?: number; programmingScore?: number; timeCommitmentScore?: number;
    comprehensiveScore?: number; evaluation?: string; recommendation?: string }
  summary: { transcriptionState: string; taskId: string | null }
}
export interface MeetingProfile {
  studentName: string
  studentNumber: string
  major?: string
  className?: string
  laboratoryName?: string
  mentorName?: string
  direction?: string
  introduction?: string
  resume?: { name: string }
}

const base = '/interview-video'
const quiet = { silent: true }

export const interviewVideoApi = {
  aiConsent: (id: string, key: string, accepted: boolean) => http.post(`${base}/${id}/ai/consent`, { key, accepted }, quiet),
  list: () => http.get<MeetingSummary[]>(base),
  panel: () => http.get<{ id: number; name: string }[]>(`${base}/panel`),
  details: (id: string) => http.get<MeetingDetails>(`${base}/${id}`, undefined, quiet),
  token: (id: string, start: boolean) => http.post<{ url: string; token: string }>(`${base}/${id}/token`, { start }, quiet),
  state: (id: string, after: number) => http.get<MeetingState>(`${base}/${id}/state`, { after }, quiet),
  enableRecording: (id: string) => http.post<RecordingView>(`${base}/${id}/recording/enable`, undefined, quiet),
  recordingConsent: (id: string, accept: boolean, policyVersion: string) =>
    http.post<RecordingView>(`${base}/${id}/recording/consent`, { accept, policyVersion }, quiet),
  stopRecording: (id: string) => http.post<RecordingView>(`${base}/${id}/recording/stop`, undefined, quiet),
  archives: (filters: { keyword?: string; batchId?: number; laboratoryId?: number; offset: number }) =>
    http.get<{ items: ArchiveRow[]; total: number }>(`${base}/archives`, filters, quiet),
  archive: (id: number, after = 0) => http.get<InterviewArchive>(`${base}/${id}/archive`, { after }, quiet),
  recordingLink: (id: number, download: boolean) =>
    http.post<{ url: string; expiresAt: string }>(`${base}/${id}/recording/link`, { download }, quiet),
  retention: (id: number, action: 'hold' | 'release' | 'delete', reason: string) =>
    http.post<RecordingView>(`${base}/${id}/recording/retention`, { action, reason }, quiet),
  waiting: (id: string, action: 'request' | 'cancel') => http.post(`${base}/${id}/waiting`, { action }, quiet),
  decide: (id: string, identity: string, approve: boolean) => http.post(`${base}/${id}/waiting/decision`, { identity, approve }, quiet),
  lock: (id: string, locked: boolean) => http.post(`${base}/${id}/lock`, { locked }, quiet),
  moderate: (id: string, identity: string, action: 'request-mute' | 'remove', reason?: string) =>
    http.post(`${base}/${id}/moderate`, { identity, action, reason }, quiet),
  hand: (id: string, raised: boolean) => http.post(`${base}/${id}/hand`, { raised }, quiet),
  send: (id: string, clientId: string, content: string) => http.post<MeetingMessage>(`${base}/${id}/messages`, { clientId, content }, quiet),
  profile: (id: string) => http.get<MeetingProfile>(`${base}/${id}/profile`, undefined, quiet),
  resume: (id: string) => http.get<{ data: Blob }>(`${base}/${id}/profile/resume`, undefined, { ...quiet, responseType: 'blob' }),
  end: (id: string) => http.post<MeetingSummary>(`${base}/${id}/end`, undefined, quiet)
}
