export interface QuestionItem {
  id: number
  questionType: number
  questionTypeText: string
  content: string
  options: string[]
  correctAnswer: string
  score: number
  status: number
  statusText: string
}

export interface QuestionPage {
  total: number
  pageNum: number
  pageSize: number
  list: QuestionItem[]
}

export interface QuestionSaveReq {
  questionType: number
  content: string
  options: string[]
  correctAnswer: string
  score: number
}

export interface ExamPaperItem {
  id: number
  roundId: number
  title: string
  status: number
  statusText: string
  questionCount: number
  totalScore: number
  startTime: string
  endTime: string
  durationMinutes: number
  answerCount: number
  submittedCount: number
  averageScore: number | null
}

export interface ExamPaperPage {
  total: number
  pageNum: number
  pageSize: number
  list: ExamPaperItem[]
}

export interface ExamPaperQuestion {
  id: number
  questionId: number
  questionNo: number
  questionType: number
  questionTypeText: string
  content: string
  options: string[]
  correctAnswer: string
  score: number
}

export interface ExamPaperDetail {
  id: number
  roundId: number
  title: string
  description: string | null
  startTime: string
  endTime: string
  durationMinutes: number
  totalScore: number
  status: number
  statusText: string
  questionCount: number
  questions: ExamPaperQuestion[]
}

export interface ExamSelectedQuestion {
  questionId: number
  content: string
  questionTypeText: string
  score: number
}

export interface ExamPaperSaveReq {
  roundId?: number
  title: string
  description?: string
  startTime: string
  endTime: string
  durationMinutes: number
  questions: { questionId: number; score: number }[]
}

export interface ExamResultItem {
  studentId: number
  studentNo: string
  studentName: string
  startTime: string | null
  submitTime: string | null
  status: number
  statusText: string
  score: number | null
}

export interface ExamResultPage {
  total: number
  pageNum: number
  pageSize: number
  list: ExamResultItem[]
}

export interface StudentExamItem {
  paperId: number
  title: string
  mentorId: number
  mentorName: string
  labName: string
  startTime: string
  endTime: string
  durationMinutes: number
  totalScore: number
  paperStatusText: string
  answerStatus: number
  answerStatusText: string
  myScore: number | null
  canStart: boolean
}

export interface StudentExamQuestion {
  questionId: number
  questionNo: number
  questionType: number
  questionTypeText: string
  content: string
  options: string[]
  score: number
  answerContent: string | null
}

export interface StudentExamDetail {
  paperId: number
  title: string
  description: string | null
  mentorName: string
  labName: string
  startTime: string
  endTime: string
  durationMinutes: number
  totalScore: number
  answerStatus: number
  answerStatusText: string
  remainingSeconds: number
  submittedTime: string | null
  myScore: number | null
  questions: StudentExamQuestion[]
}

export interface ExamSaveResp {
  savedCount: number
  answerStatus: number
  remainingSeconds: number
}

export interface ExamSubmitResp {
  answerId: number
  objectiveScore: number
  totalScore: number
  totalScoreOfPaper: number
  correctCount: number
  questionCount: number
  submitTime: string
}
