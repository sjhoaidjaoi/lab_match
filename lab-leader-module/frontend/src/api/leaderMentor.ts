import { get } from './request'
import type { MentorListItem } from '@/types/basic'

/**
 * 本室导师与名额，面试官选择使用。
 */
export function listLeaderMentors(): Promise<MentorListItem[]> {
  return get<MentorListItem[]>('/leader/mentors')
}
