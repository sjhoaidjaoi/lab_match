import type {
  AdminDashboard,
  DashboardRound,
  DashboardTodo,
  LeaderDashboard,
  StudentDashboard,
  TeacherDashboard
} from '@/types/dashboard'
import { mockLabList, mockMentorList } from './basic'
import { mockSessionList, mockStudentInterviews } from './interview'
import { mockConfirmCenter } from './nomination'
import { mockNoticeList } from './notice'
import { mockAdminDisputes, mockPublicityList } from './publicity'
import { mockAdminCandidates } from './reallocation'
import { mockCurrentRound, mockIntention } from './student'
import type { CurrentRound } from '@/types/student'

const MOCK_DELAY_MS = 200

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS)
  })
}

function parseDateTime(value: string): number {
  return new Date(value.replace(' ', 'T')).getTime()
}

/**
 * 盲选门禁：填报截止前导师与负责人不可见报名人数。
 */
function isBeforeApplyEnd(round: CurrentRound): boolean {
  return Date.now() < parseDateTime(round.applyEnd)
}

function toRoundBrief(round: CurrentRound, withName: boolean): DashboardRound {
  const brief: DashboardRound = {
    roundNo: round.roundNo,
    status: round.status,
    statusText: round.statusText,
    countdownSeconds: round.countdownSeconds
  }
  if (withName) {
    brief.roundName = round.roundName
  }
  return brief
}

/**
 * 学生工作台聚合数据。
 */
export async function mockStudentDashboard(): Promise<StudentDashboard> {
  await delay()
  const [round, intention, interviews, confirmCenter, notices] = await Promise.all([
    mockCurrentRound(),
    mockIntention(),
    mockStudentInterviews(),
    mockConfirmCenter(),
    mockNoticeList({})
  ])

  const todo: DashboardTodo[] = []
  if (!intention || intention.status !== 2) {
    todo.push({ type: 'INTENTION', text: '待填报意向', count: 1, target: '/student/intention' })
  }
  const pendingInterviewCount = interviews.filter((item) => item.status === 1).length
  if (pendingInterviewCount > 0) {
    todo.push({
      type: 'INTERVIEW',
      text: '待参加面试',
      count: pendingInterviewCount,
      target: '/student/interview'
    })
  }
  if (confirmCenter.total > 0) {
    todo.push({
      type: 'CONFIRM',
      text: '待确认录取',
      count: confirmCenter.total,
      target: '/student/confirm-center'
    })
  }

  return {
    round: toRoundBrief(round, true),
    todo,
    intentionSummary: intention
      ? {
          status: intention.status,
          items: intention.items.map((item) => ({
            mentorId: item.mentorId,
            mentorName: item.mentorName,
            labName: item.labName
          })),
          acceptInnerAdjust: intention.acceptInnerAdjust,
          acceptCrossAdjust: intention.acceptCrossAdjust
        }
      : null,
    unreadNoticeCount: notices.filter((item) => item.isRead === 0).length
  }
}

/**
 * 导师工作台聚合数据。
 */
export async function mockTeacherDashboard(): Promise<TeacherDashboard> {
  await delay()
  const [round, mentors] = await Promise.all([mockCurrentRound(), mockMentorList()])
  const profile = mentors.find((item) => item.userNo === '20010001') ?? mentors[0]
  const blind = isBeforeApplyEnd(round)
  return {
    round: toRoundBrief(round, false),
    quota: profile?.quota ?? 0,
    quotaUsed: profile?.quotaUsed ?? 0,
    remainQuota: profile?.remainQuota ?? 0,
    applicantCount: blind ? 0 : 12,
    applicantVisible: blind ? 0 : 1,
    pendingScoreCount: blind ? 0 : 5,
    pendingNomination: blind ? 0 : 1,
    pendingWaitlistAdjust: 0
  }
}

/**
 * 本室负责人工作台聚合数据。
 */
export async function mockLeaderDashboard(): Promise<LeaderDashboard> {
  await delay()
  const [round, mentors, sessions] = await Promise.all([
    mockCurrentRound(),
    mockMentorList(1),
    mockSessionList()
  ])
  const blind = isBeforeApplyEnd(round)
  const totalQuota = mentors.reduce((sum, item) => sum + item.quota, 0)
  const quotaUsed = mentors.reduce((sum, item) => sum + item.quotaUsed, 0)
  const pendingScoreCount = blind ? 0 : 18

  const todo: DashboardTodo[] = []
  if (!blind && !sessions.some((item) => item.status === 2)) {
    todo.push({ type: 'SCHEDULE', text: '待发布面试排期' })
  }
  if (pendingScoreCount > 0) {
    todo.push({ type: 'SCORE', text: `待录分 ${pendingScoreCount} 人` })
  }

  return {
    round: toRoundBrief(round, false),
    mentorCount: mentors.length,
    totalQuota,
    quotaUsed,
    remainQuota: totalQuota - quotaUsed,
    applicantCount: blind ? 0 : 56,
    pendingScoreCount,
    todo
  }
}

/**
 * 管理员全院工作台聚合数据。
 */
export async function mockAdminDashboard(): Promise<AdminDashboard> {
  await delay()
  const [round, labs, mentors, disputes, publicities, candidates] = await Promise.all([
    mockCurrentRound(),
    mockLabList(),
    mockMentorList(),
    mockAdminDisputes(),
    mockPublicityList(),
    mockAdminCandidates(1)
  ])

  const totalQuota = labs.reduce((sum, item) => sum + item.totalQuota, 0)
  const quotaUsed = labs.reduce((sum, item) => sum + item.quotaUsed, 0)
  const pendingDisputeCount = disputes.filter(
    (item) => item.status === 1 || item.status === 2
  ).length
  const pendingPublicityCount = publicities.filter((item) => item.status === 1).length

  const todo: DashboardTodo[] = []
  if (pendingDisputeCount > 0) {
    todo.push({
      type: 'DISPUTE',
      text: '待处理异议',
      count: pendingDisputeCount,
      target: '/admin/disputes'
    })
  }
  if (pendingPublicityCount > 0) {
    todo.push({
      type: 'PUBLICITY',
      text: '待结束/确认公示',
      count: pendingPublicityCount,
      target: '/admin/publicity'
    })
  }
  if (candidates.length > 0) {
    todo.push({
      type: 'REALLOCATION',
      text: '待处理调剂',
      count: candidates.length,
      target: '/admin/reallocation'
    })
  }

  return {
    round: toRoundBrief(round, true),
    labCount: labs.length,
    mentorCount: mentors.length,
    studentCount: 120,
    totalQuota,
    quotaUsed,
    remainQuota: totalQuota - quotaUsed,
    todo
  }
}
