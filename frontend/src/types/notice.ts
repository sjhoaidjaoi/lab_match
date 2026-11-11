export interface NoticeItem {
  id: number
  title: string
  content: string
  noticeType: number
  noticeTypeText: string
  bizType?: string | null
  bizId?: number | null
  isRead: number
  readTime: string | null
  gmtCreate: string
}

export interface NoticeQuery {
  isRead?: number
  noticeType?: number
}

export interface UnreadCount {
  count: number
}

export interface AdminNotice {
  id: number
  title: string
  noticeType: number
  noticeTypeText: string
  content: string
  attachmentUrl: string
  status: number
  statusText: string
  publishTime: string | null
  publisherName: string
  gmtCreate: string
}

export interface AdminNoticeQuery {
  keyword?: string
  noticeType?: number
  status?: number
}

export interface NoticeSavePayload {
  title: string
  noticeType: number
  content: string
  attachmentUrl?: string
  status?: number
}

export interface NoticeAttachment {
  fileName: string
  url: string
}
