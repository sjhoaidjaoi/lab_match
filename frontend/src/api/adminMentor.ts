import { get, put } from './request'
import type { MentorListItem, PageResult } from '@/types/basic'

/**
 * 教师账号列表（管理端）。
 */
export function listMentors(params: {
  labId?: number
  keyword?: string
  status?: number
  pageNum?: number
  pageSize?: number
}): Promise<PageResult<MentorListItem>> {
  return get<PageResult<MentorListItem>>('/admin/mentors', { params })
}

/**
 * 启用 / 禁用教师账号。
 */
export function updateMentorStatus(id: number, status: number): Promise<void> {
  return put<void>(`/admin/mentors/${id}/status`, { status })
}

/**
 * 管理员强制调整导师名额，必须填写理由并留痕。
 */
export function forceAdjustMentorQuota(
  id: number,
  payload: { quota: number; reason: string }
): Promise<void> {
  return put<void>(`/admin/mentors/${id}/quota`, payload)
}
