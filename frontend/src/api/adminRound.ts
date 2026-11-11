import { get, post, put } from './request'
import type { PageResult, RoundListItem, RoundSaveReq } from '@/types/basic'

/**
 * 轮次列表（管理端）。
 */
export async function listRounds(): Promise<RoundListItem[]> {
  const page = await get<PageResult<RoundListItem>>('/admin/rounds', {
    params: { pageNum: 1, pageSize: 100 }
  })
  return page.list
}

/**
 * 新建轮次。
 */
export function createRound(payload: RoundSaveReq): Promise<number> {
  return post<number>('/admin/rounds', payload)
}

/**
 * 修改轮次配置，轮次序号不可修改。
 */
export function updateRound(id: number, payload: Omit<RoundSaveReq, 'roundNo'>): Promise<void> {
  return put<void>(`/admin/rounds/${id}`, payload)
}

/**
 * 开启 / 结束轮次。
 */
export function updateRoundStatus(id: number, status: number): Promise<void> {
  return put<void>(`/admin/rounds/${id}/status`, { status })
}
