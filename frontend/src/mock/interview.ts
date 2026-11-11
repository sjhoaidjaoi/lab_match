import { MockError } from './auth'
import { mockMentorList } from './basic'
import type {
  InterviewSchedule,
  InterviewScoreResp,
  InterviewScoreRow,
  InterviewScoreSaveReq,
  InterviewSession,
  InterviewSessionSaveReq,
  PublishScheduleResp,
  StudentInterview
} from '@/types/interview'

const MOCK_DELAY_MS = 250

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS)
  })
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

let sessions: InterviewSession[] = [
  {
    id: 701,
    roundId: 1,
    sessionName: '第一场',
    interviewDate: '2026-11-10',
    startTime: '14:00',
    endTime: '15:30',
    location: '实验楼 A301',
    capacity: 30,
    scheduledCount: 3,
    status: 1,
    statusText: '草稿',
    interviewerIds: [11, 12],
    interviewerNames: ['李海峰', '王建国']
  },
  {
    id: 702,
    roundId: 1,
    sessionName: '第二场',
    interviewDate: '2026-11-10',
    startTime: '15:30',
    endTime: '17:00',
    location: '实验楼 A302',
    capacity: 30,
    scheduledCount: 2,
    status: 1,
    statusText: '草稿',
    interviewerIds: [11, 13],
    interviewerNames: ['李海峰', '陈晓']
  }
]

let schedules: InterviewSchedule[] = [
  {
    id: 801,
    roundId: 1,
    labId: 1,
    labName: '人工智能实训室',
    studentId: 1001,
    studentNo: '20220001',
    studentName: '陈爱丽',
    sessionId: 701,
    sessionName: '第一场',
    interviewDate: '2026-11-10',
    startTime: '14:00',
    endTime: '15:30',
    status: 1,
    statusText: '待面试'
  },
  {
    id: 802,
    roundId: 1,
    labId: 1,
    labName: '人工智能实训室',
    studentId: 1002,
    studentNo: '20220002',
    studentName: '张强',
    sessionId: 701,
    sessionName: '第一场',
    interviewDate: '2026-11-10',
    startTime: '14:00',
    endTime: '15:30',
    status: 1,
    statusText: '待面试'
  },
  {
    id: 803,
    roundId: 1,
    labId: 1,
    labName: '人工智能实训室',
    studentId: 1003,
    studentNo: '20220003',
    studentName: '刘婷',
    sessionId: 702,
    sessionName: '第二场',
    interviewDate: '2026-11-10',
    startTime: '15:30',
    endTime: '17:00',
    status: 1,
    statusText: '待面试'
  },
  {
    id: 804,
    roundId: 1,
    labId: 1,
    labName: '人工智能实训室',
    studentId: 1004,
    studentNo: '20220004',
    studentName: '王磊',
    sessionId: 702,
    sessionName: '第二场',
    interviewDate: '2026-11-10',
    startTime: '15:30',
    endTime: '17:00',
    status: 1,
    statusText: '待面试'
  },
  {
    id: 805,
    roundId: 1,
    labId: 1,
    labName: '人工智能实训室',
    studentId: 1005,
    studentNo: '20220005',
    studentName: '赵敏',
    sessionId: 701,
    sessionName: '第一场',
    interviewDate: '2026-11-10',
    startTime: '14:00',
    endTime: '15:30',
    status: 1,
    statusText: '待面试'
  }
]

