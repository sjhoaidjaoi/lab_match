import { MockError } from './auth'
import { mockPublicityList, mockRevertConfirmedPublicity } from './publicity'
import { mockRoundList, mockSetRoundLock } from './basic'
import type {
  ResultGroupBy,
  ResultGroupStat,
  ResultOverview,
  ResultQuery,
  ResultRow,
  RoundLockResp,
  RoundSnapshotItem,
  RoundUnlockResp,
  SnapshotGenerateResp,
  SnapshotType
} from '@/types/archive'

const MOCK_DELAY_MS = 250

export const SNAPSHOT_TYPE_TEXT: Record<number, string> = {
  1: '拟录取名单',
  2: '确认结果',
  3: '调剂结果',
  4: '最终归档'
}

export const ADMISSION_STATUS_TEXT: Record<number, string> = {
  1: '待确认',
  2: '已确认',
  3: '已入组',
  4: '已放弃',
  5: '逾期未确认'
}

export const SOURCE_TYPE_TEXT: Record<number, string> = {
  1: '拟录取',
  2: '递补',
  3: '内部调剂',
  4: '跨室调剂',
  5: '座谈安置'
}

const LAB_QUOTA: Record<number, number> = { 1: 20, 2: 15, 3: 10 }

const MENTOR_QUOTA: Record<number, number> = { 11: 4, 12: 5, 13: 4, 14: 5, 15: 4, 16: 6, 17: 4 }

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

function round(value: number): number {
  return Math.round(value * 100) / 100
}

let snapshots: RoundSnapshotItem[] = [
  {
    id: 3003,
    roundId: 3,
    roundName: '第三轮补录',
    snapshotType: 4,
    snapshotTypeText: SNAPSHOT_TYPE_TEXT[4],
    recordCount: 10,
    version: 1,
    isCurrent: 1,
    operatorName: '系统管理员',
    gmtCreate: '2026-11-09 09:00:00'
  },
  {
    id: 3002,
    roundId: 3,
    roundName: '第三轮补录',
    snapshotType: 2,
    snapshotTypeText: SNAPSHOT_TYPE_TEXT[2],
    recordCount: 9,
    version: 1,
    isCurrent: 1,
    operatorName: '系统管理员',
    gmtCreate: '2026-11-09 08:40:00'
  },
  {
    id: 3001,
    roundId: 3,
    roundName: '第三轮补录',
    snapshotType: 1,
    snapshotTypeText: SNAPSHOT_TYPE_TEXT[1],
    recordCount: 10,
    version: 1,
    isCurrent: 1,
    operatorName: '系统管理员',
    gmtCreate: '2026-11-08 18:00:00'
  },
  {
    id: 2002,
    roundId: 1,
    roundName: '第一轮双选',
    snapshotType: 4,
    snapshotTypeText: SNAPSHOT_TYPE_TEXT[4],
    recordCount: 86,
    version: 2,
    isCurrent: 1,
    operatorName: '系统管理员',
    gmtCreate: '2026-10-25 10:00:00'
  },
  {
    id: 2001,
    roundId: 1,
    roundName: '第一轮双选',
    snapshotType: 4,
    snapshotTypeText: SNAPSHOT_TYPE_TEXT[4],
    recordCount: 84,
    version: 1,
    isCurrent: 0,
    operatorName: '系统管理员',
    gmtCreate: '2026-10-23 17:30:00'
  }
]

const lockTimes: Record<number, string> = {}

type MockResultRow = ResultRow & { roundId: number }

const resultRows: MockResultRow[] = [
  row(3, 9001, 1001, '20220001', '陈爱丽', '软件工程', 1, '人工智能实训室', 11, '李海峰', 88.5, 3, 1, '2026-11-08 20:00:00'),
  row(3, 9002, 1002, '20220002', '王磊', '计算机科学与技术', 2, '大数据实训室', 14, '赵敏', 85, 3, 2, '2026-11-08 20:05:00'),
  row(3, 9003, 1003, '20220003', '刘婷婷', '数据科学', 2, '大数据实训室', 15, '刘洋', 82.5, 3, 1, '2026-11-08 20:10:00'),
  row(3, 9004, 1004, '20220004', '孙浩然', '软件工程', 1, '人工智能实训室', 13, '陈晓', 79, 2, 1, '2026-11-08 20:12:00'),
  row(3, 9005, 1005, '20220005', '周敏', '网络工程', 3, '网络安全实训室', 16, '周涛', 90, 3, 1, '2026-11-08 20:15:00'),
  row(3, 9006, 1006, '20220006', '赵子涵', '软件工程', 1, '人工智能实训室', 12, '王建国', 76.5, 3, 4, '2026-11-08 20:20:00'),
  row(3, 9007, 1007, '20220007', '钱多多', '信息安全', 3, '网络安全实训室', 17, '孙倩', 84, 4, 1, null),
  row(3, 9008, 1008, '20220008', '吴悠', '数据科学', 2, '大数据实训室', 14, '赵敏', 81, 3, 5, '2026-11-08 20:25:00'),
  row(3, 9009, 1009, '20220009', '郑一', '软件工程', 1, '人工智能实训室', 11, '李海峰', 87, 5, 1, null),
  row(3, 9010, 1010, '20220010', '冯雨', '网络工程', 3, '网络安全实训室', 16, '周涛', null, 3, 1, '2026-11-08 20:30:00')
]

