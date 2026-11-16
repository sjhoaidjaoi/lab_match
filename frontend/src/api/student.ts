import { http } from './request'
import type { MeetingStatus } from './interviewVideo'
import type {
  AnnouncementItem, LabView, NoticeItem, OpenDaySchedule, PanoramaItem,
  PreferenceItem, PublicationInfo, StageInfo, VideoItem
} from '@/types'

/** 当前阶段（由 /batches/current 计算返回） */
export interface CurrentStage {
  no: number
  name: string
  key: string
}

export interface CurrentBatch {
  id: number
  batchName: string
  academicYear: string
  description?: string
  status: string
  createdAt?: string
  stages?: StageInfo[]
  currentStage?: CurrentStage | null
}

/** 实训室导师 */
export interface LabTeacher {
  userId?: number | null
  status?: 'ACTIVE' | 'INACTIVE'
  acceptsPreferences?: boolean
  recruitmentQuota?: number | null
  id: number
  laboratoryId: number
  name: string
  title?: string
  direction?: string
  intro?: string
  sortNo?: number
}

/** 实训室详情额外附带宣讲视频与全景资源 */
export interface LabDetail extends LabView {
  teachers?: LabTeacher[]
  videos?: VideoItem[]
  panoramas?: PanoramaItem[]
}

export interface StudentInterview {
  online?: { status: MeetingStatus }
  durationMinutes?: number
  id: number
  batchId?: number
  studentId?: number
  laboratoryId: number
  laboratoryName?: string
  interviewerId?: number | null
  interviewerName?: string
  labTeacherName?: string
  instructions?: string
  interviewTime?: string | null
  interviewStatus?: string
  /** 后端暂未提供，缺失时页面显示占位 */
  location?: string | null
  interviewForm?: string | null
  attitudeScore?: number | null
  logicScore?: number | null
  programmingScore?: number | null
  timeCommitmentScore?: number | null
  comprehensiveScore?: number | null
  evaluation?: string
  recommendation?: string
  createdAt?: string
}

export interface StudentAdmission {
  labTeacherName?: string
  source?: 'TEACHER_INVITATION'
  id: number
  batchId?: number
  studentId?: number
  laboratoryId: number
  laboratoryName?: string
  admissionType: string
  status: string
  confirmationDeadline?: string | null
  confirmedAt?: string | null
  autoConfirmed?: boolean
  createdAt?: string
}

export interface StudentAdjustmentRecord {
  targetTeacherName?: string | null
  id: number
  batchId?: number
  studentId?: number
  sourceLaboratoryId?: number | null
  sourceLabName?: string | null
  targetLaboratoryId: number
  targetLabName?: string
  adjustmentType: string
  priorityLevel?: number
  reason?: string
  operatorId?: number
  status: string
  createdAt?: string
  confirmedAt?: string | null
}

export interface StudentFinalResult {
  labTeacherName?: string
  id: number
  batchId?: number
  studentId?: number
  laboratoryId: number
  laboratoryName?: string
  admissionSource?: string
  finalStatus: string
  confirmedAt?: string
  published?: boolean
}

export interface PublicationObjection {
  id: number
  studentId?: number
  type: string
  content: string
  status: string
  handlingNote?: string
  createdAt?: string
  handledAt?: string | null
}

export interface PreferenceSubmitPayload {
  resumeId: string
  choices: { laboratoryId: number; labTeacherId: number }[]
  obeyInternalAdjustment: boolean
  obeyCollegeAdjustment: boolean
}

export interface ObjectionSubmitPayload {
  type: string
  content: string
}

/** 学生端业务接口（统一走 request.ts，自动携带 token 与 X-Role） */
export const studentApi = {
  batchesCurrent: () => http.get<CurrentBatch | null>('/batches/current'),
  labs: () => http.get<LabView[]>('/laboratories'),
  labDetail: (id: number) => http.get<LabDetail>(`/laboratories/${id}`),
  announcements: () => http.get<AnnouncementItem[]>('/announcements'),
  videos: () => http.get<VideoItem[]>('/media/videos'),
  panoramas: () => http.get<PanoramaItem[]>('/media/panoramas'),
  openDays: () => http.get<OpenDaySchedule[]>('/open-days'),
  myPreferences: () => http.get<PreferenceItem[]>('/preferences/my'),
  submitPreferences: (payload: PreferenceSubmitPayload) =>
    http.post<{ count: number }>('/preferences/submit', payload),
  myInterviews: () => http.get<StudentInterview[]>('/interviews/my'),
  myAdmissions: () => http.get<StudentAdmission[]>('/admissions/my'),
  confirmAdmission: (id: number, confirmed: boolean) =>
    http.post<StudentAdmission>(`/admissions/${id}/confirm`, { confirmed }),
  myAdjustments: () => http.get<StudentAdjustmentRecord[]>('/adjustments/my'),
  confirmAdjustment: (id: number, confirmed: boolean) =>
    http.post<StudentAdjustmentRecord>(`/adjustments/${id}/confirm`, { confirmed }),
  myFinal: () => http.get<StudentFinalResult | null>('/final/my'),
  publication: () => http.get<PublicationInfo | null>('/final/publication', { visible: true }),
  submitObjection: (payload: ObjectionSubmitPayload) =>
    http.post<PublicationObjection>('/final/objections/student', payload),
  myObjections: () => http.get<PublicationObjection[]>('/final/objections/my'),
  myNotices: () => http.get<NoticeItem[]>('/notifications/my'),
  readNotice: (id: number) => http.post<NoticeItem>(`/notifications/${id}/read`)
}

/** 统一展示北京时间，空值回退占位符 */
export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai'
  }).format(timestamp)
}
