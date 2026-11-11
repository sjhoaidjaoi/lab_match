import { get, put } from './request'
import type { PageResult } from '@/types/basic'
import type { NoticeItem, NoticeQuery, UnreadCount } from '@/types/notice'

/**
 * 我的通知列表。
 */
export function listMyNotices(
  params: NoticeQuery & { pageNum?: number; pageSize?: number }
): Promise<PageResult<NoticeItem>> {
  return get<PageResult<NoticeItem>>('/student/notices', { params })
}

/**
 * 未读通知数量。
 */
export function getUnreadCount(): Promise<UnreadCount> {
  return get<UnreadCount>('/student/notices/unread-count')
}

/**
 * 标记通知已读，ids 为空表示全部。
 */
export function markNoticesRead(ids?: number[]): Promise<void> {
  return put<void>('/student/notices/read', ids && ids.length > 0 ? { ids } : {})
}