let scores: InterviewScoreRow[] = [
  {
    id: 1001,
    studentId: 1001,
    studentNo: '20220001',
    studentName: '陈爱丽',
    sessionName: '第一场',
    attitudeScore: 90,
    logicScore: 85,
    programmingScore: 88,
    timeScore: 80,
    systemTotal: 85.75,
    manualTotal: null,
    finalTotal: 85.75,
    status: 2,
    statusText: '已提交'
  },
  {
    id: 1002,
    studentId: 1002,
    studentNo: '20220002',
    studentName: '张强',
    sessionName: '第一场',
    attitudeScore: 80,
    logicScore: 82,
    programmingScore: 78,
    timeScore: 85,
    systemTotal: 81.25,
    manualTotal: null,
    finalTotal: 81.25,
    status: 1,
    statusText: '草稿'
  },
  {
    id: 1003,
    studentId: 1003,
    studentNo: '20220003',
    studentName: '刘婷',
    sessionName: '第二场',
    attitudeScore: 70,
    logicScore: 75,
    programmingScore: 72,
    timeScore: 80,
    systemTotal: 74.25,
    manualTotal: null,
    finalTotal: 74.25,
    status: 2,
    statusText: '已提交'
  },
  {
    id: 1004,
    studentId: 1004,
    studentNo: '20220004',
    studentName: '王磊',
    sessionName: '第二场',
    attitudeScore: 0,
    logicScore: 0,
    programmingScore: 0,
    timeScore: 0,
    systemTotal: 0,
    manualTotal: null,
    finalTotal: 0,
    status: 0,
    statusText: '未录分'
  },
  {
    id: 1005,
    studentId: 1005,
    studentNo: '20220005',
    studentName: '赵敏',
    sessionName: '第一场',
    attitudeScore: 0,
    logicScore: 0,
    programmingScore: 0,
    timeScore: 0,
    systemTotal: 0,
    manualTotal: null,
    finalTotal: 0,
    status: 0,
    statusText: '未录分'
  }
]

const sessionStatusText: Record<number, string> = {
  1: '草稿',
  2: '已发布',
  3: '已结束'
}

export async function mockSessionList(): Promise<InterviewSession[]> {
  await delay()
  return deepCopy(sessions)
}

export async function mockSaveSession(
  req: InterviewSessionSaveReq,
  id?: number
): Promise<void> {
  await delay()
  if (req.startTime >= req.endTime) {
    throw new MockError(400002, '面试结束时间必须晚于开始时间')
  }
  const mentors = await mockMentorList()
  const interviewerNames = req.interviewerIds
    .map((mentorId) => mentors.find((mentor) => mentor.id === mentorId)?.realName)
    .filter((name): name is string => Boolean(name))
  if (id) {
    const session = sessions.find((item) => item.id === id)
    if (!session) {
      throw new MockError(404001, '场次不存在')
    }
    if (session.status !== 1) {
      throw new MockError(400005, '已发布场次不可修改')
    }
    Object.assign(session, {
      sessionName: req.sessionName,
      interviewDate: req.interviewDate,
      startTime: req.startTime,
      endTime: req.endTime,
      location: req.location,
      capacity: req.capacity,
      interviewerIds: req.interviewerIds,
      interviewerNames
    })
    return
  }
  sessions.push({
    id: Math.max(...sessions.map((item) => item.id), 700) + 1,
    roundId: req.roundId,
    sessionName: req.sessionName,
    interviewDate: req.interviewDate,
    startTime: req.startTime,
    endTime: req.endTime,
    location: req.location,
    capacity: req.capacity,
    scheduledCount: 0,
    status: 1,
    statusText: sessionStatusText[1],
    interviewerIds: req.interviewerIds,
    interviewerNames
  })
}

export async function mockDeleteSession(id: number): Promise<void> {
  await delay()
  const session = sessions.find((item) => item.id === id)
  if (!session) {
    throw new MockError(404001, '场次不存在')
  }
  if (session.status !== 1) {
    throw new MockError(400005, '已发布场次不可删除')
  }
  sessions = sessions.filter((item) => item.id !== id)
  schedules = schedules.filter((item) => item.sessionId !== id)
}

