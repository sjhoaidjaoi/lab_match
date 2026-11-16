import { http } from './request'
import type { LabTeacher } from './student'
import type { UserAccount } from '@/types'

/** 实训室教师 / 组长端共用接口 */
export interface LabStats {
  lab: { id: number; name: string; quota: number; projectDirection?: string; technologyStack?: string } | null
  quota: number
  applicationCount: number
  interviewed: number
  pendingInterview: number
  intended: number
  confirmed: number
  rejected: number
  admitted: number
  remaining: number
  adjustments: { internal: number; cross: number; confirmed: number }
  vacancyReport: { remaining: number; note: string; reportedAt: string } | null
}

export interface PreferenceRow {
  labTeacherId?: number
  labTeacherName?: string
  resume?: import('./recruitment').Resume | null
  interview?: { interviewStatus: string; recommendation?: string; evaluation?: string } | null
  id: number
  studentId: number
  studentName: string
  studentNumber: string
  laboratoryId: number
  laboratoryName: string
  obeyInternalAdjustment: boolean
  obeyCollegeAdjustment: boolean
  submittedAt: string
  status: string
}

export interface InterviewRow {
  location?: string
  interviewForm?: string
  instructions?: string
  durationMinutes?: number
  noticeStatus?: 'NOT_SENT' | 'SENT' | 'READ'
  id: number
  studentId: number
  studentName: string
  studentNumber: string
  laboratoryId: number
  interviewerId: number | null
  interviewerName: string
  interviewTime: string | null
  interviewStatus: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  attitudeScore: number | null
  logicScore: number | null
  programmingScore: number | null
  timeCommitmentScore: number | null
  comprehensiveScore: number | null
  evaluation: string
  recommendation: 'PENDING' | 'INTENDED' | 'ALTERNATE' | 'REJECTED'
}

export interface AdmissionRow {
  id: number
  studentId: number
  studentName: string
  studentNumber: string
  laboratoryId: number
  admissionType: 'INTENDED' | 'ALTERNATE'
  status: 'PENDING' | 'EXPIRED' | 'REJECTED' | 'CONFIRMED'
  confirmationDeadline?: string | null
  confirmedAt?: string | null
  createdAt?: string
  labTeacherName?: string
  autoConfirmed?: boolean
}

export interface InvitationCandidate {
  studentId: number
  studentName: string
  studentNumber: string
}

export interface TeacherInvitationProgress {
  candidates: InvitationCandidate[]
  invitations: AdmissionRow[]
  open: boolean
  mentorConfigured: boolean
  quota: number | null
  occupied: number
}

export interface TeacherGroupMember extends InvitationCandidate {
  joinedAt?: string | null
  source: 'INVITATION' | 'ADJUSTMENT'
}

export interface AdjustmentRow {
  id: number
  studentId: number
  studentName: string
  targetLaboratoryId: number
  targetLabName: string
  sourceLaboratoryId?: number | null
  adjustmentType: 'INTERNAL' | 'CROSS_LAB' | 'MANUAL_PLACEMENT'
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED'
  reason: string
  createdAt: string
}

export interface LabCandidate {
  studentId: number
  studentName: string
  studentNumber: string
  phone: string
  obeyInternalAdjustment: boolean
  obeyCollegeAdjustment: boolean
  interviewStatus: string | null
  attitudeScore: number | null
  logicScore: number | null
  programmingScore: number | null
  timeCommitmentScore: number | null
  comprehensiveScore: number | null
  recommendation: string | null
  evaluation: string
  admissionType: string | null
  admissionStatus: string | null
  adjustmentStatus: string | null
  placed: boolean
  eligible: boolean
}

export interface LabDetail {
  id: number
  name: string
  description: string
  projectDirection: string
  technologyStack: string
  recruitmentQuota: number
  leaderName: string | null
  leaderId?: number | null
  briefingText: string
  briefingVideoUrl: string | null
  briefingVideoType: string
  introductionVideo: string | null
  panoramicResource: string | null
  status: string
  vacancyReport?: { remaining: number; note: string; reportedAt: string } | null
}

export type LabProfile = Pick<LabDetail, 'name' | 'description' | 'projectDirection' | 'technologyStack' | 'recruitmentQuota' | 'status'>
export type TeacherAccountProfile = { employeeNumber: string; realName: string; phone: string; status: string }
export type MentorProfile = Pick<LabTeacher, 'name' | 'title' | 'direction' | 'intro' | 'status' | 'userId' | 'recruitmentQuota' | 'sortNo'>

