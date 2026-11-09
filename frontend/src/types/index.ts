export interface Result<T> {
  code: string
  message: string
  data: T
}

export interface UserInfo {
  id: number
  loginName: string
  name: string
  studentNo?: string
  employeeNo?: string
  phone?: string
  email?: string
  mustChangePassword?: boolean
}

export interface RoleInfo {
  roleCode: string
  roleName: string
  scopeType: string
  scopeId?: number
}

export interface LoginResponse {
  token: string
  user: UserInfo
  roles: RoleInfo[]
  activeRole: string
}

export interface MeResponse {
  user: UserInfo
  roles: RoleInfo[]
  activeRole: string
}

export interface StageInfo {
  stage: number
  name: string
  status: string
  startAt?: string
  endAt?: string
  roundNo?: number
}

export interface RoundInfo {
  id: number
  cycleId: number
  roundNo: number
  status: string
  applyStart?: string
  applyEnd?: string
  interviewStart?: string
  interviewEnd?: string
  confirmStart?: string
  confirmEnd?: string
}

export interface CycleInfo {
  id: number
  name: string
  cycleYear: number
  status: string
  currentRound: number
  announceAt?: string
  openDayStart?: string
  openDayEnd?: string
  adjustStart?: string
  adjustEnd?: string
  publicityStart?: string
  publicityEnd?: string
}

export interface CycleDetail {
  cycle: CycleInfo | null
  rounds: RoundInfo[]
  stage: StageInfo
}

export interface LabView {
  id: number
  name: string
  department?: string
  leaderName?: string
  directions?: string
  totalQuota: number
  remaining: number
  mentorCount: number
  status: string
}

export interface MentorView {
  id: number
  userId: number
  name: string
  title?: string
  direction?: string
  labId: number
  labName?: string
  quota: number
  used: number
  reserved: number
  available: number
}

export interface IntentView {
  mentorId: number
  mentorName?: string
  labId: number
  labName?: string
  direction?: string
  available?: number
}

export interface ApplicationView {
  id?: number
  cycleId: number
  round: number
  status: string
  submittedAt?: string
  receiptNo?: string
  acceptL1: boolean
  acceptL2: boolean
  editable: boolean
  applyEnd?: string
  intents: IntentView[]
}

export interface AnnouncementItem {
  id: number
  title: string
  type: string
  content?: string
  publishAt?: string
}

export interface OpenDayItem {
  id: number
  labId: number
  dateAt: string
  startTime?: string
  endTime?: string
  location?: string
  note?: string
}

export interface NotificationItem {
  id: number
  title: string
  content?: string
  type?: string
  isRead: boolean
  createdAt?: string
}

export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  size: number
}

/** 集中宣讲视频（阶段一） */
export interface VideoItem {
  id: number
  labId: number
  labName?: string
  title: string
  description?: string
  videoType: string
  videoUrl: string
  coverUrl?: string
  durationSeconds?: number
  sortNo: number
  status: string
  createdAt?: string
}

/** 720° 全景云游（阶段二） */
export interface PanoramaItem {
  id: number
  labId: number
  labName?: string
  name: string
  description?: string
  panoramaType: string
  panoramaUrl: string
  coverUrl?: string
  sortNo: number
  status: string
  createdAt?: string
}

export interface VideoPayload {
  labId: number
  title: string
  description?: string
  videoType: string
  videoUrl: string
  coverUrl?: string
  durationSeconds?: number
  sortNo: number
  status: string
}

export interface PanoramaPayload {
  labId: number
  name: string
  description?: string
  panoramaType: string
  panoramaUrl: string
  coverUrl?: string
  sortNo: number
  status: string
}
