import { get, put } from './request'
import type { LeaderWaitlistItem, LeaderWaitlistRankReq } from '@/types/nomination'

/**
 * 本室全部导师的递补名单。
 */
export function listLeaderWaitlist(roundId?: number): Promise<LeaderWaitlistItem[]> {
  return get<LeaderWaitlistItem[]>('/leader/waitlist', {
    params: roundId ? { roundId } : undefined
  })
}

/**
 * 负责人调整本室递补顺位。
 */
export function adjustLeaderWaitlistRank(payload: LeaderWaitlistRankReq): Promise<void> {
  return put<void>('/leader/waitlist/rank', payload)
}
