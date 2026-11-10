import { http } from './request'
import type { AnnouncementItem, NoticeItem } from '@/types'

export const announcementsApi = {
  list: () => http.get<AnnouncementItem[]>('/announcements'),
  create: (title: string, content?: string) => http.post<AnnouncementItem>('/announcements', { title, content }),
  update: (id: number, data: Partial<AnnouncementItem>) => http.put<AnnouncementItem>(`/announcements/${id}`, data),
  delete: (id: number) => http.delete<void>(`/announcements/${id}`)
}

export const notificationsApi = {
  mine: () => http.get<NoticeItem[]>('/notifications/my'),
  send: (title: string, content?: string, targetRole?: string) =>
    http.post<NoticeItem>('/notifications', { title, content, targetRole }),
  markRead: (id: number) => http.post<NoticeItem>(`/notifications/${id}/read`)
}
