export type SnapshotType = 1 | 2 | 3 | 4

export interface RoundSnapshotItem {
  id: number
  roundId: number
  roundName: string
  snapshotType: SnapshotType
  snapshotTypeText: string
  recordCount: number
  version: number
  isCurrent: number
  operatorName: string
  gmtCreate: string
}

export interface SnapshotGenerateResp {
  id: number
  version: number
  recordCount: number
}

export interface RoundLockResp {
  locked: number
  lockedAt: string
}

export interface RoundUnlockResp {
  locked: number
  unlockedAt: string
}

export interface ResultRow {
  admissionId: number
  studentId: number
  studentNo: string
  studentName: string
  college: string
  major: string
  grade: string
  labId: number
  labName: string
  mentorId: number
  mentorName: string
  totalScore: number | null
  status: number
  statusText: string
  sourceType: number
  sourceTypeText: string
  confirmTime: string | null
}

export type AdmissionAdjustAction = 'CONFIRM' | 'CANCEL' | 'REASSIGN' | 'ABANDON'

export interface AdmissionAdjustReq {
  action: AdmissionAdjustAction
  targetMentorId?: number
  reason: string
}

export interface AdmissionAdjustResp {
  id: number
  status: number
  mentorId: number | null
}

export interface ResultOverview {
  roundId: number
  archived: number
  totalQuota: number
  totalAdmitted: number
  totalConfirmed: number
  totalEnrolled: number
  saturationRate: number
  page: {
    total: number
    pageNum: number
    pageSize: number
    list: ResultRow[]
  }
}

export interface ResultQuery {
  roundId: number
  labId?: number
  mentorId?: number
  keyword?: string
  status?: number
  pageNum: number
  pageSize: number
}
