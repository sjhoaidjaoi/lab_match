import { MockError } from './auth'
import { pushNotice } from './notice'
import type {
  DisputeHandleReq,
  DisputeHandleResp,
  DisputeItem,
  DisputeSubmitReq,
  DisputeSubmitResp,
  PublicityBatch,
  PublicityConfirmResp,
  PublicityCreateReq,
  PublicityCreateResp,
  PublicityDetail,
  PublicityRow
} from '@/types/publicity'

const MOCK_DELAY_MS = 250

export const DISPUTE_TYPE_TEXT: Record<number, string> = {
  1: '录取结果有误',
  2: '名额分配不公',
  3: '信息登记错误',
  4: '其他'
}

export const DISPUTE_STATUS_TEXT: Record<number, string> = {
  1: '待处理',
  2: '处理中',
  3: '已回复',
  4: '已关闭'
}

export const HANDLE_RESULT_TEXT: Record<number, string> = {
  1: '维持原结果',
  2: '调整录取',
  3: '退回重审'
}

const CURRENT_STUDENT = { id: 1001, userNo: '20220001', realName: '陈爱丽' }

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

function maskUserNo(value: string): string {
  return value.length > 4 ? `${value.slice(0, 4)}****${value.slice(-2)}` : '*'.repeat(value.length)
}

function maskName(value: string): string {
  if (value.length <= 1) {
    return '*'
  }
  return value.length === 2 ? `${value.slice(0, 1)}*` : `${value.slice(0, 1)}*${value.slice(-1)}`
}

interface RawPublicityRow {
  studentId: number
  studentNo: string
  studentName: string
  labName: string
  mentorName: string
}

const rawRows: RawPublicityRow[] = [
  { studentId: 1001, studentNo: '20220001', studentName: '陈爱丽', labName: '人工智能实训室', mentorName: '李海峰' },
  { studentId: 1002, studentNo: '20220002', studentName: '王磊', labName: '智能制造实训室', mentorName: '赵明' },
  { studentId: 1003, studentNo: '20220003', studentName: '刘婷婷', labName: '大数据实训室', mentorName: '赵敏' },
  { studentId: 1004, studentNo: '20220004', studentName: '孙浩然', labName: '人工智能实训室', mentorName: '陈晓' },
  { studentId: 1005, studentNo: '20220005', studentName: '周敏', labName: '网络安全实训室', mentorName: '周涛' }
]

let batches: PublicityBatch[] = [
  {
    id: 1301,
    roundId: 2,
    roundName: '第 2 轮补录',
    title: '第 2 轮补录拟录取名单公示',
    startTime: formatTime(new Date(Date.now() - 2 * 60 * 60 * 1000)),
    endTime: formatTime(new Date(Date.now() + 22 * 60 * 60 * 1000)),
    status: 1,
    statusText: '进行中',
    admissionCount: rawRows.length,
    disputeCount: 1,
    pendingDisputeCount: 1,
    remainSeconds: 22 * 60 * 60
  },
  {
    id: 1201,
    roundId: 1,
    roundName: '第 1 轮',
    title: '第 1 轮拟录取名单公示',
    startTime: '2026-10-20 08:00:00',
    endTime: '2026-10-21 08:00:00',
    status: 3,
    statusText: '已确认',
    admissionCount: 86,
    disputeCount: 3,
    pendingDisputeCount: 0,
    remainSeconds: 0
  },
  {
    id: 1101,
    roundId: 3,
    roundName: '第 3 轮补录',
    title: '第 3 轮补录拟录取名单公示',
    startTime: '2026-11-08 08:00:00',
    endTime: '2026-11-09 08:00:00',
    status: 3,
    statusText: '已确认',
    admissionCount: 10,
    disputeCount: 0,
    pendingDisputeCount: 0,
    remainSeconds: 0
  }
]

let disputes: DisputeItem[] = [
  {
    id: 1201,
    disputeNo: 'D20261105001',
    publicityId: 1301,
    publicityTitle: '第 2 轮补录拟录取名单公示',
    studentId: 1002,
    studentNo: '20220002',
    studentName: '王磊',
    disputeType: 2,
    disputeTypeText: DISPUTE_TYPE_TEXT[2],
    content: '同专业同学分数低于我却进入目标实训室，希望核查名额分配依据。',
    attachments: [],
    status: 1,
    statusText: DISPUTE_STATUS_TEXT[1],
    handleResult: null,
    handleResultText: '',
    handleOpinion: '',
    handlerId: null,
    handlerName: '',
    handleTime: null,
    gmtCreate: formatTime(new Date(Date.now() - 60 * 60 * 1000))
  },
  {
    id: 1200,
    disputeNo: 'D20261020001',
    publicityId: 1201,
    publicityTitle: '第 1 轮拟录取名单公示',
    studentId: 1001,
    studentNo: '20220001',
    studentName: '陈爱丽',
    disputeType: 3,
    disputeTypeText: DISPUTE_TYPE_TEXT[3],
    content: '名单中学号末位登记有误，实际学号为 20220001。',
    attachments: ['/mock/attachment-student-no.png'],
    status: 3,
    statusText: DISPUTE_STATUS_TEXT[3],
    handleResult: 1,
    handleResultText: HANDLE_RESULT_TEXT[1],
    handleOpinion: '经核对学籍库，名单学号与学籍一致，维持原结果。',
    handlerId: 9001,
    handlerName: '系统管理员',
    handleTime: '2026-10-20 16:20:00',
    gmtCreate: '2026-10-20 09:10:00'
  }
]

