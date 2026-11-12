import { del, get, post, put } from './request'
import type {
  ExamPaperDetail,
  ExamPaperPage,
  ExamPaperSaveReq,
  ExamResultPage,
  QuestionItem,
  QuestionPage,
  QuestionSaveReq
} from '@/types/exam'

/**
 * 分页查询本人题库。
 */
export function listQuestions(params: {
  questionType?: number
  keyword?: string
  status?: number
  pageNum?: number
  pageSize?: number
}): Promise<QuestionPage> {
  return get<QuestionPage>('/teacher/questions', { params })
}

/**
 * 新增题库题目。
 */
export function createQuestion(payload: QuestionSaveReq): Promise<QuestionItem> {
  return post<QuestionItem>('/teacher/questions', payload)
}

/**
 * 修改本人题目。
 */
export function updateQuestion(id: number, payload: QuestionSaveReq): Promise<QuestionItem> {
  return put<QuestionItem>(`/teacher/questions/${id}`, payload)
}

/**
 * 删除或停用本人题目。
 */
export function deleteQuestion(id: number): Promise<void> {
  return del<void>(`/teacher/questions/${id}`)
}

/**
 * 分页查询本人试卷。
 */
export function listExamPapers(params: {
  roundId?: number
  keyword?: string
  status?: number
  pageNum?: number
  pageSize?: number
}): Promise<ExamPaperPage> {
  return get<ExamPaperPage>('/teacher/exam-papers', { params })
}

/**
 * 查看试卷详情。
 */
export function getExamPaper(id: number): Promise<ExamPaperDetail> {
  return get<ExamPaperDetail>(`/teacher/exam-papers/${id}`)
}

/**
 * 新建试卷草稿。
 */
export function createExamPaper(payload: ExamPaperSaveReq): Promise<ExamPaperDetail> {
  return post<ExamPaperDetail>('/teacher/exam-papers', payload)
}

/**
 * 修改试卷草稿。
 */
export function updateExamPaper(id: number, payload: ExamPaperSaveReq): Promise<ExamPaperDetail> {
  return put<ExamPaperDetail>(`/teacher/exam-papers/${id}`, payload)
}

/**
 * 删除试卷草稿。
 */
export function deleteExamPaper(id: number): Promise<void> {
  return del<void>(`/teacher/exam-papers/${id}`)
}

/**
 * 发布试卷。
 */
export function publishExamPaper(id: number): Promise<void> {
  return post<void>(`/teacher/exam-papers/${id}/publish`)
}

/**
 * 查看试卷参考结果。
 */
export function listExamResults(
  id: number,
  params: { status?: number; pageNum?: number; pageSize?: number }
): Promise<ExamResultPage> {
  return get<ExamResultPage>(`/teacher/exam-papers/${id}/results`, { params })
}
