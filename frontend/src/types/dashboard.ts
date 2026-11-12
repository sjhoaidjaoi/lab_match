export interface DashboardRound {
  roundNo: number
  roundName?: string
  status: number
  statusText: string
  countdownSeconds?: number
}

export interface DashboardTodo {
  type: string
  text: string
  count?: number
  target?: string
}

export interface DashboardIntentionItem {
  mentorId: number
  mentorName: string
  labName: string
}

export interface DashboardIntentionSummary {
  status: number
  items: DashboardIntentionItem[]
  acceptInnerAdjust: number
  acceptCrossAdjust: number
}

export interface StudentDashboard {
  round: DashboardRound | null
  todo: DashboardTodo[]
  intentionSummary: DashboardIntentionSummary | null
  unreadNoticeCount: number
}

export interface TeacherDashboard {
  round: DashboardRound
  quota: number
  quotaUsed: number
  remainQuota: number
  applicantCount: number
  applicantVisible: number
  pendingScoreCount: number
  pendingNomination: number
  pendingWaitlistAdjust: number
}

export interface LeaderDashboard {
  round: DashboardRound | null
  mentorCount: number
  totalQuota: number
  quotaUsed: number
  remainQuota: number
  applicantCount: number
  pendingScoreCount: number
  todo: DashboardTodo[]
}

export interface AdminDashboard {
  round: DashboardRound | null
  labCount: number
  mentorCount: number
  studentCount: number
  totalQuota: number
  quotaUsed: number
  remainQuota: number
  todo: DashboardTodo[]
}
