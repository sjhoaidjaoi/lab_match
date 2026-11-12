import { get, put } from './request'
import type { MentorListItem } from '@/types/basic'

/**
 * 本室导师与名额，面试官选择使用。
 */
export function listLeaderMentors(): Promise<MentorListItem[]> {
  return get<MentorListItem[]>('/leader/mentors')
}

/**
 * 负责人调整本室导师名额，必须填写理由并留痕。
 */
export function adjustLeaderMentorQuota(
  id: number,
  payload: { quota: number; reason: string }
): Promise<void> {
  return put<void>(`/leader/mentors/${id}/quota`, payload)
}
