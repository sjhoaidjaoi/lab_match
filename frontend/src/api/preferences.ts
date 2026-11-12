import { http } from './request'
import type { PreferenceItem } from '@/types'

export interface PreferenceSubmitPayload {
  laboratories: number[] // 最多 3 个，实训室 id
  obeyInternalAdjustment: boolean
  obeyCollegeAdjustment: boolean
}

export const preferencesApi = {
  /** 学生提交志愿（覆盖已提交） */
  submit: (payload: PreferenceSubmitPayload) => http.post<{ count: number }>('/preferences/submit', payload),
  /** 学生查看自己的志愿 */
  mine: () => http.get<PreferenceItem[]>('/preferences/my'),
  /** 实训室端查看本室报名 */
  lab: (labId: number) => http.get<unknown[]>(`/preferences/lab/${labId}`),
  /** 学院端：全院志愿总览 */
  overview: () => http.get<{ totalStudents: number; perLab: { laboratoryId: number; laboratoryName: string; quota: number; applicationCount: number }[] }>('/preferences/overview')
}
