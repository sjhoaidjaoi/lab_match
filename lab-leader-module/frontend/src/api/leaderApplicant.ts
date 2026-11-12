import { get } from './request'
import type { LeaderApplicantPage } from '@/types/leader'
import type { TeacherStudentArchive } from '@/types/teacher'

/**
 * 本室全量报名学生与志愿情况。
 */
export function listLeaderApplicants(params: {
  roundId?: number
  keyword?: string
  pageNum?: number
  pageSize?: number
}): Promise<LeaderApplicantPage> {
  return get<LeaderApplicantPage>('/leader/applicants', { params })
}

/**
 * 本室报名学生档案。
 */
export function getLeaderStudentArchive(
  studentId: number,
  roundId?: number
): Promise<TeacherStudentArchive | null> {
  return get<TeacherStudentArchive | null>(`/leader/students/${studentId}/archive`, {
    params: roundId ? { roundId } : undefined
  })
}
