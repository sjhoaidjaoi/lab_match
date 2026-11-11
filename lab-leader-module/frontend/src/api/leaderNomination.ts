import { get, post } from './request'
import type {
  LeaderNominationSubmitResp,
  LeaderNominationSummary
} from '@/types/nomination'

/**
 * 本室拟录取汇总。
 */
export function getLeaderNominationSummary(roundId?: number): Promise<LeaderNominationSummary> {
  return get<LeaderNominationSummary>('/leader/nominations', {
    params: roundId ? { roundId } : undefined
  })
}

/**
 * 提交本室拟录取名单至学院。
 */
export function submitLeaderNominations(roundId: number): Promise<LeaderNominationSubmitResp> {
  return post<LeaderNominationSubmitResp>('/leader/nominations/submit', { roundId })
}
