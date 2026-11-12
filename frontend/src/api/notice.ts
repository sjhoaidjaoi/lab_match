import { del, get, post, put } from './request'
import type { PageResult } from '@/types/basic'
import type {
  AdminNotice,
  AdminNoticeQuery,
  NoticeAttachment,
  NoticeItem,
  NoticeQuery,
  NoticeSavePayload,
  UnreadCount
} from '@/types/notice'

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

/**
 * 公告列表（管理端）。
 */
export function listAdminNotices(
  params: AdminNoticeQuery & { pageNum?: number; pageSize?: number }
): Promise<PageResult<AdminNotice>> {
  return get<PageResult<AdminNotice>>('/admin/notices', { params })
}

/**
 * 新建公告。
 */
export function createAdminNotice(payload: NoticeSavePayload): Promise<AdminNotice> {
  return post<AdminNotice>('/admin/notices', payload)
}

/**
 * 编辑公告。
 */
export function updateAdminNotice(id: number, payload: NoticeSavePayload): Promise<void> {
  return put<void>(`/admin/notices/${id}`, payload)
}

/**
 * 发布 / 下线公告。
 */
export function updateAdminNoticeStatus(id: number, status: number): Promise<void> {
  return put<void>(`/admin/notices/${id}/status`, { status })
}

/**
 * 上传公告附件（单文件不超过 10MB）。
 */
export function uploadNoticeAttachment(file: File): Promise<NoticeAttachment> {
  const formData = new FormData()
  formData.append('file', file)
  return post<NoticeAttachment>('/admin/notices/upload', formData)
}

/**
 * 删除公告，已发布公告需先下线。
 */
export function deleteAdminNotice(id: number): Promise<void> {
  return del<void>(`/admin/notices/${id}`)
}
