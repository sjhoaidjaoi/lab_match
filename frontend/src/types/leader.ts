export interface LeaderApplicantMentor {
  mentorId: number
  mentorName: string
  labId: number
  labName: string
}

export interface LeaderApplicant {
  studentId: number
  studentNo: string
  studentName: string
  college: string
  major: string
  grade: string
  intentions: LeaderApplicantMentor[]
  acceptInnerAdjust: number
  acceptCrossAdjust: number
  sessionName: string | null
  interviewDate: string | null
  scheduleStatus: number | null
  scheduleStatusText: string | null
  totalScore: number | null
  scoreStatus: number | null
  scoreStatusText: string | null
  admissionStatus: number | null
  admissionStatusText: string | null
}

export interface LeaderApplicantPage {
  visible: number
  total: number
  pageNum: number
  pageSize: number
  list: LeaderApplicant[]
}
