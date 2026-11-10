import { http } from './request'
import type { InterviewItem, AdmissionItem, AdjustmentItem } from '@/types'

export const interviewsApi = {
  /** 实训室面试列表（教师/组长/学院） */
  lab: (labId: number) => http.get<InterviewItem[]>(`/interviews/lab/${labId}`),
  /** 学生查看自己的面试 */
  mine: () => http.get<InterviewItem[]>('/interviews/my'),
  /** 学院总览 */
  overview: () => http.get<{ perLab: unknown[] }>('/interviews/overview')
}

export const admissionsApi = {
  /** 学生查看自己的拟录取意向 */
  mine: () => http.get<AdmissionItem[]>('/admissions/my'),
  /** 学生确认/放弃 */
  confirm: (id: number, confirmed: boolean) => http.post<AdmissionItem>(`/admissions/${id}/confirm`, { confirmed }),
  /** 实训室查看本室确认情况 */
  lab: (labId: number) => http.get<AdmissionItem[]>(`/admissions/lab/${labId}`),
  /** 学院汇总 */
  overview: () => http.get<{ perLab: unknown[] }>('/admissions/overview')
}

export const adjustmentsApi = {
  /** 学生查看自己的调剂情况 */
  mine: () => http.get<AdjustmentItem[]>('/adjustments/my'),
  /** 学生确认调剂 */
  confirm: (id: number, confirmed: boolean) => http.post<AdjustmentItem>(`/adjustments/${id}/confirm`, { confirmed }),
  /** 实训室查看本室调剂 */
  lab: (labId: number) => http.get<AdjustmentItem[]>(`/adjustments/lab/${labId}`),
  /** 学院总览 */
  overview: () => http.get<{ grouped: Record<string, number> }>('/adjustments/overview')
}