function nextDisputeNo(id: number): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `D${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${String(id).padStart(3, '0')}`
}

function studentRows(): PublicityRow[] {
  return rawRows.map((row) => ({
    studentNo: row.studentId === CURRENT_STUDENT.id ? row.studentNo : maskUserNo(row.studentNo),
    studentName: row.studentId === CURRENT_STUDENT.id ? row.studentName : maskName(row.studentName),
    labName: row.labName,
    mentorName: row.mentorName,
    isSelf: row.studentId === CURRENT_STUDENT.id ? 1 : 0
  }))
}

function adminRows(): PublicityRow[] {
  return rawRows.map((row) => ({
    studentNo: row.studentNo,
    studentName: row.studentName,
    labName: row.labName,
    mentorName: row.mentorName,
    isSelf: row.studentId === CURRENT_STUDENT.id ? 1 : 0
  }))
}

function findBatch(id: number): PublicityBatch {
  const batch = batches.find((item) => item.id === id)
  if (!batch) {
    throw new MockError(404001, '公示批次不存在')
  }
  return batch
}

export async function mockPublicityList(): Promise<PublicityBatch[]> {
  await delay()
  return deepCopy(batches)
}

export async function mockPublicityDetail(id: number): Promise<PublicityDetail> {
  await delay()
  const batch = findBatch(id)
  const now = Date.now()
  const start = new Date(batch.startTime.replace(' ', 'T')).getTime()
  const end = new Date(batch.endTime.replace(' ', 'T')).getTime()
  return {
    id: batch.id,
    title: batch.title,
    startTime: batch.startTime,
    endTime: batch.endTime,
    status: batch.status,
    canDispute: batch.status === 1 && now >= start && now <= end ? 1 : 0,
    list: studentRows()
  }
}

export async function mockAdminPublicityRows(id: number): Promise<PublicityRow[]> {
  await delay()
  findBatch(id)
  return adminRows()
}

export async function mockCreatePublicity(req: PublicityCreateReq): Promise<PublicityCreateResp> {
  await delay()
  if (!req.title.trim()) {
    throw new MockError(400001, '公示标题不能为空')
  }
  if (req.durationHours < 1) {
    throw new MockError(400001, '公示时长至少 1 小时')
  }
  if (batches.some((item) => item.status === 1)) {
    throw new MockError(409001, '当前已有进行中的公示')
  }
  const start = new Date()
  const end = new Date(start.getTime() + req.durationHours * 60 * 60 * 1000)
  const batch: PublicityBatch = {
    id: Date.now(),
    roundId: req.roundId,
    roundName: req.roundId === 2 ? '第 2 轮补录' : `第 ${req.roundId} 轮`,
    title: req.title,
    startTime: formatTime(start),
    endTime: formatTime(end),
    status: 1,
    statusText: '进行中',
    admissionCount: rawRows.length,
    disputeCount: 0,
    pendingDisputeCount: 0,
    remainSeconds: req.durationHours * 60 * 60
  }
  batches = [batch, ...batches]
  pushNotice({
    title: `${batch.title}已发布`,
    content: '公示期内如对录取结果有异议，可在公示页提交异议工单。',
    noticeType: 5
  })
  return {
    id: batch.id,
    startTime: batch.startTime,
    endTime: batch.endTime,
    admissionCount: batch.admissionCount,
    status: batch.status
  }
}

export async function mockEndPublicity(id: number): Promise<void> {
  await delay()
  const batch = findBatch(id)
  if (batch.status !== 1) {
    throw new MockError(400005, '当前公示不在进行中')
  }
  batch.status = 2
  batch.statusText = '已结束'
  batch.endTime = formatTime(new Date())
  batch.remainSeconds = 0
}

