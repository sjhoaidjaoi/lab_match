export interface TeacherApplicant {
  studentId: number
  studentNo: string
  studentName: string
  college: string
  major: string
  grade: string
  sessionName: string | null
  interviewDate: string | null
  totalScore: number | null
  scoreStatus: number | null
  scoreStatusText: string
  admissionStatus: number | null
  admissionStatusText: string
}

export interface TeacherApplicantPage {
  visible: number
  total: number
  pageNum: number
  pageSize: number
  list: TeacherApplicant[]
}

export interface TeacherStudentArchive {
  userNo: string
  realName: string
  college: string | null
  major: string | null
  grade: string | null
  className: string | null
  gpa: number | null
  ranking: number | null
  englishLevel: string | null
  programmingLanguages: string[]
  techStack: string[]
  projectExperience: string | null
  competitionExperience: string | null
  researchExperience: string | null
  internshipExperience: string | null
  weeklyHours: number | null
  availableSlots: string | null
  otherDuties: string | null
  expectedDirection: string | null
  statement: string | null
}
