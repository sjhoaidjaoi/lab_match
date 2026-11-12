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

/** 导师个人录取名单项，字段与 04_API.md §3.20.2 一致 */
export interface TeacherAdmissionItem {
  id: number
  studentId: number
  studentNo: string
  studentName: string
  status: number
  statusText: string
  confirmTime: string | null
}

/** 导师个人录取名单与统计 */
export interface TeacherAdmissionSummary {
  quota: number
  confirmedCount: number
  pendingCount: number
  remainQuota: number
  items: TeacherAdmissionItem[]
}
