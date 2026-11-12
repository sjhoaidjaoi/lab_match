import { get, post, put } from './request'
import type {
  ExamSaveResp,
  ExamSubmitResp,
  StudentExamDetail,
  StudentExamItem
} from '@/types/exam'

/**
 * 我的在线笔试列表。
 */
export function listMyExams(roundId?: number): Promise<StudentExamItem[]> {
  return get<StudentExamItem[]>('/student/exams', { params: { roundId } })
}

/**
 * 查看试卷与本人作答。
 */
export function getMyExam(paperId: number): Promise<StudentExamDetail> {
  return get<StudentExamDetail>(`/student/exams/${paperId}`)
}

/**
 * 开始答题。
 */
export function startExam(paperId: number): Promise<StudentExamDetail> {
  return post<StudentExamDetail>(`/student/exams/${paperId}/start`)
}

/**
 * 暂存作答。
 */
export function saveExamAnswers(
  paperId: number,
  items: { questionId: number; answerContent: string }[]
): Promise<ExamSaveResp> {
  return put<ExamSaveResp>(`/student/exams/${paperId}/answers`, { items })
}

/**
 * 交卷。
 */
export function submitExam(paperId: number): Promise<ExamSubmitResp> {
  return post<ExamSubmitResp>(`/student/exams/${paperId}/submit`)
}
