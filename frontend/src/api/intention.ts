import { get, post } from './request'
import type { PageResult } from '@/types/basic'
import type {
  AvailableMentor,
  IntentionDetail,
  IntentionSaveReq,
  IntentionSaveResp
} from '@/types/student'

/**
 * 查询当前轮填报，未填报时返回 null。
 */
export function getMyIntention(roundId?: number): Promise<IntentionDetail | null> {
  return get<IntentionDetail | null>('/student/intention', {
    params: roundId ? { roundId } : undefined
  })
}

/**
 * 保存或提交填报。
 */
export function saveMyIntention(payload: IntentionSaveReq): Promise<IntentionSaveResp> {
  return post<IntentionSaveResp>('/student/intention', payload)
}

/**
 * 可选导师列表。
 */
export function listAvailableMentors(params: {
  keyword?: string
  labId?: number
  onlyAvailable?: number
  pageNum?: number
  pageSize?: number
}): Promise<PageResult<AvailableMentor>> {
  return get<PageResult<AvailableMentor>>('/student/mentors/available', { params })
}
