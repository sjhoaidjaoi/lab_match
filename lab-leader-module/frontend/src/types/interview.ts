export interface InterviewSession {
  id: number
  roundId: number
  sessionName: string
  interviewDate: string
  startTime: string
  endTime: string
  location: string
  capacity: number
  scheduledCount: number
  status: number
  statusText: string
  interviewerIds: number[]
  interviewerNames: string[]
}

export interface InterviewSessionSaveReq {
  roundId: number
  sessionName: string
  interviewDate: string
  startTime: string
  endTime: string
  location: string
  capacity: number
  interviewerIds: number[]
}

export interface InterviewSchedule {
  id: number
  roundId: number
  labId: number
  labName: string
  studentId: number
  studentNo: string
  studentName: string
  sessionId: number
  sessionName: string
  interviewDate: string
  startTime: string
  endTime: string
  status: number
  statusText: string
}

export interface ScheduleAdjustItem {
  scheduleId: number
  sessionId: number
}

export interface ScheduleAdjustReq {
  roundId: number
  items: ScheduleAdjustItem[]
}

export interface InterviewScoreRow {
  id: number | null
  studentId: number
  studentNo: string
  studentName: string
  sessionName: string
  attitudeScore: number | null
  logicScore: number | null
  programmingScore: number | null
  timeScore: number | null
  systemTotal: number | null
  manualTotal: number | null
  finalTotal: number | null
  status: number
  statusText: string
}

export interface InterviewScoreSaveReq {
  roundId: number
  studentId: number
  attitudeScore: number
  logicScore: number
  programmingScore: number
  timeScore: number
  manualTotal: number | null
  adjustReason: string
  comment: string
  submit: number
}

export interface InterviewScoreResp {
  id: number
  systemTotal: number
  manualTotal: number | null
  finalTotal: number
  status: number
}

export interface StudentInterview {
  id: number
  roundNo: number
  labId: number
  labName: string
  sessionName: string
  interviewDate: string
  startTime: string
  endTime: string
  location: string
  interviewers: string[]
  note: string
  status: number
  statusText: string
}

export interface PublishScheduleResp {
  sessionCount: number
  studentCount: number
  noticeCount: number
}
