import { get, post, put } from './request'
import type { PageResult } from '@/types/basic'
import type {
  DisputeHandleReq,
  DisputeHandleResp,
  DisputeItem,
  DisputeSubmitReq,
  DisputeSubmitResp,
  PublicityBatch,
  PublicityAdminDetail,
  PublicityConfirmResp,
  PublicityCreateReq,
  PublicityCreateResp,
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

/**
 * 公示批次列表（管理端）。
 */
export function listAdminPublicities(params: {
  roundId?: number
  status?: number
  pageNum?: number
  pageSize?: number
}): Promise<PageResult<PublicityBatch>> {
  return get<PageResult<PublicityBatch>>('/admin/publicities', { params })
}

/**
 * 管理员公示名单明细。
 */
export function getAdminPublicityRows(id: number): Promise<PublicityAdminDetail> {
  return get<PublicityAdminDetail>(`/admin/publicities/${id}/rows`)
}

/**
 * 发起公示。
 */
export function createPublicity(payload: PublicityCreateReq): Promise<PublicityCreateResp> {
  return post<PublicityCreateResp>('/admin/publicities', payload)
}

/**
 * 结束公示。
 */
export function endPublicity(id: number): Promise<void> {
  return put<void>(`/admin/publicities/${id}/end`)
}

/**
 * 确认最终名单。
 */
export function confirmPublicity(id: number): Promise<PublicityConfirmResp> {
  return post<PublicityConfirmResp>(`/admin/publicities/${id}/confirm`)
}

/**
 * 异议工单列表（管理端）。
 */
export function listAdminDisputes(params: {
  status?: number
  publicityId?: number
  pageNum?: number
  pageSize?: number
}): Promise<PageResult<DisputeItem>> {
  return get<PageResult<DisputeItem>>('/admin/disputes', { params })
}

/**
 * 处理异议。
 */
export function handleDispute(id: number, payload: DisputeHandleReq): Promise<DisputeHandleResp> {
  return put<DisputeHandleResp>(`/admin/disputes/${id}/handle`, payload)
}
