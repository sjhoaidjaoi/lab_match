import { http } from './request'
import type {
  AnnouncementItem,
  CycleDetail,
  LabView,
  MentorView,
  OpenDayItem
} from '@/types'

export const catalogApi = {
  currentCycle: () => http.get<CycleDetail>('/cycles/current'),
  labs: () => http.get<LabView[]>('/labs'),
  labDetail: (id: number) => http.get<unknown>(`/labs/${id}`),
  mentors: (labId?: number) => http.get<MentorView[]>('/mentors', labId ? { labId } : undefined),
  announcements: (cycleId?: number) =>
    http.get<AnnouncementItem[]>('/announcements', cycleId ? { cycleId } : undefined),
  openDays: (cycleId?: number) =>
    http.get<OpenDayItem[]>('/open-day-plans', cycleId ? { cycleId } : undefined)
}
