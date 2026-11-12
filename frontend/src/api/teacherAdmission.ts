import { get, post } from './request'
import type { TeacherAdmissionSummary } from '@/types/admission'

/** 我的录取名单 */
export function getMyAdmissions(roundId?: number): Promise<TeacherAdmissionSummary> {
  return get<TeacherAdmissionSummary>('/teacher/admissions', {
    params: roundId ? { roundId } : undefined
  })
}

/** 发送确认提醒 */
export function remindAdmission(id: number): Promise<void> {
  return post<void>(`/teacher/admissions/${id}/remind`)
}
