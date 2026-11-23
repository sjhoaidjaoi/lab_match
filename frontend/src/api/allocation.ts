import { http } from './request'

/** 导师级名额 */
export interface TeacherQuota {
  id: number
  name: string
  identity?: string
  /** null 表示未单独设限 */
  quota: number | null
  admitted: number
  remaining: number | null
}

/** 实训室名额与剩余 */
export interface LabSurplus {
  id: number
  labCode: string
  name: string
  college: string
  location: string
  researchDirection: string
  academicYear: string
  plan: number
  admitted: number
  pending: number
  remaining: number
  teachers: TeacherQuota[]
}

export interface SurplusTotals {
  plan: number
  admitted: number
  pending: number
  remaining: number
}

export interface SurplusView {
  batchId: number | null
  batchName?: string
  academicYear?: string
  labs: LabSurplus[]
  totals: SurplusTotals
  round?: RoundView
}

export interface RoundItem {
  round: number
  label: string
  status: 'OPEN' | 'CLOSED'
  openedAt: string | null
  closedAt: string | null
}

export interface RoundView {
  current: number
  max: number
  open: number | null
  canClose: boolean
  supplementActive: boolean
  canOpenNext: boolean
  rounds: RoundItem[]
}

export interface PoolRow {
  studentId: number
  studentName: string
  studentNumber: string
  priority: 1 | 2 | 3
  priorityLabel: string
  obeyInternalAdjustment: boolean
  obeyCollegeAdjustment: boolean
  preferredLabs: Array<{ laboratoryId: number; laboratoryName: string }>
  pendingProposal: boolean
  eligibleLaboratoryIds: number[]
  suggestedLaboratoryId: number | null
  suggestedLaboratoryName: string
  suggestedLabTeacherId: number | null
  reason: string
}

export interface PoolView {
  blocker?: string
  rows: PoolRow[]
  summary: { pending: number; internal: number; cross: number; placement: number; remaining: number }
  surplus?: { labs: LabSurplus[]; totals: SurplusTotals } | null
}

export interface SupplementChoice {
  id: number
  round: number
  laboratoryId: number
  laboratoryName: string
  labTeacherId: number | null
  status: string
  submittedAt: string
}

export interface MySupplementView {
  round: RoundView | null
  placed: boolean
  placedLaboratoryName: string
  labs: Array<Pick<LabSurplus, 'id' | 'name' | 'labCode' | 'college' | 'researchDirection' | 'plan' | 'remaining'> & {
    teachers: TeacherQuota[]
  }>
  choices: SupplementChoice[]
}

export const allocationApi = {
  // 各实训室剩余名额（学院 / 组长 / 学生均可读）
  surplus: () => http.get<SurplusView>('/allocation/surplus'),

  // 轮次
  rounds: () => http.get<RoundView>('/allocation/rounds'),
  openRound: (round?: number) => http.post<RoundView>('/allocation/rounds/open', round ? { round } : {}),
  closeRound: (round: number) => http.post<RoundView>(`/allocation/rounds/${round}/close`, {}),

  // 全院调剂池
  pool: () => http.get<PoolView>('/allocation/pool'),
  respondToProposal: (id: number, accept: boolean) => http.post('/allocation/proposals/' + id + '/respond', { accept }),
  confirmPool: (payload: {
    discussion?: boolean
    studentId: number
    targetLaboratoryId: number
    targetLabTeacherId?: number | null
    reason?: string
  }) => http.post<{ adjustment: unknown; synced: number }>('/allocation/pool/confirm', payload),

  // 学生端补录志愿
  mySupplement: () => http.get<MySupplementView>('/allocation/my-supplement'),
  submitSupplement: (payload: {
    choices: Array<{ laboratoryId: number; labTeacherId: number }>
    obeyInternalAdjustment: boolean
    obeyCollegeAdjustment: boolean
  }) => http.post<{ round: number; count: number }>('/allocation/supplement', payload)
}
