export interface LeaderAdmissionItem {
  id: number
  studentId: number
  studentNo: string
  studentName: string
  mentorId: number
  mentorName: string
  totalScore: number | null
  status: number
  statusText: string
  sourceType: number
  sourceTypeText: string
  confirmTime: string | null
  confirmDeadline: string | null
}

export interface LeaderAdmissionSummary {
  roundId: number | null
  labId: number
  labName: string
  labQuota: number
  allocatedQuota: number
  quotaUsed: number
  remainQuota: number
  totalCount: number
  pendingCount: number
  confirmedCount: number
  enrolledCount: number
  abandonedCount: number
  items: LeaderAdmissionItem[]
}
