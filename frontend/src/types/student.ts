export interface StudentArchive {
  userNo: string
  realName: string
  college: string | null
  major: string | null
  grade: string | null
  className: string
  gpa: number | null
  ranking: number | null
  englishLevel: string
  programmingLanguages: string[]
  techStack: string[]
  projectExperience: string
  competitionExperience: string
  researchExperience: string
  internshipExperience: string
  weeklyHours: number | null
  availableSlots: string
  otherDuties: string
  expectedDirection: string
  statement: string
  missingFields: string[]
}

export interface StudentArchiveSaveReq {
  className: string
  gpa: number | null
  ranking: number | null
  englishLevel: string
  programmingLanguages: string[]
  techStack: string[]
  projectExperience: string
  competitionExperience: string
  researchExperience: string
  internshipExperience: string
  weeklyHours: number | null
  availableSlots: string
  otherDuties: string
  expectedDirection: string
  statement: string
}

export interface IntentionItem {
  mentorId: number
  mentorName: string
  labId: number
  labName: string
  researchDirection: string
  remainQuota: number
}

export interface IntentionDetail {
  id: number
  roundId: number
  roundNo: number
  status: number
  statusText: string
  acceptInnerAdjust: number
  acceptCrossAdjust: number
  poolConsent: number
  submitTime: string | null
  editable: number
  items: IntentionItem[]
}

export interface IntentionSaveReq {
  roundId: number
  items: Array<{ mentorId: number }>
  acceptInnerAdjust: number
  acceptCrossAdjust: number
  poolConsent: number
  submit: number
}

export interface IntentionSaveResp {
  id: number
  status: number
}

export interface AvailableMentor {
  mentorId: number
  mentorName: string
  title: string | null
  labId: number
  labName: string
  researchDirection: string | null
  quota: number
  quotaUsed: number
  remainQuota: number
  selectable: number
}

export interface CurrentRound {
  id: number
  roundNo: number
  roundName: string
  status: number
  statusText: string
  applyStart: string
  applyEnd: string
  countdownSeconds: number
}
