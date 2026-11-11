import { MockError } from './auth'
import type {
  LabListItem,
  LabSaveReq,
  MentorListItem,
  RoundListItem,
  RoundSaveReq
} from '@/types/basic'

const MOCK_DELAY_MS = 250

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS)
  })
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

let labs: LabListItem[] = [
  {
    id: 1,
    labCode: 'LAB-AI-01',
    labName: '人工智能实训室',
    leaderName: '王建国',
    mentorCount: 5,
    totalQuota: 20,
    quotaUsed: 8,
    remainQuota: 12,
    researchDirection: '计算机视觉、大模型应用',
    openDayDate: '2026-10-29',
    status: 1
  },
  {
    id: 2,
    labCode: 'LAB-BD-01',
    labName: '大数据实训室',
    leaderName: '赵敏',
    mentorCount: 4,
    totalQuota: 15,
    quotaUsed: 5,
    remainQuota: 10,
    researchDirection: '数据挖掘、实时计算',
    openDayDate: '2026-10-30',
    status: 1
  },
  {
    id: 3,
    labCode: 'LAB-SEC-01',
    labName: '网络安全实训室',
    leaderName: '周涛',
    mentorCount: 3,
    totalQuota: 10,
    quotaUsed: 10,
    remainQuota: 0,
    researchDirection: '攻防演练、密码学',
    openDayDate: '2026-10-31',
    status: 1
  }
]

let mentors: MentorListItem[] = [
  {
    id: 11,
    userId: 2001,
    userNo: '20010001',
    realName: '李海峰',
    labId: 1,
    labName: '人工智能实训室',
    title: '副教授',
    researchDirection: '多模态大模型',
    quota: 4,
    quotaUsed: 2,
    remainQuota: 2,
    status: 1,
    accountStatus: 1
  },
  {
    id: 12,
    userId: 2002,
    userNo: '20010002',
    realName: '王建国',
    labId: 1,
    labName: '人工智能实训室',
    title: '教授',
    researchDirection: '计算机视觉',
    quota: 5,
    quotaUsed: 3,
    remainQuota: 2,
    status: 1,
    accountStatus: 1
  },
  {
    id: 13,
    userId: 2003,
    userNo: '20010003',
    realName: '陈晓',
    labId: 1,
    labName: '人工智能实训室',
    title: '讲师',
    researchDirection: '大模型应用',
    quota: 4,
    quotaUsed: 2,
    remainQuota: 2,
    status: 1,
    accountStatus: 1
  },
  {
    id: 14,
    userId: 2004,
    userNo: '20010004',
    realName: '赵敏',
    labId: 2,
    labName: '大数据实训室',
    title: '教授',
    researchDirection: '数据挖掘',
    quota: 5,
    quotaUsed: 3,
    remainQuota: 2,
    status: 1,
    accountStatus: 1
  },
  {
    id: 15,
    userId: 2005,
    userNo: '20010005',
    realName: '刘洋',
    labId: 2,
    labName: '大数据实训室',
    title: '副教授',
    researchDirection: '实时计算',
    quota: 4,
    quotaUsed: 2,
    remainQuota: 2,
    status: 1,
    accountStatus: 1
  },
  {
    id: 16,
    userId: 2006,
    userNo: '20010006',
    realName: '周涛',
    labId: 3,
    labName: '网络安全实训室',
    title: '教授',
    researchDirection: '网络攻防',
    quota: 6,
    quotaUsed: 6,
    remainQuota: 0,
    status: 1,
    accountStatus: 1
  },
  {
    id: 17,
    userId: 2007,
    userNo: '20010007',
    realName: '孙倩',
    labId: 3,
    labName: '网络安全实训室',
    title: '讲师',
    researchDirection: '密码学',
    quota: 4,
    quotaUsed: 4,
    remainQuota: 0,
    status: 1,
    accountStatus: 1
  }
]

