import service, { http } from './request'

/** 实训室资料统一管理（学院端维护，组长端只读 + 宣传资料） */

export interface LabOverviewStats {
  labCount: number
  teacherCount: number
  totalQuota: number
  allocatedQuota: number
  unallocatedQuota: number
  enrolled: number
}

export interface LabSummaryRow {
  id: number
  labCode: string
  name: string
  displayName: string
  college: string
  location: string
  researchDirection: string
  projectDirection: string
  status: string
  leaderId: number | null
  leaderName: string | null
  teacherCount: number
  totalQuota: number
  allocatedQuota: number
  unallocatedQuota: number
  enrolled: number
  completeness: number
}

export interface LabOverview {
  academicYear: string
  academicYears: string[]
  stats: LabOverviewStats
  labs: LabSummaryRow[]
}

export interface LabTeacherItem {
  id: number
  laboratoryId: number
  userId: number | null
  accountName: string | null
  accountStatus: string | null
  name: string
  employeeNo: string
  gender: string
  title: string
  degree: string
  direction: string
  project: string
  intro: string
  email: string
  office: string
  photoUrl: string
  remark: string
  identity: 'LEADER' | 'TEACHER'
  status: string
  sortNo: number
  deletedAt?: string | null
  quota: number
  active: boolean
}

export interface LabQuotaSummary {
  academicYear: string
  batchId: number | null
  totalQuota: number
  allocatedQuota: number
  unallocatedQuota: number
  enrolled: number
  teacherCount: number
  academicYears?: string[]
  teachers?: Array<{
    id: number
    name: string
    employeeNo: string
    identity: string
    quota: number
    enrolled: number
    remaining: number
    active: boolean
  }>
  editable?: boolean
}

export type LabFileType = 'PPT' | 'PDF' | 'WORD' | 'VIDEO' | 'IMAGE'

export interface LabPromotionFile {
  id: string
  laboratoryId: number
  laboratoryName?: string
  fileName: string
  type: LabFileType
  mimeType: string
  size: number
  uploadedBy: number
  uploaderName: string
  createdAt: string
  url: string
  previewable: boolean
}

export interface LabProfileDetail {
  id: number
  labCode: string
  name: string
  displayName: string
  college: string
  location: string
  description: string
  detail: string
  researchDirection: string
  projectDirection: string
  technologyStack: string
  features: string
  achievements: string
  equipment: string
  contact: string
  remark: string
  status: string
  leaderId: number | null
  leaderName: string | null
  recruitmentQuota: number
  completeness: number
  academicYear: string
  academicYears: string[]
  teachers: LabTeacherItem[]
  quota: LabQuotaSummary
  files: LabPromotionFile[]
  permissions: { editable: boolean; fileEditable: boolean }
}

export type LabProfilePayload = Partial<Pick<LabProfileDetail,
  'labCode' | 'name' | 'college' | 'location' | 'description' | 'detail' |
  'researchDirection' | 'projectDirection' | 'technologyStack' | 'features' |
  'achievements' | 'equipment' | 'contact' | 'remark'> & { status?: string }>

export type LabTeacherPayload = Partial<Pick<LabTeacherItem,
  'name' | 'employeeNo' | 'gender' | 'title' | 'degree' | 'direction' | 'project' |
  'intro' | 'email' | 'office' | 'photoUrl' | 'remark' | 'identity' | 'sortNo' |
  'userId' | 'status'>>

/** 通过鉴权头下载二进制（下载 / 预览都需要 token，不能用普通链接） */
async function fetchBlob(url: string): Promise<Blob> {
  const response = await service.get(url, { responseType: 'blob' }) as unknown as { data: Blob }
  return response.data
}

export async function downloadLabFile(file: Pick<LabPromotionFile, 'id' | 'fileName'>): Promise<void> {
  const blob = await fetchBlob(`/lab-profiles/files/${file.id}/download`)
  const link = document.createElement('a')
  const href = URL.createObjectURL(blob)
  link.href = href
  link.download = file.fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(href), 2000)
}

export async function previewLabFile(file: Pick<LabPromotionFile, 'id'>): Promise<string> {
  const blob = await fetchBlob(`/lab-profiles/files/${file.id}/preview`)
  return URL.createObjectURL(blob)
}

export const labProfileApi = {
  overview: (academicYear?: string) =>
    http.get<LabOverview>('/lab-profiles/overview', academicYear ? { academicYear } : undefined),
  detail: (id: number, academicYear?: string) =>
    http.get<LabProfileDetail>(`/lab-profiles/labs/${id}`, academicYear ? { academicYear } : undefined),
  createLab: (payload: LabProfilePayload) => http.post<LabProfileDetail>('/lab-profiles/labs', payload),
  updateProfile: (id: number, payload: LabProfilePayload) =>
    http.put<LabProfileDetail>(`/lab-profiles/labs/${id}`, payload),
  teachers: (id: number, academicYear?: string) =>
    http.get<LabTeacherItem[]>(`/lab-profiles/labs/${id}/teachers`, academicYear ? { academicYear } : undefined),
  createTeacher: (id: number, payload: LabTeacherPayload) =>
    http.post<LabTeacherItem>(`/lab-profiles/labs/${id}/teachers`, payload),
  updateTeacher: (id: number, teacherId: number, payload: LabTeacherPayload) =>
    http.put<LabTeacherItem>(`/lab-profiles/labs/${id}/teachers/${teacherId}`, payload),
  removeTeacher: (id: number, teacherId: number) =>
    http.delete<{ id: number; retainedHistory: boolean }>(`/lab-profiles/labs/${id}/teachers/${teacherId}`),
  setLeader: (id: number, payload: { userId?: number | null; teacherId?: number | null }) =>
    http.put<{ leaderId: number | null; leaderName?: string }>(`/lab-profiles/labs/${id}/leader`, payload),
  quotas: (id: number, academicYear?: string) =>
    http.get<LabQuotaSummary>(`/lab-profiles/labs/${id}/quotas`, academicYear ? { academicYear } : undefined),
  updatePlan: (id: number, payload: { academicYear: string; totalQuota: number }) =>
    http.put<LabQuotaSummary>(`/lab-profiles/labs/${id}/plan`, payload),
  updateTeacherQuotas: (id: number, payload: { academicYear: string; items: Array<{ labTeacherId: number; quota: number }> }) =>
    http.put<LabQuotaSummary>(`/lab-profiles/labs/${id}/teacher-quotas`, payload),
  files: (id: number) => http.get<LabPromotionFile[]>(`/lab-profiles/labs/${id}/files`),
  allFiles: (params?: { laboratoryId?: number; keyword?: string }) =>
    http.get<LabPromotionFile[]>('/lab-profiles/files', params),
  upload: (id: number, file: File, onProgress?: (percent: number) => void) => {
    const data = new FormData()
    data.append('file', file)
    return http.post<LabPromotionFile>(`/lab-profiles/labs/${id}/files`, data, {
      timeout: 0,
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })
  },
  removeFile: (fileId: string) => http.delete<null>(`/lab-profiles/files/${fileId}`)
}
