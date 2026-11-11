import { get, post } from './request'
import type { PageResult } from '@/types/basic'
import type {
  AdminReallocationReq,
  AdminReallocationResp,
  ReallocationCandidate
} from '@/types/reallocation'

/**
 * 三级调剂候选列表。
 */
export function listAdminCandidates(params: {
  roundId?: number
  level: number
  pageNum?: number
  pageSize?: number
}): Promise<PageResult<ReallocationCandidate>> {
  return get<PageResult<ReallocationCandidate>>('/admin/reallocation/candidates', { params })
}

/**
 * 执行调剂，支持批量提交并逐条返回失败原因。
 */
export function adminReallocate(payload: AdminReallocationReq): Promise<AdminReallocationResp> {
  return post<AdminReallocationResp>('/admin/reallocation', payload)
}
