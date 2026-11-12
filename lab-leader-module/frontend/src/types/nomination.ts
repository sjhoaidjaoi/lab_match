export interface NominationCandidate {
  studentId: number
  studentNo: string
  studentName: string
  totalScore: number
  rankNo: number
  nominated: boolean
}

export interface NominationOverview {
  roundId: number
  quota: number
  quotaUsed: number
  remainQuota: number
  submitted: boolean
  candidates: NominationCandidate[]
}

export interface NominationSaveReq {
  roundId: number
  studentIds: number[]
  submit: number
}

export interface NominationSaveResp {
  submittedCount: number
  quota: number
  quotaUsed: number
  remainQuota: number
}

export interface NominationItem {
  id: number
  studentId: number
  studentNo: string
  studentName: string
  totalScore: number
  status: number
  statusText: string
}

export interface WaitlistRankReq {
  roundId: number
  items: Array<{ waitlistId: number; rankNo: number }>
  adjustReason: string
}

export interface WaitlistItem {
  id: number
  rankNo: number
  studentId: number
  studentNo: string
  studentName: string
  totalScore: number
  isManual: number
  adjustReason: string | null
  applyStatus: number
  applyStatusText: string
}

export interface WaitlistRankItem {
  waitlistId: number
  rankNo: number
}

export interface LeaderWaitlistItem {
  id: number
  roundId: number
  mentorId: number
  mentorName: string
  rankNo: number
  studentId: number
  studentNo: string
  studentName: string
  totalScore: number | null
  isManual: number
  adjustReason: string | null
  applyStatus: number
  applyStatusText: string
}

export interface LeaderWaitlistRankReq {
  roundId: number
  items: WaitlistRankItem[]
  adjustReason: string
}

export interface LeaderNominationMentor {
  mentorId: number
  mentorName: string
  quota: number
  nominatedCount: number
  submitStatus: number
  submitStatusText: string
}

export interface LeaderNominationConflict {
  studentId: number
  studentName: string
  mentorNames: string[]
  reason: string
}

export interface LeaderNominationSummary {
  labQuota: number
  quotaUsed: number
  remainQuota: number
  conflictCount: number
  mentors: LeaderNominationMentor[]
  conflicts: LeaderNominationConflict[]
}

export interface LeaderNominationCandidate {
  studentId: number
  studentNo: string
  studentName: string
  totalScore: number | null
  nominated: boolean
}

export interface LeaderNominationDetail {
  roundId: number | null
  mentorId: number
  mentorName: string
  quota: number
  quotaUsed: number
  selectedStudentIds: number[]
  candidates: LeaderNominationCandidate[]
}

export interface LeaderNominationAdjustReq {
  roundId: number
  studentIds: number[]
  reason: string
}

export interface LeaderNominationSubmitResp {
  admissionCount: number
  conflictCount: number
}

export interface ConfirmCenterItem {
  id: number
  admissionId: number
  pendingType: number
  pendingTypeText: string
  labId: number
  labName: string
  mentorId: number
  mentorName: string
  sourceType: number
  sourceTypeText: string
  totalScore: number
  confirmDeadline: string
  countdownSeconds: number
  actions: string[]
}

export interface ConfirmCenter {
  total: number
  items: ConfirmCenterItem[]
}

export interface ConfirmRespondReq {
  action: 'ACCEPT' | 'REJECT'
  reason?: string
}

export interface ConfirmRespondResp {
  id: number
  status: number
}
