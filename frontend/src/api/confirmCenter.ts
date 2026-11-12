import { get, post } from './request'
import type { ConfirmCenter, ConfirmRespondReq, ConfirmRespondResp } from '@/types/nomination'

/**
 * 录取待确认中心。
 */
export function getConfirmCenter(): Promise<ConfirmCenter> {
  return get<ConfirmCenter>('/student/confirm-center')
}

/**
 * 接受或拒绝待确认录取。
 */
export function respondConfirm(
  id: number,
  payload: ConfirmRespondReq
): Promise<ConfirmRespondResp> {
  return post<ConfirmRespondResp>(`/student/confirm-center/${id}/respond`, payload)
}
