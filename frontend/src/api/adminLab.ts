import { del, get, post, put } from './request'
import type { LabDetail, LabListItem, LabSaveReq, PageResult } from '@/types/basic'

/**
 * 实训室列表（管理端）。
 */
export function listLabs(params: {
  keyword?: string
  status?: number
  pageNum?: number
  pageSize?: number
}): Promise<PageResult<LabListItem>> {
  return get<PageResult<LabListItem>>('/admin/labs', { params })
}

/**
 * 实训室详情，编辑表单回填使用公共详情接口。
 */
export function getLabDetail(id: number): Promise<LabDetail> {
  return get<LabDetail>(`/public/labs/${id}`)
}

/**
 * 新建实训室。
 */
export function createLab(payload: LabSaveReq): Promise<number> {
  return post<number>('/admin/labs', payload)
}

/**
 * 修改实训室。
 */
export function updateLab(id: number, payload: LabSaveReq): Promise<void> {
  return put<void>(`/admin/labs/${id}`, payload)
}

/**
 * 删除实训室。
 */
export function deleteLab(id: number): Promise<void> {
  return del<void>(`/admin/labs/${id}`)
}

/**
 * 提拔实训室负责人。
 */
export function assignLabLeader(id: number, payload: { userId: number; reason: string }): Promise<void> {
  return put<void>(`/admin/labs/${id}/leader`, payload)
}
