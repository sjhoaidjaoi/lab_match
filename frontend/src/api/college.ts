import { http } from './request'
import type {
  AdmissionDetail, AdjustmentDetail, AnnouncementItem, BatchInfo, CandidateRow, CapacityRow, CollegeDashboard,
  FinalAdmissionDetail, FinalCheck, InterviewDetail, LabView, ObjectionItem, OpenDaySchedule, OperationLogItem, PreferenceDetail,
  PublicationInfo, StageInfo, UnplacedStudent, UserAccount, UserPayload
} from '@/types'

/** 学院总负责人端接口（新文档 4.5 节） */
export const collegeApi = {
  // ---- 全院数据总览 ----
  dashboard: () => http.get<CollegeDashboard>('/statistics/college'),
  capacity: () => http.get<CapacityRow[]>('/statistics/capacity'),
  unplaced: () => http.get<UnplacedStudent[]>('/statistics/unplaced'),
  candidates: () => http.get<CandidateRow[]>('/statistics/candidates'),

  // ---- 选拔批次与阶段 ----
  batches: () => http.get<BatchInfo[]>('/batches'),
  createBatch: (payload: { batchName: string; academicYear: string; description?: string }) =>
    http.post<BatchInfo>('/batches', payload),
  stages: (batchId: number) => http.get<StageInfo[]>(`/batches/${batchId}/stages`),
  updateStage: (batchId: number, stageId: number, payload: { startTime?: string; endTime?: string; stageStatus?: string }) =>
    http.put<StageInfo>(`/batches/${batchId}/stages/${stageId}`, payload),

  // ---- 学生 / 教师 / 组长 ----
  users: (params?: { role?: string; keyword?: string; laboratoryId?: number }) => http.get<UserAccount[]>('/users', params),
  importStudents: (students: Array<{ studentNumber: string; realName: string; phone?: string }>) =>
    http.post<{ created: number; skipped: Array<{ studentNumber: string; realName: string; reason: string }> }>('/users/import', { students }),
  staff: () => http.get<UserAccount[]>('/users/staff'),
  createUser: (payload: UserPayload) => http.post<UserAccount>('/users', payload),
  updateUser: (id: number, payload: UserPayload) => http.put<UserAccount>(`/users/${id}`, payload),
  resetPassword: (id: number, password: string) => http.post<null>(`/users/${id}/reset-password`, { password }),
  disableUser: (id: number) => http.delete<UserAccount>(`/users/${id}`),

  // ---- 实训室 ----
  labs: () => http.get<LabView[]>('/laboratories/all'),
  createLab: (payload: Partial<LabView>) => http.post<LabView>('/laboratories', payload),
  updateLab: (id: number, payload: Partial<LabView>) => http.put<LabView>(`/laboratories/${id}`, payload),

  // ---- 集中宣讲 / 开放日 ----
  announcements: () => http.get<AnnouncementItem[]>('/announcements/all'),
  createAnnouncement: (payload: { title: string; content?: string; status?: string }) =>
    http.post<AnnouncementItem>('/announcements', payload),
  updateAnnouncement: (id: number, payload: { title?: string; content?: string; status?: string }) =>
    http.put<AnnouncementItem>(`/announcements/${id}`, payload),
  deleteAnnouncement: (id: number) => http.delete<null>(`/announcements/${id}`),

  // ---- 开放日安排 ----
  openDays: (params?: { laboratoryId?: number }) => http.get<OpenDaySchedule[]>('/open-days', params),
  createOpenDay: (payload: Omit<OpenDaySchedule, 'id' | 'laboratoryName'>) =>
    http.post<OpenDaySchedule>('/open-days', payload),
  updateOpenDay: (id: number, payload: Omit<OpenDaySchedule, 'id' | 'laboratoryName'>) =>
    http.put<OpenDaySchedule>(`/open-days/${id}`, payload),
  deleteOpenDay: (id: number) => http.delete<{ deleted: number }>(`/open-days/${id}`),

  // ---- 志愿 / 面试 / 拟录取明细 ----
  preferences: () => http.get<PreferenceDetail[]>('/preferences/all'),
  interviews: () => http.get<InterviewDetail[]>('/interviews/all'),
  admissions: () => http.get<AdmissionDetail[]>('/admissions/all'),
  expireAdmissions: () => http.post<{ expired: number }>('/admissions/expire'),

  // ---- 全院调剂 ----
  adjustments: () => http.get<AdjustmentDetail[]>('/adjustments/list'),
  createCrossAdjustment: (payload: { studentId: number; sourceLaboratoryId?: number | null; targetLaboratoryId: number; reason?: string; priorityLevel?: number }) =>
    http.post<AdjustmentDetail>('/adjustments/cross', payload),
  createCrossBatch: (items: Array<{ studentId: number; targetLaboratoryId: number; reason?: string; priorityLevel?: number }>) =>
    http.post<{ created: number; failed: Array<{ studentId: number; targetLaboratoryId: number; reason: string }> }>('/adjustments/cross-batch', { items }),
  createPlacement: (payload: { studentId: number; sourceLaboratoryId?: number | null; targetLaboratoryId: number; reason?: string; priorityLevel?: number }) =>
    http.post<AdjustmentDetail>('/adjustments/placement', payload),
  reviewAdjustment: (id: number, status: string, reason?: string) =>
    http.put<AdjustmentDetail>(`/adjustments/${id}/status`, { status, reason }),

  // ---- 最终名单 / 公示 / 入组 ----
  finalList: () => http.get<{ batchId: number; batchName: string; perLab: Array<{ laboratoryId: number; laboratoryName: string; quota: number; students: FinalAdmissionDetail[] }> }>('/final/list'),
  mergeFinal: () => http.post<{ merged: number }>('/final/merge'),
  finalCheck: () => http.get<FinalCheck | null>('/final/check'),
  reviewFinal: (status: string, comment?: string) => http.post<FinalCheck['review']>('/final/review', { status, comment }),
  enrollAll: (force?: boolean) => http.post<{ enrolled: number }>('/final/enroll-all', { force: Boolean(force) }),
  objections: () => http.get<ObjectionItem[]>('/final/objections'),
  createObjection: (payload: { studentId: number; type: string; content: string }) =>
    http.post<ObjectionItem>('/final/objections', payload),
  handleObjection: (id: number, status: string, handlingNote?: string) =>
    http.put<ObjectionItem>(`/final/objections/${id}`, { status, handlingNote }),
  publish: (payload: { title: string; content?: string; startAt: string; endAt: string }) =>
    http.post<PublicationInfo>('/final/publicity', payload),
  publication: () => http.get<PublicationInfo | null>('/final/publication'),
  enroll: (id: number) => http.post<FinalAdmissionDetail>(`/final/${id}/enroll`),

  // ---- 操作日志 ----
  logs: (params?: { keyword?: string; operationType?: string }) => http.get<OperationLogItem[]>('/logs', params)
}
