import { MockError } from './auth'
import type {
  ConfirmCenter,
  ConfirmCenterItem,
  ConfirmRespondResp,
  LeaderNominationSummary,
  LeaderNominationSubmitResp,
  NominationOverview,
  NominationSaveReq,
  NominationSaveResp,
  WaitlistItem,
  WaitlistRankItem
} from '@/types/nomination'

const MOCK_DELAY_MS = 250
const ROUND_ID = 1

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS)
  })
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

let quota = 4
let quotaUsed = 2
let submitted = false
let candidates: NominationOverview['candidates'] = [
  { studentId: 1001, studentNo: '2022****01', studentName: '陈*丽', totalScore: 85.75, rankNo: 1, nominated: true },
  { studentId: 1002, studentNo: '2022****02', studentName: '张*强', totalScore: 81.25, rankNo: 2, nominated: true },
  { studentId: 1003, studentNo: '2022****03', studentName: '刘*婷', totalScore: 74.25, rankNo: 3, nominated: false },
  { studentId: 1004, studentNo: '2022****04', studentName: '王*磊', totalScore: 72.5, rankNo: 4, nominated: false },
  { studentId: 1005, studentNo: '2022****05', studentName: '赵*敏', totalScore: 70, rankNo: 5, nominated: false }
]

let waitlist: WaitlistItem[] = [
  { id: 1101, rankNo: 1, studentId: 1002, studentNo: '2022****02', studentName: '张*强', totalScore: 81.25, isManual: 0, adjustReason: null, applyStatus: 1, applyStatusText: '待递补' },
  { id: 1102, rankNo: 2, studentId: 1003, studentNo: '2022****03', studentName: '刘*婷', totalScore: 74.25, isManual: 0, adjustReason: null, applyStatus: 1, applyStatusText: '待递补' },
  { id: 1103, rankNo: 3, studentId: 1004, studentNo: '2022****04', studentName: '王*磊', totalScore: 72.5, isManual: 0, adjustReason: null, applyStatus: 1, applyStatusText: '待递补' },
  { id: 1104, rankNo: 4, studentId: 1005, studentNo: '2022****05', studentName: '赵*敏', totalScore: 70, isManual: 0, adjustReason: null, applyStatus: 1, applyStatusText: '待递补' }
]

const leaderSummary: LeaderNominationSummary = {
  labQuota: 20,
  quotaUsed: 8,
  remainQuota: 12,
  conflictCount: 1,
  mentors: [
    { mentorId: 11, mentorName: '李海峰', quota: 4, nominatedCount: 4, submitStatus: 2, submitStatusText: '已提交' },
    { mentorId: 12, mentorName: '王建国', quota: 5, nominatedCount: 3, submitStatus: 2, submitStatusText: '已提交' },
    { mentorId: 13, mentorName: '陈晓', quota: 4, nominatedCount: 2, submitStatus: 1, submitStatusText: '待提交' }
  ],
  conflicts: [
    {
      studentId: 1001,
      studentName: '陈*丽',
      mentorNames: ['李海峰', '王建国'],
      reason: '同一学生被本室 2 名导师拟录取'
    }
  ]
}

let leaderSubmitted = false

const confirmItems: ConfirmCenterItem[] = [
  {
    id: 901,
    admissionId: 901,
    pendingType: 1,
    pendingTypeText: '拟录取多选一',
    labId: 1,
    labName: '人工智能实训室',
    mentorId: 11,
    mentorName: '李海峰',
    sourceType: 1,
    sourceTypeText: '拟录取',
    totalScore: 85.75,
    confirmDeadline: '2026-11-09 23:59:59',
    countdownSeconds: 7200,
    actions: ['ACCEPT', 'REJECT']
  },
  {
    id: 902,
    admissionId: 902,
    pendingType: 2,
    pendingTypeText: '递补待确认',
    labId: 1,
    labName: '人工智能实训室',
    mentorId: 12,
    mentorName: '王建国',
    sourceType: 2,
    sourceTypeText: '递补',
    totalScore: 82,
    confirmDeadline: '2026-11-09 23:59:59',
    countdownSeconds: 1800,
    actions: ['ACCEPT', 'REJECT']
  }
]

let respondedIds: number[] = []

export async function mockNominationOverview(): Promise<NominationOverview> {
  await delay()
  return {
    roundId: ROUND_ID,
    quota,
    quotaUsed,
    remainQuota: quota - quotaUsed,
    submitted,
    candidates: deepCopy(candidates)
  }
}

export async function mockSaveNomination(req: NominationSaveReq): Promise<NominationSaveResp> {
  await delay()
  if (submitted) {
    throw new MockError(409001, '拟录取名单已提交，不可修改')
  }
  if (req.studentIds.length > quota) {
    throw new MockError(400003, `超出个人名额上限（${quota} 人）`)
  }
  candidates = candidates.map((item) => ({
    ...item,
    nominated: req.studentIds.includes(item.studentId)
  }))
  quotaUsed = req.studentIds.length
  submitted = req.submit === 1
  return {
    submittedCount: req.studentIds.length,
    quota,
    quotaUsed,
    remainQuota: quota - quotaUsed
  }
}

export async function mockWaitlist(): Promise<WaitlistItem[]> {
  await delay()
  return deepCopy([...waitlist].sort((a, b) => a.rankNo - b.rankNo))
}

export async function mockSaveWaitlistRank(
  items: WaitlistRankItem[],
  adjustReason: string
): Promise<void> {
  await delay()
  if (!adjustReason.trim()) {
    throw new MockError(400001, '手工调整顺位必须填写理由')
  }
  const ranks = items.map((item) => item.rankNo)
  if (new Set(ranks).size !== ranks.length) {
    throw new MockError(400002, '递补顺位不可重复或并列')
  }
  for (const item of items) {
    const record = waitlist.find((row) => row.id === item.waitlistId)
    if (!record) {
      throw new MockError(404001, '递补记录不存在')
    }
    if (record.applyStatus !== 1) {
      throw new MockError(400005, '仅待递补记录可调整顺位')
    }
    record.rankNo = item.rankNo
    record.isManual = 1
    record.adjustReason = adjustReason
  }
  waitlist = [...waitlist].sort((a, b) => a.rankNo - b.rankNo)
}

export async function mockLeaderNominationSummary(): Promise<LeaderNominationSummary> {
  await delay()
  return deepCopy(leaderSummary)
}

export async function mockSubmitLeaderNominations(): Promise<LeaderNominationSubmitResp> {
  await delay()
  if (leaderSubmitted) {
    throw new MockError(409001, '本室名单已提交，不可重复提交')
  }
  leaderSubmitted = true
  return { admissionCount: 8, conflictCount: leaderSummary.conflictCount }
}

export async function mockConfirmCenter(): Promise<ConfirmCenter> {
  await delay()
  const items = confirmItems
    .filter((item) => !respondedIds.includes(item.id))
    .map((item) => deepCopy(item))
  return { total: items.length, items }
}

export async function mockRespond(
  admissionId: number,
  action: 'ACCEPT' | 'REJECT'
): Promise<ConfirmRespondResp> {
  await delay()
  if (respondedIds.includes(admissionId)) {
    throw new MockError(400005, '本轮已有录取去向，不可重复确认')
  }
  const target = confirmItems.find((item) => item.id === admissionId)
  if (!target) {
    throw new MockError(403001, '无权操作他人的待确认记录')
  }
  if (action === 'ACCEPT') {
    respondedIds = confirmItems.map((item) => item.id)
    return { id: admissionId, status: 2 }
  }
  respondedIds = [...respondedIds, admissionId]
  return { id: admissionId, status: 4 }
}
