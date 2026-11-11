import { get } from './request'
import type { PageResult } from '@/types/basic'
import type { InterviewScoreRow } from '@/types/interview'

/**
 * 本室评分汇总列表，按学生与导师分别展示。
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
