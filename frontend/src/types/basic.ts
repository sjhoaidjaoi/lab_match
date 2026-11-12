export interface PageResult<T> {
  total: number
  pageNum: number
  pageSize: number
  list: T[]
}

export interface LabListItem {
  id: number
  labCode: string
  labName: string
  department: string | null
  leaderName: string | null
  mentorCount: number
  totalQuota: number
  quotaUsed: number
  remainQuota: number
  researchDirection: string | null
  openDayDate: string | null
  status: number
}

export interface LabSaveReq {
  labCode: string
  labName: string
  department: string
  introduction: string
  researchDirection: string
  equipmentEnv: string
  trainingPlan: string
  assessmentRequirement: string
  openDayDate: string
  openDayStartTime: string
  openDayEndTime: string
  openDayLocation: string
  openDayNote: string
  totalQuota: number
  status: number
}

export interface LabDetail {
  id: number
  labCode: string
  labName: string
  department: string | null
  leaderName: string | null
  introduction: string | null
  researchDirection: string | null
  equipmentEnv: string | null
  trainingPlan: string | null
  assessmentRequirement: string | null
  openDayDate: string | null
  openDayStartTime: string | null
  openDayEndTime: string | null
  openDayLocation: string | null
  openDayNote: string | null
  totalQuota: number
  quotaUsed: number
  remainQuota: number
  status: number
}

export interface MentorListItem {
  id: number
  userId: number
  userNo: string
  realName: string
  labId: number
  labName: string
  title: string | null
  researchDirection: string | null
  researchProjects: string | null
  phone: string | null
  email: string | null
  quota: number
  quotaUsed: number
  remainQuota: number
  status: number
  accountStatus: number
}

export interface MentorSaveReq {
  realName: string
  labId: number
  title: string
  researchDirection: string
  researchProjects: string
  phone: string
  email: string
  quota: number
  status: number
}

export interface MentorCreateReq extends MentorSaveReq {
  userNo: string
  leader?: boolean
}

export interface StudentListItem {
  id: number
  userId: number
  userNo: string
  realName: string
  college: string | null
  major: string | null
  grade: string | null
  phone: string | null
  email: string | null
  status: number
  needChangePwd: number
}

export interface StudentSaveReq {
  realName: string
  college: string
  major: string
  grade: string
  phone: string
  email: string
  status: number
}

export interface StudentCreateReq extends StudentSaveReq {
  userNo: string
}

export interface StudentImportFailItem {
  row: number
  userNo: string
  reason: string
}

export interface StudentImportResult {
  successCount: number
  failCount: number
  failList: StudentImportFailItem[]
  failFileUrl: string | null
}

export interface RoundListItem {
  id: number
  roundNo: number
  roundName: string
  status: number
  statusText: string
  applyStart: string
  applyEnd: string
  interviewStart: string
  interviewEnd: string
  nominationStart: string
  nominationSubmitEnd: string
  confirmStart: string
  nominationEnd: string
  innerAdjustStart: string | null
  innerAdjustEnd: string | null
  adjustStart: string
  adjustEnd: string
  weightAttitude: number
  weightLogic: number
  weightProgramming: number
  weightTime: number
  locked: number
}

export interface RoundSaveReq {
  roundNo: number
  roundName: string
  applyStart: string
  applyEnd: string
  interviewStart: string
  interviewEnd: string
  nominationStart: string
  nominationSubmitEnd: string
  confirmStart: string
  nominationEnd: string
  innerAdjustStart: string | null
  innerAdjustEnd: string | null
  adjustStart: string
  adjustEnd: string
  weightAttitude: number
  weightLogic: number
  weightProgramming: number
  weightTime: number
}
