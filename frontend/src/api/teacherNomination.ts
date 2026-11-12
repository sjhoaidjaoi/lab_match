import { get, post, put } from './request'
import type {
  NominationItem,
  NominationSaveReq,
  NominationSaveResp,
  WaitlistItem,
  WaitlistRankReq
} from '@/types/nomination'

/**
 * 我的拟录取列表。
 */
export function listMyNominations(roundId?: number): Promise<NominationItem[]> {
  return get<NominationItem[]>('/teacher/nominations', {
    params: roundId ? { roundId } : undefined
  })
}

/**
 * 保存 / 提交拟录取名单。
 */
export function saveNomination(payload: NominationSaveReq): Promise<NominationSaveResp> {
  return post<NominationSaveResp>('/teacher/nominations', payload)
}

/**
 * 我的递补名单。
 */
export function listWaitlist(roundId?: number): Promise<WaitlistItem[]> {
  return get<WaitlistItem[]>('/teacher/waitlist', {
    params: roundId ? { roundId } : undefined
  })
}

/**
 * 调整递补顺位。
 */
export function adjustWaitlistRank(payload: WaitlistRankReq): Promise<void> {
  return put<void>('/teacher/waitlist/rank', payload)
}