function row(
  roundId: number,
  admissionId: number,
  studentId: number,
  studentNo: string,
  studentName: string,
  major: string,
  labId: number,
  labName: string,
  mentorId: number,
  mentorName: string,
  totalScore: number | null,
  status: number,
  sourceType: number,
  confirmTime: string | null
): MockResultRow {
  return {
    roundId,
    admissionId,
    studentId,
    studentNo,
    studentName,
    college: '计算机学院',
    major,
    grade: '2022',
    labId,
    labName,
    mentorId,
    mentorName,
    totalScore,
    status,
    statusText: ADMISSION_STATUS_TEXT[status],
    sourceType,
    sourceTypeText: SOURCE_TYPE_TEXT[sourceType],
    confirmTime
  }
}

async function findRound(roundId: number) {
  const rounds = await mockRoundList()
  const round = rounds.find((item) => item.id === roundId)
  if (!round) {
    throw new MockError(404001, '轮次不存在')
  }
  return round
}

function countByType(roundId: number, snapshotType: SnapshotType): number {
  const rows = resultRows.filter(
    (item) => item.roundId === roundId && item.status !== 4 && item.status !== 5
  )
  if (snapshotType === 1) {
    return rows.filter((item) => item.sourceType === 1).length
  }
  if (snapshotType === 2) {
    return rows.filter((item) => item.status === 2 || item.status === 3).length
  }
  if (snapshotType === 3) {
    return rows.filter((item) => item.sourceType >= 3).length
  }
  return rows.length
}

export async function mockSnapshotList(roundId: number): Promise<RoundSnapshotItem[]> {
  await delay()
  return deepCopy(
    snapshots
      .filter((item) => item.roundId === roundId)
      .sort((a, b) => b.snapshotType - a.snapshotType || b.version - a.version)
  )
}

export async function mockGenerateSnapshot(
  roundId: number,
  snapshotType: SnapshotType
): Promise<SnapshotGenerateResp> {
  await delay()
  const round = await findRound(roundId)
  snapshots
    .filter((item) => item.roundId === roundId && item.snapshotType === snapshotType)
    .forEach((item) => {
      item.isCurrent = 0
    })
  const version = snapshots
    .filter((item) => item.roundId === roundId && item.snapshotType === snapshotType)
    .reduce((max, item) => Math.max(max, item.version), 0) + 1
  const recordCount = countByType(roundId, snapshotType)
  const snapshot: RoundSnapshotItem = {
    id: snapshots.reduce((max, item) => Math.max(max, item.id), 3003) + 1,
    roundId,
    roundName: round.roundName,
    snapshotType,
    snapshotTypeText: SNAPSHOT_TYPE_TEXT[snapshotType],
    recordCount,
    version,
    isCurrent: 1,
    operatorName: '系统管理员',
    gmtCreate: formatTime(new Date())
  }
  snapshots = [snapshot, ...snapshots]
  return { id: snapshot.id, version, recordCount }
}

export async function mockLockRound(roundId: number, reason: string): Promise<RoundLockResp> {
  await delay()
  const round = await findRound(roundId)
  if (!reason.trim()) {
    throw new MockError(400001, '锁定原因不能为空')
  }
  if (round.roundNo !== 3) {
    throw new MockError(400002, '仅最后一轮可锁定批次')
  }
  if (round.locked === 1) {
    throw new MockError(400005, '批次已锁定')
  }
  const finalSnapshot = snapshots.find(
    (item) => item.roundId === roundId && item.snapshotType === 4 && item.isCurrent === 1
  )
  if (!finalSnapshot) {
    throw new MockError(400002, '归档快照未生成，无法锁定')
  }
  const batches = await mockPublicityList()
  const confirmed = batches.some((item) => item.roundId === roundId && item.status === 3)
  if (!confirmed) {
    throw new MockError(400002, '公示未确认，无法锁定')
  }
  await mockSetRoundLock(roundId, 1)
  lockTimes[roundId] = formatTime(new Date())
  return { locked: 1, lockedAt: lockTimes[roundId] }
}