let rounds: RoundListItem[] = [
  {
    id: 1,
    roundNo: 1,
    roundName: '第一轮双选',
    status: 5,
    statusText: '已完成',
    applyStart: '2026-10-20 08:00:00',
    applyEnd: '2026-10-20 12:00:00',
    interviewStart: '2026-10-20 12:00:00',
    interviewEnd: '2026-10-21 17:00:00',
    nominationStart: '2026-10-21 17:00:00',
    nominationSubmitEnd: '2026-10-22 07:00:00',
    confirmStart: '2026-10-22 08:00:00',
    nominationEnd: '2026-10-22 12:00:00',
    adjustStart: '2026-10-23 08:00:00',
    adjustEnd: '2026-10-23 12:00:00',
    weightAttitude: 25,
    weightLogic: 25,
    weightProgramming: 25,
    weightTime: 25,
    locked: 0
  },
  {
    id: 2,
    roundNo: 2,
    roundName: '第二轮补录',
    status: 1,
    statusText: '未开始',
    applyStart: '2026-11-10 08:00:00',
    applyEnd: '2026-11-10 12:00:00',
    interviewStart: '2026-11-10 12:00:00',
    interviewEnd: '2026-11-11 17:00:00',
    nominationStart: '2026-11-11 17:00:00',
    nominationSubmitEnd: '2026-11-12 07:00:00',
    confirmStart: '2026-11-12 08:00:00',
    nominationEnd: '2026-11-12 12:00:00',
    adjustStart: '2026-11-13 08:00:00',
    adjustEnd: '2026-11-13 12:00:00',
    weightAttitude: 25,
    weightLogic: 25,
    weightProgramming: 25,
    weightTime: 25,
    locked: 0
  },
  {
    id: 3,
    roundNo: 3,
    roundName: '第三轮补录',
    status: 5,
    statusText: '已完成',
    applyStart: '2026-11-20 08:00:00',
    applyEnd: '2026-11-20 12:00:00',
    interviewStart: '2026-11-20 12:00:00',
    interviewEnd: '2026-11-21 17:00:00',
    nominationStart: '2026-11-21 17:00:00',
    nominationSubmitEnd: '2026-11-22 07:00:00',
    confirmStart: '2026-11-22 08:00:00',
    nominationEnd: '2026-11-22 12:00:00',
    adjustStart: '2026-11-23 08:00:00',
    adjustEnd: '2026-11-23 12:00:00',
    weightAttitude: 25,
    weightLogic: 25,
    weightProgramming: 25,
    weightTime: 25,
    locked: 0
  }
]

const roundStatusText: Record<number, string> = {
  1: '未开始',
  2: '填报中',
  3: '面试中',
  4: '拟录取确认中',
  5: '已完成'
}

export async function mockLabList(): Promise<LabListItem[]> {
  await delay()
  return deepCopy(labs)
}

export async function mockLabDetail(id: number): Promise<LabSaveReq> {
  await delay()
  const lab = labs.find((item) => item.id === id)
  if (!lab) {
    throw new MockError(404001, '实训室不存在')
  }
  return {
    labCode: lab.labCode,
    labName: lab.labName,
    introduction: '面向实训项目的校级重点实训室',
    researchDirection: lab.researchDirection ?? '',
    equipmentEnv: '独立工位与项目开发环境',
    trainingPlan: '每期 16 周，每周投入不少于 10 小时',
    assessmentRequirement: '中期答辩 + 结项验收',
    openDayDate: lab.openDayDate ?? '',
    openDayStartTime: '14:00',
    openDayEndTime: '17:00',
    openDayLocation: '实验楼 A301',
    openDayNote: '需携带学生证',
    totalQuota: lab.totalQuota,
    status: lab.status
  }
}

