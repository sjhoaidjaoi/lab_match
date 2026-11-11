export interface ReallocationMentor {
  mentorId: number
  mentorName: string
  labId: number
  labName: string
  remainQuota: number
}

export interface ReallocationCandidate {
  studentId: number
  studentNo: string
  studentName: string
  originLabId: number
  originLabName: string
  acceptInnerAdjust: number
  acceptCrossAdjust: number
  totalScore: number | null
  availableMentors: ReallocationMentor[]
}

export interface LeaderReallocationReq {
  roundId: number
  studentId: number
  toMentorId: number
  reason?: string
}

export interface LeaderReallocationResp {
  reallocationId: number
  admissionId: number
}

export interface AdminReallocationItemReq {
  studentId: number
  toMentorId: number
}

export interface AdminReallocationReq {
  roundId: number
  level: number
  items: AdminReallocationItemReq[]
  reason?: string
}

export interface ReallocationFailItem {
  studentId: number
  studentName: string
  reason: string
}

export interface AdminReallocationResp {
  successCount: number
  failCount: number
  failList: ReallocationFailItem[]
}

export interface ReallocationPoolItem {
  studentId: number
  studentNo: string
  studentName: string
  college: string
  major: string
  grade: string
  statementSummary: string
  hasFullArchive: number
  programmingLanguages: string[]
  weeklyHours: number
  taken: number
  takenLabName: string | null
}

export interface ReallocationPool {
  total: number
  pageNum: number
  pageSize: number
  myRemainQuota: number
  list: ReallocationPoolItem[]
}

export interface TakeReallocationResp {
  admissionId: number
  mentorId: number
}

export interface SupplementMentor {
  mentorId: number
  mentorName: string
  title: string
  labId: number
  labName: string
  researchDirection: string
  quota: number
  quotaUsed: number
  remainQuota: number
  selectable: number
}

export interface SupplementDirectAdmitReq {
  roundId: number
  studentId: number
  reason: string
}

export interface SupplementDirectAdmitResp {
  admissionId: number
  status: number
}

export interface SupplementApplicant {
  studentId: number
  studentNo: string
  studentName: string
  major: string
  grade: string
  totalScore: number
  admitted: number
}
