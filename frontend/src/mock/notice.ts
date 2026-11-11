import { MockError } from './auth'
import type {
  AdminNotice,
  AdminNoticeQuery,
  NoticeItem,
  NoticeQuery,
  NoticeSavePayload,
  UnreadCount
} from '@/types/notice'

const MOCK_DELAY_MS = 200

export const NOTICE_TYPE_TEXT: Record<number, string> = {
  1: '系统',
  2: '填报',
  3: '面试',
  4: '确认',
  5: '公示',
  6: '异议'
}

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS)
  })
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function formatTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

let seq = 5000

let notices: NoticeItem[] = [
  {
    id: 5003,
    title: '第 2 轮补录拟录取名单公示已发布',
    content: '公示期为 24 小时，如对录取结果有异议，请在公示期内提交异议工单。',
    noticeType: 5,
    noticeTypeText: NOTICE_TYPE_TEXT[5],
    isRead: 0,
    readTime: null,
    gmtCreate: formatTime(new Date(Date.now() - 2 * 60 * 60 * 1000))
  },
  {
    id: 5002,
    title: '你的面试排期已发布',
    content: '第 2 轮补录面试安排已发布，请按排期准时参加。',
    noticeType: 3,
    noticeTypeText: NOTICE_TYPE_TEXT[3],
    isRead: 0,
    readTime: null,
    gmtCreate: formatTime(new Date(Date.now() - 26 * 60 * 60 * 1000))
  },
  {
    id: 5001,
    title: '第 1 轮异议处理结果已回复',
    content: '你提交的「信息登记错误」异议已处理，处理结果：维持原结果。',
    noticeType: 6,
    noticeTypeText: NOTICE_TYPE_TEXT[6],
    isRead: 1,
    readTime: formatTime(new Date(Date.now() - 30 * 60 * 60 * 1000)),
    gmtCreate: formatTime(new Date(Date.now() - 31 * 60 * 60 * 1000))
  },
  {
    id: 5000,
    title: '系统通知：实训室开放日安排',
    content: '各实训室开放日安排已公布，可在首页公告栏查看。',
    noticeType: 1,
    noticeTypeText: NOTICE_TYPE_TEXT[1],
    isRead: 1,
    readTime: null,
    gmtCreate: formatTime(new Date(Date.now() - 72 * 60 * 60 * 1000))
  }
]

export async function mockNoticeList(query: NoticeQuery): Promise<NoticeItem[]> {
  await delay()
  return deepCopy(
    notices.filter((item) => {
      if (query.isRead !== undefined && item.isRead !== query.isRead) {
        return false
      }
      if (query.noticeType !== undefined && item.noticeType !== query.noticeType) {
        return false
      }
      return true
    })
  )
}

export async function mockUnreadCount(): Promise<UnreadCount> {
  await delay()
  return { count: notices.filter((item) => item.isRead === 0).length }
}

export async function mockMarkRead(ids?: number[]): Promise<void> {
  await delay()
  const now = formatTime(new Date())
  notices = notices.map((item) => {
    if (item.isRead === 1) {
      return item
    }
    if (ids && ids.length > 0 && !ids.includes(item.id)) {
      return item
    }
    return { ...item, isRead: 1, readTime: now }
  })
}

export function pushNotice(payload: {
  title: string
  content: string
  noticeType: number
}): void {
  seq += 1
  notices = [
    {
      id: seq,
      title: payload.title,
      content: payload.content,
      noticeType: payload.noticeType,
      noticeTypeText: NOTICE_TYPE_TEXT[payload.noticeType] ?? '通知',
      isRead: 0,
      readTime: null,
      gmtCreate: formatTime(new Date())
    },
    ...notices
  ]
}

export const ANNOUNCEMENT_TYPE_TEXT: Record<number, string> = {
  1: '宣讲',
  2: '开放日',
  3: '公示',
  4: '通知'
}

export const ANNOUNCEMENT_STATUS_TEXT: Record<number, string> = {
  1: '草稿',
  2: '已发布',
  3: '已下线'
}

let announcementSeq = 6000

