import { http } from './request'
import type { NotificationItem, PageResult } from '@/types'

export const notificationApi = {
  mine: (page = 1, size = 20) =>
    http.get<PageResult<NotificationItem>>('/notifications/mine', { page, size }),
  read: (id: number) => http.post<void>(`/notifications/${id}/read`),
  readAll: () => http.post<void>('/notifications/read-all')
}
