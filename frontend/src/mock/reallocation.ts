import { MockError } from './auth'
import type {
  AdminReallocationReq,
  AdminReallocationResp,
  LeaderReallocationReq,
  LeaderReallocationResp,
  ReallocationCandidate,
  ReallocationFailItem,
  ReallocationMentor,
  ReallocationPool,
  ReallocationPoolItem,
  TakeReallocationResp
} from '@/types/reallocation'

const MOCK_DELAY_MS = 250
export const ROUND_ID = 2

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS)
  })
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

let leaderMentors: ReallocationMentor[] = [
  { mentorId: 12, mentorName: '王建国', labId: 1, labName: '人工智能实训室', remainQuota: 2 },
  { mentorId: 13, mentorName: '陈晓', labId: 1, labName: '人工智能实训室', remainQuota: 2 }
]

let allMentors: ReallocationMentor[] = [
  ...leaderMentors,
  { mentorId: 21, mentorName: '赵明', labId: 2, labName: '智能制造实训室', remainQuota: 2 },
  { mentorId: 22, mentorName: '孙倩', labId: 2, labName: '智能制造实训室', remainQuota: 1 }
]

let leaderCandidates: ReallocationCandidate[] = [
  {
    studentId: 1003,
    studentNo: '2022****03',
    studentName: '刘*婷',
    originLabId: 1,
    originLabName: '人工智能实训室',
    acceptInnerAdjust: 1,
    acceptCrossAdjust: 1,
    totalScore: 74.25,
    availableMentors: []
  },
  {
    studentId: 1004,
    studentNo: '2022****04',
    studentName: '王*磊',
    originLabId: 1,
    originLabName: '人工智能实训室',
    acceptInnerAdjust: 1,
    acceptCrossAdjust: 1,
    totalScore: 72.5,
    availableMentors: []
  },
  {
    studentId: 1005,
    studentNo: '2022****05',
    studentName: '赵*敏',
    originLabId: 1,
    originLabName: '人工智能实训室',
    acceptInnerAdjust: 1,
    acceptCrossAdjust: 1,
    totalScore: 68,
    availableMentors: []
  }
]

let crossCandidates: ReallocationCandidate[] = [
  {
    studentId: 1005,
    studentNo: '2022****05',
    studentName: '赵*敏',
    originLabId: 1,
    originLabName: '人工智能实训室',
    acceptInnerAdjust: 1,
    acceptCrossAdjust: 1,
    totalScore: 68,
    availableMentors: []
  },
  {
    studentId: 1008,
    studentNo: '2022****08',
    studentName: '孙*浩',
    originLabId: 2,
    originLabName: '智能制造实训室',
    acceptInnerAdjust: 0,
    acceptCrossAdjust: 1,
    totalScore: 66.5,
    availableMentors: []
  }
]

let talkCandidates: ReallocationCandidate[] = [
  {
    studentId: 1009,
    studentNo: '2022****09',
    studentName: '李*娜',
    originLabId: 2,
    originLabName: '智能制造实训室',
    acceptInnerAdjust: 0,
    acceptCrossAdjust: 0,
    totalScore: 63,
    availableMentors: []
  }
]

let poolRemainQuota = 2

let poolItems: ReallocationPoolItem[] = [
  {
    studentId: 1003,
    studentNo: '2022****03',
    studentName: '刘*婷',
    college: '计算机学院',
    major: '软件工程',
    grade: '2022',
    statementSummary: '我选择这个方向的原因是希望把课堂上的算法知识落到真实项目中，愿意长期投入实验室工作……',
    hasFullArchive: 1,
    programmingLanguages: ['Java', 'Python'],
    weeklyHours: 12,
    taken: 0,
    takenLabName: null
  },
  {
    studentId: 1004,
    studentNo: '2022****04',
    studentName: '王*磊',
    college: '计算机学院',
    major: '人工智能',
    grade: '2022',
    statementSummary: '我对多模态方向有持续兴趣，参与过校级创新项目，具备数据处理与模型训练基础……',
    hasFullArchive: 0,
    programmingLanguages: ['C++', 'Python'],
    weeklyHours: 10,
    taken: 0,
    takenLabName: null
  },
  {
    studentId: 1008,
    studentNo: '2022****08',
    studentName: '孙*浩',
    college: '机械工程学院',
    major: '自动化',
    grade: '2022',
    statementSummary: '希望在工业机器人方向深入学习，能保证每周稳定投入并参与线下调试……',
    hasFullArchive: 1,
    programmingLanguages: ['C++'],
    weeklyHours: 14,
    taken: 1,
    takenLabName: '智能制造实训室'
  }
]

