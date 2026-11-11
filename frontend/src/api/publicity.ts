import { get, post } from './request'
import type { PageResult } from '@/types/basic'
import type {
  DisputeItem,
  DisputeSubmitReq,
  DisputeSubmitResp,
  PublicityDetail
} from '@/types/publicity'

/**
 * 学生端公示名单，本人完整、他人脱敏。
 */
export function getPublicityDetail(id: number): Promise<PublicityDetail> {
  return get<PublicityDetail>(`/student/publicity/${id}`)
}

/**
 * 提交异议工单。
 */
export function submitDispute(payload: DisputeSubmitReq): Promise<DisputeSubmitResp> {
  return post<DisputeSubmitResp>('/student/disputes', payload)
}

/**
 * 我的异议列表。
 */
export function listMyDisputes(): Promise<PageResult<DisputeItem>> {
  return get<PageResult<DisputeItem>>('/student/disputes', {
    params: { pageNum: 1, pageSize: 100 }
  })
}