export interface ScorePayload {
  attitudeScore: number
  logicScore: number
  programmingScore: number
  timeCommitmentScore: number
  comprehensiveScore: number
  evaluation: string
  recommendation: 'PENDING' | 'INTENDED' | 'ALTERNATE' | 'REJECTED'
}

export const labApi = {
  stats: (labId: number) => http.get<LabStats>(`/statistics/lab/${labId}`),
  candidates: (labId: number) => http.get<LabCandidate[]>(`/statistics/lab/${labId}/candidates`),
  detail: (labId: number) => http.get<LabDetail>(`/laboratories/${labId}`),
  updateProfile: (labId: number, profile: Partial<LabProfile>) =>
    http.put<LabProfile>(`/laboratories/${labId}`, profile),
  staff: (id: number) => http.get<UserAccount[]>(`/users/labs/${id}/staff`),
  createStaff: (id: number, profile: TeacherAccountProfile) => http.post(`/users/labs/${id}/staff`, profile),
  updateStaff: (id: number, userId: number, profile: TeacherAccountProfile) => http.put(`/users/labs/${id}/staff/${userId}`, profile),
  resetStaffPassword: (id: number, userId: number) => http.post(`/users/labs/${id}/staff/${userId}/reset-password`),
  setStaffStatus: (id: number, userId: number, status: 'ACTIVE' | 'INACTIVE') =>
    http.put<UserAccount>(`/users/labs/${id}/staff/${userId}/status`, { status }),
  deleteStaff: (id: number, userId: number) => http.delete<UserAccount>(`/users/labs/${id}/staff/${userId}`),
  mentors: (id: number) => http.get<LabTeacher[]>(`/laboratories/${id}/teachers/manage`),
  createMentor: (id: number, profile: MentorProfile) => http.post(`/laboratories/${id}/teachers`, profile),
  updateMentor: (id: number, mentorId: number, profile: MentorProfile) => http.put(`/laboratories/${id}/teachers/${mentorId}`, profile),
  removeMentor: (id: number, mentorId: number) => http.delete(`/laboratories/${id}/teachers/${mentorId}`),
  preferences: (labId: number) => http.get<PreferenceRow[]>(`/preferences/lab/${labId}`),
  interviews: (labId: number) => http.get<InterviewRow[]>(`/interviews/lab/${labId}`),
  scheduleInterview: (payload: { studentId: number; laboratoryId: number; interviewTime: string; interviewStatus: string; location?: string; interviewForm?: string; instructions?: string; durationMinutes?: number }) =>
    http.post<InterviewRow>('/interviews/schedule', payload),
  scoreInterview: (id: number, payload: ScorePayload) => http.post<InterviewRow>(`/interviews/${id}/score`, payload),
  admissions: (labId: number) => http.get<AdmissionRow[]>(`/admissions/lab/${labId}`),
  teacherInvitations: () => http.get<TeacherInvitationProgress>('/admissions/teacher-invitations'),
  sendTeacherInvitation: (studentId: number) => http.post<AdmissionRow>('/admissions/teacher-invitations', { studentId }),
  teacherMembers: () => http.get<TeacherGroupMember[]>('/admissions/teacher-members'),
  expireAdmissions: () => http.post<{ expired: number }>('/admissions/expire'),
  intend: (payload: {
    studentId: number
    laboratoryId: number
    admissionType: 'INTENDED' | 'ALTERNATE'
    confirmationDeadline?: string
  }) => http.post<AdmissionRow>('/admissions/intend', payload),
  adjustments: (labId: number) => http.get<AdjustmentRow[]>(`/adjustments/lab/${labId}`),
  internalAdjustment: (payload: {
    studentId: number
    sourceLaboratoryId: number
    targetLaboratoryId: number
    targetLabTeacherId?: number
    reason?: string
  }) => http.post<AdjustmentRow>('/adjustments/internal', payload),
  vacancyReport: (labId: number, payload: { remaining: number; note?: string }) =>
    http.post<{ remaining: number; note: string; reportedAt: string }>(`/laboratories/${labId}/vacancy-report`, payload),
  finalList: () => http.get<{ batchName: string; perLab: Array<{ laboratoryId: number; laboratoryName: string; quota: number; students: Array<{ id: number; studentId: number; studentName: string; studentNumber: string; finalStatus: string }> }> }>('/final/list'),
  enroll: (id: number) => http.post<null>(`/final/${id}/enroll`)
}