export async function mockUnlockRound(
  roundId: number,
  confirmPassword: string,
  reason: string
): Promise<RoundUnlockResp> {
  await delay()
  const round = await findRound(roundId)
  if (!reason.trim()) {
    throw new MockError(400001, '解锁原因不能为空')
  }
  if (round.locked !== 1) {
    throw new MockError(400005, '批次未锁定')
  }
  if (confirmPassword !== '123456') {
    throw new MockError(401002, '密码校验失败')
  }
  await mockSetRoundLock(roundId, 0)
  await mockRevertConfirmedPublicity(roundId)
  await mockGenerateSnapshot(roundId, 4)
  const unlockedAt = formatTime(new Date())
  return { locked: 0, unlockedAt }
}

function filterRows(query: ResultQuery): ResultRow[] {
  const keyword = query.keyword?.trim()
  return resultRows.filter((item) => {
    if (item.roundId !== query.roundId) {
      return false
    }
    if (query.labId !== undefined && item.labId !== query.labId) {
      return false
    }
    if (query.mentorId !== undefined && item.mentorId !== query.mentorId) {
      return false
    }
    if (query.status !== undefined && item.status !== query.status) {
      return false
    }
    if (keyword && !item.studentNo.includes(keyword) && !item.studentName.includes(keyword)) {
      return false
    }
    return true
  })
}

function buildGroups(rows: ResultRow[], groupBy: ResultGroupBy): ResultGroupStat[] {
  if (groupBy === 'student') {
    return []
  }
  const map = new Map<number, ResultGroupStat>()
  rows.forEach((item) => {
    const key = groupBy === 'lab' ? item.labId : item.mentorId
    const name = groupBy === 'lab' ? item.labName : item.mentorName
    const quota = groupBy === 'lab' ? LAB_QUOTA[item.labId] ?? 0 : MENTOR_QUOTA[item.mentorId] ?? 0
    const group = map.get(key) ?? {
      key,
      name,
      totalQuota: quota,
      admitted: 0,
      enrolled: 0,
      saturationRate: 0
    }
    if (item.status === 2 || item.status === 3) {
      group.admitted += 1
    }
    if (item.status === 3) {
      group.enrolled += 1
    }
    map.set(key, group)
  })
  return Array.from(map.values()).map((group) => ({
    ...group,
    saturationRate: group.totalQuota === 0 ? 0 : round((group.admitted / group.totalQuota) * 100)
  }))
}

export async function mockResultOverview(query: ResultQuery): Promise<ResultOverview> {
  await delay()
  const currentRound = await findRound(query.roundId)
  const rows = filterRows(query)
  const totalQuota = Object.values(LAB_QUOTA).reduce((sum, value) => sum + value, 0)
  const totalAdmitted = rows.filter((item) => item.status === 2 || item.status === 3).length
  const totalConfirmed = rows.filter((item) => item.status === 2).length
  const totalEnrolled = rows.filter((item) => item.status === 3).length
  const start = (query.pageNum - 1) * query.pageSize
  return {
    roundId: query.roundId,
    archived: currentRound.locked,
    totalQuota,
    totalAdmitted,
    totalConfirmed,
    totalEnrolled,
    saturationRate: totalQuota === 0 ? 0 : round((totalAdmitted / totalQuota) * 100),
    groupBy: query.groupBy,
    groups: buildGroups(rows, query.groupBy),
    page: {
      total: rows.length,
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      list: deepCopy(rows.slice(start, start + query.pageSize))
    }
  }
}

export async function mockExportResults(query: ResultQuery): Promise<string> {
  await delay()
  const rows = filterRows(query)
  const header = ['学号', '姓名', '学院', '专业', '年级', '实训室', '导师', '总分', '录取状态', '来源', '确认时间']
  const lines = rows.map((item) => [
    item.studentNo,
    item.studentName,
    item.college,
    item.major,
    item.grade,
    item.labName,
    item.mentorName,
    item.totalScore === null ? '' : item.totalScore.toFixed(2),
    item.statusText,
    item.sourceTypeText,
    item.confirmTime ?? ''
  ])
  return [header, ...lines].map((line) => line.join(',')).join('\r\n')
}
