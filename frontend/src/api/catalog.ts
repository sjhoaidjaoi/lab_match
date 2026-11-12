import { http } from './request'
import type { BatchInfo, LabView } from '@/types'

export const catalogApi = {
  /** 当前活跃批次 + 八阶段时间窗 + 当前阶段 */
  currentBatch: () => http.get<BatchInfo>('/batches/current'),
  batches: () => http.get<unknown[]>('/batches'),
  /** 实训室列表（已过滤 INACTIVE） */
  labs: () => http.get<LabView[]>('/laboratories'),
  /** 实训室详情（附带宣讲视频 + 全景） */
  labDetail: (id: number) => http.get<LabView & { videos?: unknown[]; panoramas?: unknown[] }>(`/laboratories/${id}`),
  /** 本室报名学生（教师/组长/学院） */
  labPreferences: (labId: number) => http.get<unknown[]>(`/preferences/lab/${labId}`)
}
