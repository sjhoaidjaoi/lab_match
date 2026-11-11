import { get } from './request'
import type { PageResult } from '@/types/basic'
import type {
  PublicCurrentRound,
  PublicLabDetail,
  PublicLabListItem,
  PublicLabMentor,
  PublicLabQuery,
  PublicNoticeItem,
  PublicNoticeQuery
} from '@/types/public'

/**
 * 当前轮次与时间窗状态。
 */
export function getCurrentRound(): Promise<PublicCurrentRound> {
  return get<PublicCurrentRound>('/public/rounds/current')
}

/**
 * 公共端实训室列表。
 */
export function listPublicLabs(params: PublicLabQuery): Promise<PageResult<PublicLabListItem>> {
  return get<PageResult<PublicLabListItem>>('/public/labs', { params })
}

/**
 * 公共端实训室详情。
 */
export function getPublicLabDetail(id: number): Promise<PublicLabDetail> {
  return get<PublicLabDetail>(`/public/labs/${id}`)
}

/**
 * 公共端导师详情。
 */
export function getPublicMentor(id: number): Promise<PublicLabMentor> {
  return get<PublicLabMentor>(`/public/mentors/${id}`)
}

/**
 * 公共端公告列表。
 */
export function listPublicNotices(params: PublicNoticeQuery): Promise<PageResult<PublicNoticeItem>> {
  return get<PageResult<PublicNoticeItem>>('/public/notices', { params })
}

/**
 * 公共端公告详情。
 */
export function getPublicNoticeDetail(id: number): Promise<PublicNoticeItem> {
  return get<PublicNoticeItem>(`/public/notices/${id}`)
}
