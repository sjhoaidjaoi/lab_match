import { get, post } from './request'
import type {
  InterviewScoreResp,
  InterviewScoreSaveReq,
  ScoreImportResult,
  TeacherScoreDetail
} from '@/types/interview'

/**
 * 查看本人对某学生的评分。
 */
export function getTeacherScore(studentId: number, roundId?: number): Promise<TeacherScoreDetail | null> {
  return get<TeacherScoreDetail | null>(`/teacher/scores/${studentId}`, {
    params: roundId ? { roundId } : undefined
  })
}

/**
 * 导师录入 / 更新本人评分。
 */
export function saveTeacherScore(payload: InterviewScoreSaveReq): Promise<InterviewScoreResp> {
  return post<InterviewScoreResp>('/teacher/scores', payload)
}

/**
 * 导师 Excel 批量导入本人评分，列顺序：学号、学习态度、逻辑思维、编程基础、时间投入、评语。
 */
export function importTeacherScores(file: File): Promise<ScoreImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  return post<ScoreImportResult>('/teacher/scores/import', formData)
}
