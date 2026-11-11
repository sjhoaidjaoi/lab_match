import { get, post } from './request'
import type { PageResult } from '@/types/basic'
import type {
  InterviewScoreResp,
  InterviewScoreRow,
  InterviewScoreSaveReq
} from '@/types/interview'

/**
 * 本室评分列表。
 */
export function listLeaderScores(params: {
  roundId?: number
  keyword?: string
  status?: number
  pageNum?: number
  pageSize?: number
}): Promise<PageResult<InterviewScoreRow>> {
  return get<PageResult<InterviewScoreRow>>('/leader/scores', { params })
}

/**
 * 录入 / 更新本室学生评分。
 */
export function saveLeaderScore(payload: InterviewScoreSaveReq): Promise<InterviewScoreResp> {
  return post<InterviewScoreResp>('/leader/scores', payload)
}

/**
 * Excel 批量导入评分，列顺序：学号、学习态度、逻辑思维、编程基础、时间投入、评语。
 */
export function importLeaderScores(file: File): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)
  return post<void>('/leader/scores/import', formData)
}
