import { get, post } from './request'
import type { PageResult } from '@/types/basic'
import type {
  LeaderReallocationReq,
  LeaderReallocationResp,
  ReallocationCandidate
} from '@/types/reallocation'

/**
 * 本室内部调剂候选。
 */
export function listLeaderCandidates(params: {
  roundId?: number
  pageNum?: number
  pageSize?: number
}): Promise<PageResult<ReallocationCandidate>> {
  return get<PageResult<ReallocationCandidate>>('/leader/reallocation/candidates', { params })
}

/**
 * 执行本室内部调剂，结果直接生效。
 */
export function reallocateInner(payload: LeaderReallocationReq): Promise<LeaderReallocationResp> {
  return post<LeaderReallocationResp>('/leader/reallocation', payload)
}
