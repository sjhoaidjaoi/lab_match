import { get } from './request'
import type { PageResult } from '@/types/basic'
import type { SupplementMentor } from '@/types/reallocation'

/**
 * 补录可选导师，仅返回仍有剩余名额的导师。
 */
export function listSupplementMentors(): Promise<PageResult<SupplementMentor>> {
  return get<PageResult<SupplementMentor>>('/student/supplement/mentors')
}
