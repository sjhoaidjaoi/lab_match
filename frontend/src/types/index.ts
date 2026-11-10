// ========== 统一响应 + 用户/角色类型 ==========
export interface Result<T> {
  code: string | number
  message: string
  data: T
}

export interface UserInfo {
  id: number
  username: string
  realName: string
  /** 兼容旧代码的别名 */
  name?: string
  studentNumber?: string | null
  /** 兼容旧代码 */
  studentNo?: string
  role: string
  phone?: string | null
}

export interface RoleInfo {
  roleCode: string
  roleName: string
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
  id: number
  batchId: number
  stageNumber: number
  stageName: string
  stageKey: string
  startTime: string
  endTime: string
  stageStatus: string
  description?: string
}

export interface BatchInfo {
  id: number
  batchName: string
  academicYear: string
  description?: string
  status: string
  createdAt: string
  stages?: StageInfo[]
  currentStage?: { no: number; name: string; key: string } | null
}

export interface LabView {
  id: number
  name: string
  description?: string
  projectDirection?: string
  technologyStack?: string
  recruitmentQuota: number
  leaderId?: number | null
  leaderName?: string | null
  introductionVideo?: string | null
  panoramicResource?: string | null
  status: string
  createdAt?: string
}

export interface PreferenceItem {
  id: number
  batchId: number
  studentId: number
  laboratoryId: number
  laboratoryName?: string
  obeyInternalAdjustment: boolean
  obeyCollegeAdjustment: boolean
  submittedAt: string
  status: string
}

export interface InterviewItem {
  id: number
  batchId: number
  studentId: number
  studentName?: string
  studentNumber?: string
  laboratoryId: number
  interviewerId: number
  interviewerName?: string
  interviewTime: string
  interviewStatus: string
  attitudeScore?: number | null
  logicScore?: number | null
  programmingScore?: number | null
  timeCommitmentScore?: number | null
  comprehensiveScore?: number | null
  evaluation?: string
  recommendation?: string
  createdAt?: string
}

export interface AdmissionItem {
  id: number
  batchId: number
  studentId: number
  laboratoryId: number
  laboratoryName?: string
  admissionType: string
  status: string
  confirmationDeadline?: string | null
  confirmedAt?: string | null
}

export interface AdjustmentItem {
  id: number
  batchId: number
  studentId: number
  studentName?: string
  sourceLaboratoryId?: number | null
  targetLaboratoryId: number
  targetLabName?: string
  adjustmentType: string
  priorityLevel: number
  reason?: string
  operatorId: number
  status: string
  createdAt: string
}

export interface FinalAdmissionItem {
  id: number
  batchId: number
  studentId: number
  studentName?: string
  studentNumber?: string
  laboratoryId: number
  admissionSource: string
  finalStatus: string
  confirmedAt: string
}

export interface AnnouncementItem {
  id: number
  batchId?: number | null
  title: string
  content?: string
  status: string
  createdBy?: number | null
  createdAt?: string
}

export interface NoticeItem {
  id: number
  targetRole?: string | null
  targetUserId?: number | null
  title: string
  content?: string
  read: boolean
  createdBy?: number | null
  createdAt?: string
}

/** 阶段一宣讲视频 */
export interface VideoItem {
  id: number
  laboratoryId: number
  /** 兼容旧代码 */
  labId?: number
  laboratoryName?: string
  /** 兼容旧代码 */
  labName?: string
  title: string
  description?: string
  videoType: string
  videoUrl: string
  coverUrl?: string | null
  durationSeconds?: number | null
  sortNo: number
  status: string
  createdAt?: string
}

/** 720° 全景云游（阶段二） */
export interface PanoramaItem {
  id: number
  laboratoryId: number
  /** 兼容旧代码 */
  labId?: number
  laboratoryName?: string
  /** 兼容旧代码 */
  labName?: string
  name: string
  description?: string
  panoramaType: string
  panoramaUrl: string
  coverUrl?: string | null
  sortNo: number
  status: string
  createdAt?: string
}

export interface VideoPayload {
  laboratoryId?: number
  /** 兼容旧代码（两者都可以，labId 存在时 laboratoryId 会在 API 层自动映射） */
  labId?: number
  title: string
  description?: string
  videoType: string
  videoUrl: string
  coverUrl?: string | null
  durationSeconds?: number | null
  sortNo?: number
  status?: string
}

export interface PanoramaPayload {
  laboratoryId?: number
  /** 兼容旧代码 */
  labId?: number
  name: string
  description?: string
  panoramaType: string
  panoramaUrl: string
  coverUrl?: string | null
  sortNo?: number
  status?: string
}