let adminNotices: AdminNotice[] = [
  {
    id: 6003,
    title: '2026 年实训室进组选拔集中宣讲通知',
    noticeType: 1,
    noticeTypeText: ANNOUNCEMENT_TYPE_TEXT[1],
    content: '宣讲时间：10 月 28 日 19:00；地点：图书馆报告厅。请全体意向学生准时参加。',
    attachmentUrl: '',
    status: 2,
    statusText: ANNOUNCEMENT_STATUS_TEXT[2],
    publishTime: '2026-10-26 10:00:00',
    publisherName: '系统管理员',
    gmtCreate: '2026-10-26 09:40:00'
  },
  {
    id: 6002,
    title: '各实训室开放日安排',
    noticeType: 2,
    noticeTypeText: ANNOUNCEMENT_TYPE_TEXT[2],
    content: '10 月 29 日至 10 月 30 日为实训室开放日，各室开放时段与地点见实训室档案。',
    attachmentUrl: '',
    status: 2,
    statusText: ANNOUNCEMENT_STATUS_TEXT[2],
    publishTime: '2026-10-27 16:00:00',
    publisherName: '系统管理员',
    gmtCreate: '2026-10-27 15:30:00'
  },
  {
    id: 6001,
    title: '第 1 轮拟录取名单公示',
    noticeType: 3,
    noticeTypeText: ANNOUNCEMENT_TYPE_TEXT[3],
    content: '第 1 轮拟录取名单已公示，请前往公示页查看，如有异议请在公示期内提交。',
    attachmentUrl: '',
    status: 2,
    statusText: ANNOUNCEMENT_STATUS_TEXT[2],
    publishTime: '2026-10-20 08:00:00',
    publisherName: '系统管理员',
    gmtCreate: '2026-10-20 07:50:00'
  },
  {
    id: 6000,
    title: '补录轮填报提醒',
    noticeType: 4,
    noticeTypeText: ANNOUNCEMENT_TYPE_TEXT[4],
    content: '未录取学生可在补录轮重新填报 1 个导师意向，请留意系统开放时间。',
    attachmentUrl: '',
    status: 1,
    statusText: ANNOUNCEMENT_STATUS_TEXT[1],
    publishTime: null,
    publisherName: '系统管理员',
    gmtCreate: '2026-10-31 11:00:00'
  }
]

function sortNotices(items: AdminNotice[]): AdminNotice[] {
  return [...items].sort((a, b) => {
    const left = a.publishTime ?? a.gmtCreate
    const right = b.publishTime ?? b.gmtCreate
    return right.localeCompare(left)
  })
}

function findAdminNotice(id: number): AdminNotice {
  const notice = adminNotices.find((item) => item.id === id)
  if (!notice) {
    throw new MockError(404001, '公告不存在')
  }
  return notice
}

function checkNoticePayload(payload: NoticeSavePayload): void {
  if (!payload.title.trim()) {
    throw new MockError(400001, '公告标题不能为空')
  }
  if (!ANNOUNCEMENT_TYPE_TEXT[payload.noticeType]) {
    throw new MockError(400001, '公告类型不合法')
  }
  if (!payload.content.trim()) {
    throw new MockError(400001, '公告正文不能为空')
  }
}

export async function mockAdminNoticeList(query: AdminNoticeQuery): Promise<AdminNotice[]> {
  await delay()
  const keyword = query.keyword?.trim() ?? ''
  return deepCopy(sortNotices(adminNotices.filter((item) => {
    if (keyword && !item.title.includes(keyword)) {
      return false
    }
    if (query.noticeType !== undefined && item.noticeType !== query.noticeType) {
      return false
    }
    if (query.status !== undefined && item.status !== query.status) {
      return false
    }
    return true
  })))
}

export async function mockCreateNotice(payload: NoticeSavePayload): Promise<AdminNotice> {
  await delay()
  checkNoticePayload(payload)
  const status = payload.status ?? 1
  const now = formatTime(new Date())
  announcementSeq += 1
  const notice: AdminNotice = {
    id: announcementSeq,
    title: payload.title.trim(),
    noticeType: payload.noticeType,
    noticeTypeText: ANNOUNCEMENT_TYPE_TEXT[payload.noticeType],
    content: payload.content.trim(),
    attachmentUrl: payload.attachmentUrl ?? '',
    status,
    statusText: ANNOUNCEMENT_STATUS_TEXT[status],
    publishTime: status === 2 ? now : null,
    publisherName: '系统管理员',
    gmtCreate: now
  }
  adminNotices = [notice, ...adminNotices]
  return deepCopy(notice)
}

export async function mockUpdateNotice(id: number, payload: NoticeSavePayload): Promise<void> {
  await delay()
  checkNoticePayload(payload)
  const notice = findAdminNotice(id)
  notice.title = payload.title.trim()
  notice.noticeType = payload.noticeType
  notice.noticeTypeText = ANNOUNCEMENT_TYPE_TEXT[payload.noticeType]
  notice.content = payload.content.trim()
  notice.attachmentUrl = payload.attachmentUrl ?? ''
}

export async function mockUpdateNoticeStatus(id: number, status: number): Promise<void> {
  await delay()
  const notice = findAdminNotice(id)
  if (status === 3 && notice.status !== 2) {
    throw new MockError(400005, '仅已发布公告可下线')
  }
  if (status === 2 && notice.publishTime === null) {
    notice.publishTime = formatTime(new Date())
  }
  notice.status = status
  notice.statusText = ANNOUNCEMENT_STATUS_TEXT[status]
}
