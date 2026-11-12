import { get, post } from './request'
import type { ReallocationPool, TakeReallocationResp } from '@/types/reallocation'

/**
 * 全院调剂池列表。
 */
export function getTeacherPool(params?: {
  roundId?: number
  keyword?: string
  pageNum?: number
  pageSize?: number
}): Promise<ReallocationPool> {
  return get<ReallocationPool>('/teacher/reallocation-pool', { params })
}

/**
 * 抢录池内学生。
 */
export function takeStudent(
  studentId: number,
  payload: { reason: string }
): Promise<TakeReallocationResp> {
  return post<TakeReallocationResp>(`/teacher/reallocation-pool/${studentId}/take`, payload)
}