export async function mockConfirmPublicity(id: number): Promise<PublicityConfirmResp> {
  await delay()
  const batch = findBatch(id)
  if (batch.status !== 2) {
    throw new MockError(400005, '请先结束公示')
  }
  if (batch.pendingDisputeCount > 0) {
    throw new MockError(400005, `仍有 ${batch.pendingDisputeCount} 条异议未处理，无法确认`)
  }
  batch.status = 3
  batch.statusText = '已确认'
  return { confirmedCount: batch.admissionCount, status: batch.status }
}

export async function mockRevertConfirmedPublicity(roundId: number): Promise<void> {
  const batch = batches.find((item) => item.roundId === roundId && item.status === 3)
  if (!batch) {
    return
  }
  batch.status = 1
  batch.statusText = '进行中'
  batch.endTime = formatTime(new Date(Date.now() + 24 * 60 * 60 * 1000))
  batch.remainSeconds = 24 * 60 * 60
}

export async function mockMyDisputes(): Promise<DisputeItem[]> {
  await delay()
  return deepCopy(disputes.filter((item) => item.studentId === CURRENT_STUDENT.id))
}

export async function mockSubmitDispute(req: DisputeSubmitReq): Promise<DisputeSubmitResp> {
  await delay()
  const batch = findBatch(req.publicityId)
  const now = new Date()
  const start = new Date(batch.startTime.replace(' ', 'T'))
  const end = new Date(batch.endTime.replace(' ', 'T'))
  if (batch.status !== 1 || now < start || now > end) {
    throw new MockError(400004, '公示已结束，无法提交异议')
  }
  if (disputes.some((item) =>
    item.publicityId === req.publicityId &&
    item.studentId === CURRENT_STUDENT.id &&
    (item.status === 1 || item.status === 2)
  )) {
    throw new MockError(409001, '你已提交过异议，请等待处理')
  }
  if (req.content.trim().length === 0 || req.content.length > 500) {
    throw new MockError(400001, '异议说明最长 500 字')
  }
  if (req.attachments.length > 3 || req.attachments.join('').length > 1000) {
    throw new MockError(400001, '附件最多 3 个且地址合计不超过 1000 字符')
  }
  const id = disputes.reduce((max, item) => Math.max(max, item.id), 1201) + 1
  const dispute: DisputeItem = {
    id,
    disputeNo: nextDisputeNo(id),
    publicityId: batch.id,
    publicityTitle: batch.title,
    studentId: CURRENT_STUDENT.id,
    studentNo: CURRENT_STUDENT.userNo,
    studentName: CURRENT_STUDENT.realName,
    disputeType: req.disputeType,
    disputeTypeText: DISPUTE_TYPE_TEXT[req.disputeType],
    content: req.content.trim(),
    attachments: [...req.attachments],
    status: 1,
    statusText: DISPUTE_STATUS_TEXT[1],
    handleResult: null,
    handleResultText: '',
    handleOpinion: '',
    handlerId: null,
    handlerName: '',
    handleTime: null,
    gmtCreate: formatTime(now)
  }
  disputes = [dispute, ...disputes]
  batch.disputeCount += 1
  batch.pendingDisputeCount += 1
  return { id: dispute.id, status: dispute.status }
}

export async function mockAdminDisputes(status?: number): Promise<DisputeItem[]> {
  await delay()
  return deepCopy(disputes.filter((item) => status === undefined || item.status === status))
}

export async function mockHandleDispute(id: number, req: DisputeHandleReq): Promise<DisputeHandleResp> {
  await delay()
  const dispute = disputes.find((item) => item.id === id)
  if (!dispute) {
    throw new MockError(404001, '异议工单不存在')
  }
  if (dispute.status !== 1 && dispute.status !== 2) {
    throw new MockError(409001, '该工单已处理')
  }
  if (!req.handleOpinion.trim()) {
    throw new MockError(400001, '处理意见不能为空')
  }
  if (req.handleResult === 2 && !req.adjustMentorId) {
    throw new MockError(400001, '调整录取时必须选择目标导师')
  }
  const handleTime = formatTime(new Date())
  dispute.status = 3
  dispute.statusText = DISPUTE_STATUS_TEXT[3]
  dispute.handleResult = req.handleResult
  dispute.handleResultText = HANDLE_RESULT_TEXT[req.handleResult]
  dispute.handleOpinion = req.handleOpinion.trim()
  dispute.handlerId = 9001
  dispute.handlerName = '系统管理员'
  dispute.handleTime = handleTime
  const batch = batches.find((item) => item.id === dispute.publicityId)
  if (batch && batch.pendingDisputeCount > 0) {
    batch.pendingDisputeCount -= 1
  }
  pushNotice({
    title: '你的异议工单已回复',
    content: `工单 ${dispute.disputeNo} 处理结果：${dispute.handleResultText}。`,
    noticeType: 6
  })
  return { id: dispute.id, status: dispute.status, handleTime }
}
