import { get, post } from './request'
import type { TeacherApplicantPage, TeacherStudentArchive } from '@/types/teacher'
import type { SupplementDirectAdmitReq, SupplementDirectAdmitResp } from '@/types/reallocation'

/**
 * 报名本人意向的学生列表。
 */
export function listApplicants(params: {
  interviewStatus?: number
  scoreStatus?: number
  keyword?: string
  pageNum?: number
  pageSize?: number
}): Promise<TeacherApplicantPage> {
  return get<TeacherApplicantPage>('/teacher/applicants', { params })
}

/**
 * 补录直接录入。
 */
export function directAdmit(
  payload: SupplementDirectAdmitReq
): Promise<SupplementDirectAdmitResp> {
  return post<SupplementDirectAdmitResp>('/teacher/supplement/direct-admit', payload)
}

/**
 * 导师查看本人意向学生档案。
 */
export function getStudentArchive(studentId: number): Promise<TeacherStudentArchive | null> {
  return get<TeacherStudentArchive | null>(`/teacher/students/${studentId}/archive`)
}