export async function mockSaveLab(payload: LabSaveReq, id?: number): Promise<void> {
  await delay()
  if (id) {
    const lab = labs.find((item) => item.id === id)
    if (!lab) {
      throw new MockError(404001, '实训室不存在')
    }
    lab.labCode = payload.labCode
    lab.labName = payload.labName
    lab.researchDirection = payload.researchDirection
    lab.totalQuota = payload.totalQuota
    lab.openDayDate = payload.openDayDate || null
    lab.status = payload.status
    lab.remainQuota = Math.max(payload.totalQuota - lab.quotaUsed, 0)
    return
  }
  labs.push({
    id: Math.max(...labs.map((item) => item.id), 0) + 1,
    labCode: payload.labCode,
    labName: payload.labName,
    leaderName: null,
    mentorCount: 0,
    totalQuota: payload.totalQuota,
    quotaUsed: 0,
    remainQuota: payload.totalQuota,
    researchDirection: payload.researchDirection,
    openDayDate: payload.openDayDate || null,
    status: payload.status
  })
}

export async function mockDeleteLab(id: number): Promise<void> {
  await delay()
  const mentorCount = mentors.filter((item) => item.labId === id).length
  if (mentorCount > 0) {
    throw new MockError(400002, '该实训室下仍有导师，不能删除')
  }
  labs = labs.filter((item) => item.id !== id)
}

export async function mockAssignLeader(labId: number, mentorId: number): Promise<void> {
  await delay()
  const lab = labs.find((item) => item.id === labId)
  const mentor = mentors.find((item) => item.id === mentorId)
  if (!lab || !mentor) {
    throw new MockError(400002, '实训室或导师不存在')
  }
  if (mentor.labId !== labId) {
    throw new MockError(403001, '该导师不属于本实训室')
  }
  lab.leaderName = mentor.realName
}

export async function mockMentorList(labId?: number): Promise<MentorListItem[]> {
  await delay()
  const list = labId ? mentors.filter((item) => item.labId === labId) : mentors
  return deepCopy(list)
}

export async function mockAdjustMentorQuota(id: number, quota: number): Promise<void> {
  await delay()
  const mentor = mentors.find((item) => item.id === id)
  if (!mentor) {
    throw new MockError(404001, '导师不存在')
  }
  if (quota < mentor.quotaUsed) {
    throw new MockError(400002, `新名额不得小于已占用名额（${mentor.quotaUsed} 人）`)
  }
  mentor.quota = quota
  mentor.remainQuota = quota - mentor.quotaUsed
}

export async function mockUpdateMentorStatus(id: number, status: number): Promise<void> {
  await delay()
  const mentor = mentors.find((item) => item.id === id)
  if (!mentor) {
    throw new MockError(404001, '导师不存在')
  }
  mentor.status = status
  mentor.accountStatus = status
}

export async function mockRoundList(): Promise<RoundListItem[]> {
  await delay()
  return deepCopy(rounds)
}

export async function mockSaveRound(payload: RoundSaveReq, id?: number): Promise<void> {
  await delay()
  const weightSum =
    payload.weightAttitude + payload.weightLogic + payload.weightProgramming + payload.weightTime
  if (weightSum !== 100) {
    throw new MockError(400002, '四维权重合计必须为 100')
  }
  if (id) {
    const round = rounds.find((item) => item.id === id)
    if (!round) {
      throw new MockError(404001, '轮次不存在')
    }
    Object.assign(round, payload)
    return
  }
  rounds.push({
    id: Math.max(...rounds.map((item) => item.id), 0) + 1,
    ...payload,
    status: 1,
    statusText: roundStatusText[1],
    locked: 0
  })
}

export async function mockUpdateRoundStatus(id: number, status: number): Promise<void> {
  await delay()
  const round = rounds.find((item) => item.id === id)
  if (!round) {
    throw new MockError(404001, '轮次不存在')
  }
  round.status = status
  round.statusText = roundStatusText[status] ?? '未知'
}

export async function mockSetRoundLock(id: number, locked: number): Promise<void> {
  const round = rounds.find((item) => item.id === id)
  if (!round) {
    throw new MockError(404001, '轮次不存在')
  }
  round.locked = locked
}