export async function mockPublishSessions(): Promise<PublishScheduleResp> {
  await delay()
  const published = sessions.filter((item) => item.status === 1)
  if (published.length === 0) {
    throw new MockError(400005, '没有可发布的场次')
  }
  for (const session of published) {
    const count = schedules.filter((item) => item.sessionId === session.id).length
    if (count > session.capacity) {
      throw new MockError(400002, `${session.sessionName} 超出容量`)
    }
    session.status = 2
    session.statusText = sessionStatusText[2]
  }
  const studentCount = new Set(schedules.map((item) => item.studentId)).size
  return { sessionCount: published.length, studentCount, noticeCount: studentCount }
}

export async function mockScheduleList(): Promise<InterviewSchedule[]> {
  await delay()
  return deepCopy(schedules)
}

export async function mockAutoSchedule(): Promise<number> {
  await delay()
  if (sessions.length === 0) {
    throw new MockError(400002, '请先创建面试场次')
  }
  const scheduledStudentIds = new Set(schedules.map((item) => item.studentId))
  const pending = scores.filter((item) => !scheduledStudentIds.has(item.studentId))
  let index = 0
  for (const student of pending) {
    const session = sessions[index % sessions.length]
    session.scheduledCount += 1
    schedules.push({
      id: Math.max(...schedules.map((item) => item.id), 800) + 1,
      roundId: session.roundId,
      labId: 1,
      labName: '人工智能实训室',
      studentId: student.studentId,
      studentNo: student.studentNo,
      studentName: student.studentName,
      sessionId: session.id,
      sessionName: session.sessionName,
      interviewDate: session.interviewDate,
      startTime: session.startTime,
      endTime: session.endTime,
      status: 1,
      statusText: '待面试'
    })
    index += 1
  }
  return pending.length
}

export async function mockScoreList(keyword = '', status?: number): Promise<InterviewScoreRow[]> {
  await delay()
  const text = keyword.trim()
  return deepCopy(
    scores.filter((item) => {
      const matchKeyword =
        !text || item.studentNo.includes(text) || item.studentName.includes(text)
      const matchStatus = status === undefined || item.status === status
      return matchKeyword && matchStatus
    })
  )
}

export async function mockSaveScore(req: InterviewScoreSaveReq): Promise<InterviewScoreResp> {
  await delay()
  const values = [req.attitudeScore, req.logicScore, req.programmingScore, req.timeScore]
  if (values.some((value) => value < 0 || value > 100)) {
    throw new MockError(400001, '分数必须在 0-100 之间')
  }
  if (req.manualTotal !== null && !req.adjustReason.trim()) {
    throw new MockError(400001, '手动调整总分时必须填写理由')
  }
  const systemTotal = round2(values.reduce((sum, value) => sum + value, 0) / 4)
  const finalTotal = req.manualTotal ?? systemTotal
  const status = req.submit === 1 ? 2 : 1
  const score = scores.find((item) => item.studentId === req.studentId)
  if (!score) {
    throw new MockError(403001, '该学生未在本室面试')
  }
  score.attitudeScore = req.attitudeScore
  score.logicScore = req.logicScore
  score.programmingScore = req.programmingScore
  score.timeScore = req.timeScore
  score.systemTotal = systemTotal
  score.manualTotal = req.manualTotal
  score.finalTotal = finalTotal
  score.status = status
  score.statusText = status === 2 ? '已提交' : '草稿'
  return {
    id: score.id ?? 0,
    systemTotal,
    manualTotal: req.manualTotal,
    finalTotal,
    status
  }
}

export async function mockStudentInterviews(): Promise<StudentInterview[]> {
  await delay()
  const mySchedules = schedules.filter((item) => item.studentId === 1001)
  return mySchedules.map((schedule) => {
    const session = sessions.find((item) => item.id === schedule.sessionId)
    return {
      id: schedule.id,
      roundNo: 1,
      labId: 1,
      labName: '人工智能实训室',
      sessionName: schedule.sessionName,
      interviewDate: schedule.interviewDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      location: session?.location ?? '实验楼 A301',
      interviewers: session?.interviewerNames ?? [],
      note: '请提前 10 分钟到场',
      status: schedule.status,
      statusText: schedule.statusText
    }
  })
}