function mentorsWithQuota(source: ReallocationMentor[]): ReallocationMentor[] {
  return deepCopy(source.filter((mentor) => mentor.remainQuota > 0))
}

function candidateList(level: number): ReallocationCandidate[] {
  if (level === 1) {
    return leaderCandidates
  }
  return level === 2 ? crossCandidates : talkCandidates
}

function decorate(candidate: ReallocationCandidate, level: number): ReallocationCandidate {
  return {
    ...deepCopy(candidate),
    availableMentors: mentorsWithQuota(level === 1 ? leaderMentors : allMentors)
  }
}

function markTaken(studentId: number, labName: string) {
  const poolItem = poolItems.find((item) => item.studentId === studentId)
  if (poolItem) {
    poolItem.taken = 1
    poolItem.takenLabName = labName
  }
}

export async function mockLeaderMentors(): Promise<ReallocationMentor[]> {
  await delay()
  return deepCopy(leaderMentors)
}

export async function mockLeaderCandidates(): Promise<ReallocationCandidate[]> {
  await delay()
  return leaderCandidates.map((item) => decorate(item, 1))
}

export async function mockLeaderReallocate(
  req: LeaderReallocationReq
): Promise<LeaderReallocationResp> {
  await delay()
  const candidate = leaderCandidates.find((item) => item.studentId === req.studentId)
  if (!candidate) {
    throw new MockError(400005, '学生本轮已有录取记录')
  }
  const mentor = leaderMentors.find((item) => item.mentorId === req.toMentorId)
  if (!mentor || mentor.remainQuota <= 0) {
    throw new MockError(400002, '目标导师剩余名额不足')
  }
  mentor.remainQuota -= 1
  leaderCandidates = leaderCandidates.filter((item) => item.studentId !== req.studentId)
  markTaken(req.studentId, mentor.labName)
  return { reallocationId: Date.now(), admissionId: Date.now() + 1 }
}

export async function mockReallocationPool(): Promise<ReallocationPool> {
  await delay()
  return {
    total: poolItems.length,
    pageNum: 1,
    pageSize: 10,
    myRemainQuota: poolRemainQuota,
    list: deepCopy(poolItems)
  }
}

export async function mockTakeStudent(studentId: number): Promise<TakeReallocationResp> {
  await delay()
  const item = poolItems.find((row) => row.studentId === studentId)
  if (!item) {
    throw new MockError(404001, '学生不存在')
  }
  if (item.taken === 1) {
    throw new MockError(409001, `该生已被${item.takenLabName ?? '其他实训室'}录入`)
  }
  if (poolRemainQuota <= 0) {
    throw new MockError(400002, '个人剩余名额不足')
  }
  poolRemainQuota -= 1
  item.taken = 1
  item.takenLabName = '人工智能实训室'
  return { admissionId: Date.now(), mentorId: 11 }
}

export async function mockAdminCandidates(level: number): Promise<ReallocationCandidate[]> {
  await delay()
  return candidateList(level).map((item) => decorate(item, level))
}

export async function mockAdminReallocate(req: AdminReallocationReq): Promise<AdminReallocationResp> {
  await delay()
  if (req.level === 3 && !req.reason?.trim()) {
    throw new MockError(400001, '座谈安置必须填写说明')
  }
  const list = candidateList(req.level)
  const failList: ReallocationFailItem[] = []
  let successCount = 0
  for (const item of req.items) {
    const candidate = list.find((row) => row.studentId === item.studentId)
    const mentor = allMentors.find((row) => row.mentorId === item.toMentorId)
    if (!candidate) {
      failList.push({
        studentId: item.studentId,
        studentName: '未知学生',
        reason: '学生本轮已有录取记录'
      })
      continue
    }
    if (!mentor || mentor.remainQuota <= 0) {
      failList.push({
        studentId: item.studentId,
        studentName: candidate.studentName,
        reason: '目标导师剩余名额不足'
      })
      continue
    }
    mentor.remainQuota -= 1
    successCount += 1
    const index = list.findIndex((row) => row.studentId === item.studentId)
    list.splice(index, 1)
    markTaken(item.studentId, mentor.labName)
  }
  return { successCount, failCount: failList.length, failList }
}
