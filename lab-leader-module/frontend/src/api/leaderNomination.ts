import { get, post, put } from './request'
import type {
  LeaderNominationAdjustReq,
  LeaderNominationDetail,
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

/**
 * 查看某导师拟录取名单与候选学生。
 */
export function getLeaderMentorNominations(
  mentorId: number,
  roundId?: number
): Promise<LeaderNominationDetail> {
  return get<LeaderNominationDetail>(`/leader/nominations/${mentorId}`, {
    params: roundId ? { roundId } : undefined
  })
}

/**
 * 负责人调整某导师拟录取名单。
 */
export function adjustLeaderMentorNominations(
  mentorId: number,
  payload: LeaderNominationAdjustReq
): Promise<unknown> {
  return put<unknown>(`/leader/nominations/${mentorId}`, payload)
}
