import { http } from './request'

export const scoreDimensions = [
  { key: 'attitudeScore', label: '学习态度' }, { key: 'logicScore', label: '逻辑思维' },
  { key: 'programmingScore', label: '编程基础' }, { key: 'timeCommitmentScore', label: '时间投入' },
  { key: 'comprehensiveScore', label: '综合表现' }
] as const
export type ScoreKey = typeof scoreDimensions[number]['key']
export const appointments: Record<string, string> = {
  UNSCHEDULED: '待安排', SCHEDULED: '已预约', WAITING: '等待开始', IN_PROGRESS: '进行中',
  COMPLETED: '已完成', CANCELLED: '已取消', MISSED: '未参加', UNHELD: '逾期未举行', RESCHEDULED: '已改期'
}
export type EvaluationSummary = { count: number; scoredCount: number; total: number | null; spread: number | null; review: boolean; aggregation: string }
export type Evaluation = {
  reviewerId: number; reviewerName?: string; version: number; state: 'DRAFT' | 'SUBMITTED'
  scores: Record<ScoreKey, number | null>; total: number | string | null; evaluation: string
  recommendation: 'INTENDED' | 'ALTERNATE' | 'REJECTED' | 'PENDING'; createdAt?: string
}
export type ScorePolicy = { batchId: number; weights: Record<ScoreKey, number>; aggregation: 'MEAN' | 'MEDIAN'; reviewThreshold: number | null }
export type ProgressRow = { laboratoryId: number; laboratoryName: string; applications: number; scheduled: number; completed: number;
  evaluated: number; pendingEvaluation: number; abnormal: number; intended: number; pendingLabReview: number; pendingAdjustment: number }
export const interviewSelection = {
  own: (id: number) => http.get<{ history: Evaluation[]; editable: boolean; policy: ScorePolicy; studentName: string; online: boolean }>(`/interviews/${id}/evaluation`),
  read: (id: number) => http.post<{ rows: Evaluation[]; summary: EvaluationSummary }>(`/interviews/${id}/evaluations/read`),
  acknowledge: (id: number) => http.post<{ acknowledgedAt: string }>(`/interviews/${id}/acknowledge`),
  exception: (id: number, code: string, reason: string) => http.post(`/interviews/${id}/exception`, { code, reason }),
  progress: () => http.get<{ batchId?: number; policy: ScorePolicy | null; perLab: ProgressRow[]; policyLocked: boolean }>('/interviews/selection-progress'),
  savePolicy: (policy: ScorePolicy) => http.post('/interviews/score-policy', policy)
}
